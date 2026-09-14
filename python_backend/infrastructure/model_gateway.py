"""Provider-neutral model selection, compatibility and retry boundary."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import os
import re
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncIterator, Awaitable, Callable, Iterator

import httpx
from dotenv import dotenv_values

from ..domain.model_cache import model_prefix_fingerprint
from ..domain.model_governance import Candidate, HealthState, Price, request_fingerprint, select_candidate, usage_cost
from ..domain.research_budget import BudgetLedger
from ..domain.research_budget import current as current_budget
from .model_adapter import ModelGatewayError, OpenAICompatibleAdapter, validate_base_url
from .model_pricing import PricingRegistry

PURPOSES = {"input", "vision", "researcher", "writer", "evidenceVerifier", "auditor", "criticalReviewer", "judge"}
CURRENT_JOB: ContextVar[str | None] = ContextVar("model_gateway_job", default=None)
Recorder = Callable[[dict[str, Any]], Awaitable[None]]
log = logging.getLogger("zhiheng.model")


def _valid_prompt_context(purpose: str, value: object) -> bool:
    if value is None:
        return True
    if not isinstance(value, dict):
        return False
    allowed = {
        "promptId", "purpose", "promptVersion", "manifestFingerprint", "contextVersion", "requiredComplete",
        "messageCount", "serializedCharacters", "evidenceBlocks", "materialCount", "calculationCount",
    }
    if set(value) - allowed or value.get("purpose") != purpose:
        return False
    if not isinstance(value.get("promptId"), str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", value["promptId"]):
        return False
    if not isinstance(value.get("manifestFingerprint"), str) or not re.fullmatch(r"[0-9a-f]{64}", value["manifestFingerprint"]):
        return False
    if not isinstance(value.get("promptVersion"), int) or isinstance(value["promptVersion"], bool) or value["promptVersion"] < 1:
        return False
    context_version = value.get("contextVersion")
    if context_version is not None and (
        not isinstance(context_version, int) or isinstance(context_version, bool) or context_version < 1
    ):
        return False
    if value.get("requiredComplete") is not None and not isinstance(value["requiredComplete"], bool):
        return False
    numeric = {"messageCount", "serializedCharacters", "evidenceBlocks", "materialCount", "calculationCount"}
    return all(
        key not in value or isinstance(value[key], int) and not isinstance(value[key], bool) and value[key] >= 0
        for key in numeric
    )


class ModelConfigurationError(RuntimeError):
    pass


class ModelGateway:
    """Single model boundary with immutable configuration snapshots per process."""

    def __init__(
        self,
        root: Path,
        env: dict[str, str] | None = None,
        *,
        config_file: str = "./config/models.local.json",
        pricing_file: str = "",
        idle_timeout_ms: int = 300_000,
        timeout_ms: int = 1_800_000,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.root = root
        if env is None:
            file_env = {
                key: value
                for key, value in dotenv_values(root / ".env").items()
                if isinstance(key, str) and isinstance(value, str)
            }
            self.env = {**file_env, **os.environ}
        else:
            self.env = dict(env)
        self.config_file = config_file
        price_path = Path(pricing_file) if pricing_file else None
        if price_path is not None and not price_path.is_absolute():
            price_path = (root / price_path).resolve()
        self.pricing = PricingRegistry(price_path)
        self.timeout_ms = timeout_ms
        self.idle_timeout_ms = idle_timeout_ms
        self.adapter = OpenAICompatibleAdapter(transport=transport)
        self.health: dict[str, HealthState] = {}
        self._config: dict[str, Any] | None = None
        self._fingerprint: str | None = None
        self.recorder: Recorder | None = None
        self._budgets: dict[str, BudgetLedger] = {}

    def set_recorder(self, recorder: Recorder | None) -> None:
        self.recorder = recorder

    def attach_budget(self, job: dict[str, Any], persist: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        if job.get("budgetState") is not None:
            self._budgets[job["id"]] = BudgetLedger(job, persist)

    def detach_budget(self, job_id: str) -> None:
        self._budgets.pop(job_id, None)

    def _active_budget(self) -> BudgetLedger | None:
        active = current_budget()
        if active is not None:
            return active
        job_id = CURRENT_JOB.get()
        return self._budgets.get(job_id) if job_id else None

    def _reserved_cost(self, key: str, model: dict[str, Any], max_tokens: int) -> dict[str, Any] | None:
        context = model.get("contextWindow")
        if not isinstance(context, int) or isinstance(context, bool) or context <= 0:
            return None
        price = self.pricing.resolve(key, self._connection_identity(model), datetime.now(timezone.utc))
        if price.input_per_million is None or price.output_per_million is None:
            return None
        amount = (context * price.input_per_million + max_tokens * price.output_per_million) / 1_000_000
        return {"currency": price.currency, "estimatedCost": amount}

    async def _begin_model_budget(self, purpose: str, max_tokens: int) -> tuple[BudgetLedger | None, str | None]:
        ledger = self._active_budget()
        if ledger is None:
            return None, None
        key, model, _secret = self._select(purpose)
        token = await ledger.begin("model", 1, purpose={"evidenceVerifier": "evidence-verifier", "criticalReviewer": "critical-review"}.get(purpose, purpose), reserved_cost=self._reserved_cost(key, model, max_tokens))
        return ledger, token

    async def _finish_model_budget(self, ledger: BudgetLedger | None, token: str | None, cost: dict[str, Any] | None) -> None:
        if ledger is not None and token is not None:
            await ledger.finish(token, cost=cost)

    @contextmanager
    def job_scope(self, job_id: str) -> Iterator[None]:
        token = CURRENT_JOB.set(job_id)
        try:
            yield
        finally:
            CURRENT_JOB.reset(token)

    async def _record(
        self,
        *,
        purpose: str,
        key: str,
        model: dict[str, Any],
        messages: list[dict[str, Any]],
        status: str,
        usage: dict[str, Any] | None = None,
        error: str | None = None,
        transport_attempts: int = 1,
        prompt_context: dict[str, Any] | None = None,
    ) -> None:
        if not self.recorder:
            return
        finished = datetime.now(timezone.utc)
        price = self.pricing.resolve(key, self._connection_identity(model), finished)
        if price.input_per_million is None and self.pricing.path is None:
            price = Price(model.get("inputPricePerMillion"), model.get("outputPricePerMillion"), str(model.get("currency", "USD")))
        normalized_usage = usage or {"inputTokens": None, "outputTokens": None, "totalTokens": None, "cachedInputTokens": None}
        telemetry_purpose = {"evidenceVerifier": "evidence-verifier", "criticalReviewer": "critical-review"}.get(purpose, purpose)
        telemetry_profile = f"configured-{key}"
        cache = model_prefix_fingerprint(
            {
                "purpose": telemetry_purpose,
                "messages": messages,
                "reasoningEffort": model.get("reasoningEffort"),
                "tools": None,
                "responseFormat": None,
            },
            {"id": telemetry_profile, "model": model["model"], "protocol": "openai-chat-completions"},
            self._connection_identity(model),
        )
        record = {
                "schemaVersion": 1,
                "id": str(uuid.uuid4()),
                "jobId": CURRENT_JOB.get(),
                "purpose": telemetry_purpose,
                "profile": telemetry_profile,
                "model": model["model"],
                "requestFingerprint": request_fingerprint(purpose, messages, "1"),
                "status": status,
                "transportAttempts": transport_attempts,
                "errorCategory": error,
                "usage": {**normalized_usage, **usage_cost(normalized_usage, price)},
                "tokenSources": {
                    name: "provider" if isinstance(normalized_usage.get(name), int) and not isinstance(normalized_usage.get(name), bool) else "unknown"
                    for name in ("inputTokens", "outputTokens", "totalTokens", "cachedInputTokens")
                },
                "cache": cache,
                **({"promptContext": dict(prompt_context)} if prompt_context else {}),
                "finishedAt": finished.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            }
        try:
            await self.recorder(record)
        except Exception:
            log.warning("model_telemetry_write_failed", extra={"job_id": CURRENT_JOB.get(), "phase": purpose})

    def _load(self) -> dict[str, Any]:
        if self._config is not None:
            return self._config
        path = Path(self.config_file)
        path = path if path.is_absolute() else (self.root / path).resolve()
        try:
            raw = path.read_bytes()
            data = json.loads(raw)
            if set(data) != {"schemaVersion", "models", "pipeline"} or data["schemaVersion"] != 2:
                raise ValueError
            if not isinstance(data["models"], dict) or not data["models"] or not isinstance(data["pipeline"], dict):
                raise ValueError
            if set(data["pipeline"]) != PURPOSES or not 1 <= len(data["models"]) <= 32:
                raise ValueError
            for key, model in data["models"].items():
                if not isinstance(key, str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,51}", key) or not isinstance(model, dict):
                    raise ValueError
                allowed = {
                    "model", "baseUrl", "apiKeyEnv", "enabled", "quality", "priority", "reasoningEffort",
                    "contextWindow", "inputPricePerMillion", "outputPricePerMillion", "currency",
                }
                if (
                    bool(set(model) - allowed)
                    or
                    not isinstance(model.get("model"), str)
                    or not model["model"].strip()
                    or not isinstance(model.get("apiKeyEnv"), str)
                    or not re.fullmatch(r"[A-Z][A-Z0-9_]*", model["apiKeyEnv"])
                    or model["apiKeyEnv"].startswith("VITE_")
                ):
                    raise ValueError
                if model.get("enabled", True) not in {True, False}:
                    raise ValueError
                quality = model.get("quality", 0)
                priority = model.get("priority", 0)
                context_window = model.get("contextWindow")
                if not isinstance(quality, (int, float)) or isinstance(quality, bool) or not math.isfinite(quality):
                    raise ValueError
                if not isinstance(priority, int) or isinstance(priority, bool) or priority < 0:
                    raise ValueError
                if context_window is not None and (not isinstance(context_window, int) or isinstance(context_window, bool) or context_window <= 0):
                    raise ValueError
                for price_key in ("inputPricePerMillion", "outputPricePerMillion"):
                    price = model.get(price_key)
                    if price is not None and (not isinstance(price, (int, float)) or isinstance(price, bool) or not math.isfinite(price) or price < 0):
                        raise ValueError
                if "currency" in model and (not isinstance(model["currency"], str) or not re.fullmatch(r"[A-Z]{3}", model["currency"])):
                    raise ValueError
                model["baseUrl"] = validate_base_url(str(model.get("baseUrl", "")))
            used: set[str] = set()
            for stage, value in data["pipeline"].items():
                keys = value if isinstance(value, list) else [value]
                if (
                    not isinstance(keys, list)
                    or len(keys) > (1 if stage in {"input", "vision"} else 8)
                    or (stage not in {"criticalReviewer", "judge"} and not keys)
                    or len(keys) != len(set(keys))
                    or any(not isinstance(key, str) or key not in data["models"] for key in keys)
                ):
                    raise ValueError
                used.update(keys)
            if used != set(data["models"]):
                raise ValueError
            self._fingerprint = hashlib.sha256(raw).hexdigest()
        except Exception as error:
            raise ModelConfigurationError("请检查模型配置文件与所引用的密钥") from error
        self._config = data
        return data

    def _keys(self, purpose: str) -> list[str]:
        if purpose not in PURPOSES:
            raise ModelConfigurationError("模型环节无效")
        value = self._load()["pipeline"].get(purpose)
        keys = value if isinstance(value, list) else [value]
        return [key for key in keys if isinstance(key, str)]

    @staticmethod
    def _connection_identity(model: dict[str, Any]) -> str:
        value = json.dumps(["openai-chat-completions", model["baseUrl"], model["model"]], separators=(",", ":"))
        return hashlib.sha256(value.encode()).hexdigest()

    @staticmethod
    def _legacy_connection_identity(model: dict[str, Any]) -> str:
        return hashlib.sha256(model["baseUrl"].encode()).hexdigest()

    def _select(self, purpose: str, excluded: set[str] | None = None) -> tuple[str, dict[str, Any], str]:
        config = self._load()
        keys = self._keys(purpose)
        omitted = excluded or set()
        candidates = [
            Candidate(
                key=key,
                purposes=frozenset({purpose}),
                quality=float(config["models"][key].get("quality", 0)),
                priority=int(config["models"][key].get("priority", index)),
                enabled=(
                    config["models"][key].get("enabled", True) is True
                    and bool(self.env.get(str(config["models"][key]["apiKeyEnv"])))
                ),
            )
            for index, key in enumerate(keys)
            if key not in omitted
        ]
        try:
            selected = select_candidate(purpose, candidates, self.health)
        except ValueError as error:
            raise ModelConfigurationError(str(error)) from error
        model = config["models"][selected.key]
        secret = self.env.get(model["apiKeyEnv"], "")
        if not secret:
            raise ModelConfigurationError("请检查模型配置文件与所引用的密钥")
        return selected.key, model, secret

    def status(self) -> dict[str, Any]:
        try:
            config = self._load()
            assigned_purposes = [purpose for purpose in PURPOSES if self._keys(purpose)]
            configured = bool(assigned_purposes) and all(
                any(
                    config["models"][key].get("enabled", True) is True
                    and bool(self.env.get(str(config["models"][key]["apiKeyEnv"])))
                    for key in self._keys(purpose)
                )
                for purpose in assigned_purposes
            )
            return {
                "configured": configured,
                "configurationError": False,
                "model": None,
                "pricingConfigured": self.pricing.path is not None and self.pricing.error is None,
                "pricingConfigurationError": self.pricing.error is not None,
            }
        except ModelConfigurationError:
            return {
                "configured": False,
                "configurationError": True,
                "model": None,
                "pricingConfigured": self.pricing.path is not None and self.pricing.error is None,
                "pricingConfigurationError": self.pricing.error is not None,
            }

    def public_selection(self) -> dict[str, Any]:
        try:
            config = self._load()

            def label(stage: str) -> str | None:
                keys = self._keys(stage)
                return config["models"][keys[0]]["model"] if keys else None

            return {
                "mode": "configured",
                "analysisModel": label("researcher"),
                "visionModel": label("vision"),
                "candidatesEnabled": any(len(self._keys(purpose)) > 1 for purpose in PURPOSES),
            }
        except ModelConfigurationError:
            return {"mode": "unavailable", "analysisModel": None, "visionModel": None, "candidatesEnabled": False}

    def stage_enabled(self, purpose: str) -> bool:
        """Return whether a purpose has at least one credential-ready assignment."""
        try:
            config = self._load()
            return any(
                config["models"][key].get("enabled", True) is True
                and bool(self.env.get(str(config["models"][key]["apiKeyEnv"])))
                for key in self._keys(purpose)
            )
        except ModelConfigurationError:
            return False

    def stage_identity(self, purpose: str) -> dict[str, Any]:
        """Expose a secret-free immutable identity for durable exceptional calls."""
        state = self.pinned_state()
        return {
            "version": state["version"],
            "configurationFingerprint": state["configurationFingerprint"],
            "purpose": purpose,
            "assignments": state["assignments"].get(purpose, []),
        }

    def _state(self, version: int) -> dict[str, Any]:
        config = self._load()
        assignments = {}
        for purpose in PURPOSES:
            assignments[purpose] = [
                {
                    "key": f"configured-{key}" if version == 2 else key,
                    "model": config["models"][key]["model"],
                    "connectionIdentity": (
                        self._connection_identity(config["models"][key])
                        if version == 2
                        else self._legacy_connection_identity(config["models"][key])
                    ),
                }
                for key in self._keys(purpose)
            ]
        return {"version": version, "configurationFingerprint": self._fingerprint, "assignments": assignments}

    def pinned_state(self) -> dict[str, Any]:
        return self._state(2)

    def assert_compatible(self, state: object) -> None:
        compatible = isinstance(state, dict) and (state == self.pinned_state() or state == self._state(1))
        if not compatible:
            raise ModelConfigurationError("任务固定的模型配置已变化，不能静默续跑")

    def optional_profile(self, purpose: str) -> dict[str, Any]:
        if purpose not in {"criticalReviewer", "judge"}:
            raise ModelConfigurationError("不是独立复核环节")
        key, model, _secret = self._select(purpose)
        return {"configurationFingerprint": self._fingerprint,
                "assignment": {"key": f"configured-{key}", "model": model["model"], "connectionIdentity": self._connection_identity(model)}}

    async def complete(self, purpose: str, messages: list[dict[str, Any]], *, stream: bool = False, max_tokens: int = 8000,
                       pinned_profile: dict | None = None, prompt_context: dict[str, Any] | None = None) -> str | AsyncIterator[str]:
        independent = purpose in {"criticalReviewer", "judge"}
        if independent and (stream or pinned_profile is None or pinned_profile != self.optional_profile(purpose)):
            raise ModelConfigurationError("独立复核须固定模型且禁止流式重放")
        if not messages or not all(isinstance(item, dict) and item.get("role") in {"system", "user", "assistant", "tool"} for item in messages):
            raise ModelGatewayError("malformed_response")
        if not isinstance(max_tokens, int) or not 1 <= max_tokens <= 128_000:
            raise ModelGatewayError("malformed_response")
        if not _valid_prompt_context(purpose, prompt_context):
            raise ModelGatewayError("malformed_response")
        timeout = self.timeout_ms / 1000
        idle_timeout = min(timeout, self.idle_timeout_ms / 1000)
        if stream:
            return self._stream_with_failover(purpose, messages, max_tokens, timeout, idle_timeout, prompt_context)
        budget, budget_token = await self._begin_model_budget(purpose, max_tokens)
        excluded: set[str] = set()
        last_error: ModelGatewayError | None = None
        deadline = asyncio.get_running_loop().time() + timeout
        candidate_count = len(self._keys(purpose))
        if candidate_count == 0:
            raise ModelConfigurationError(f"模型环节 {purpose} 没有已配置候选")
        while len(excluded) < candidate_count:
            key, model, secret = self._select(purpose, excluded)
            payload = {"model": model["model"], "messages": messages, "stream": False, "max_tokens": max_tokens}
            for attempt in range(1 if independent else 3):
                try:
                    remaining = deadline - asyncio.get_running_loop().time()
                    if remaining <= 0:
                        raise ModelGatewayError("timeout")
                    try:
                        result = await asyncio.wait_for(
                            self.adapter.complete(base_url=model["baseUrl"], secret=secret, payload=payload, timeout_seconds=idle_timeout),
                            timeout=remaining,
                        )
                    except TimeoutError as error:
                        raise ModelGatewayError("timeout") from error
                    self.health.setdefault(key, HealthState()).success()
                    await self._record(
                        purpose=purpose,
                        key=key,
                        model=model,
                        messages=messages,
                        status="succeeded",
                        usage=result.usage,
                        transport_attempts=attempt + 1,
                        prompt_context=prompt_context,
                    )
                    charged = usage_cost(result.usage, self.pricing.resolve(key, self._connection_identity(model), datetime.now(timezone.utc)))
                    cost = None if charged["cost"] is None else {"currency": charged["currency"], "estimatedCost": charged["cost"]}
                    await self._finish_model_budget(budget, budget_token, cost)
                    return result.content
                except ModelGatewayError as error:
                    last_error = error
                    self.health.setdefault(key, HealthState()).failure()
                    if independent or not error.retryable or attempt == 2:
                        await self._record(
                            purpose=purpose,
                            key=key,
                            model=model,
                            messages=messages,
                            status="failed",
                            error=error.category,
                            transport_attempts=attempt + 1,
                            prompt_context=prompt_context,
                        )
                        if independent:
                            await self._finish_model_budget(budget, budget_token, None)
                            raise
                        break
                    retry_window = deadline - asyncio.get_running_loop().time()
                    if retry_window <= 0:
                        last_error = ModelGatewayError("timeout")
                        break
                    await asyncio.sleep(min(2**attempt, retry_window))
            excluded.add(key)
        assert last_error is not None
        await self._finish_model_budget(budget, budget_token, None)
        raise last_error

    async def _stream_with_failover(
        self,
        purpose: str,
        messages: list[dict[str, Any]],
        max_tokens: int,
        timeout: float,
        idle_timeout: float,
        prompt_context: dict[str, Any] | None,
    ) -> AsyncIterator[str]:
        excluded: set[str] = set()
        last_error: ModelGatewayError | None = None
        deadline = asyncio.get_running_loop().time() + timeout
        candidate_count = len(self._keys(purpose))
        if candidate_count == 0:
            raise ModelConfigurationError(f"模型环节 {purpose} 没有已配置候选")
        budget, budget_token = await self._begin_model_budget(purpose, max_tokens)
        while len(excluded) < candidate_count:
            key, model, secret = self._select(purpose, excluded)
            payload = {"model": model["model"], "messages": messages, "stream": True, "max_tokens": max_tokens}
            for attempt in range(3):
                emitted = False
                stream_usage: dict[str, int | None] | None = None

                def capture_usage(value: dict[str, int | None]) -> None:
                    nonlocal stream_usage
                    stream_usage = value

                try:
                    remaining = deadline - asyncio.get_running_loop().time()
                    if remaining <= 0:
                        raise ModelGatewayError("timeout")
                    try:
                        async with asyncio.timeout(remaining):
                            async for delta in self.adapter.stream(
                                base_url=model["baseUrl"],
                                secret=secret,
                                payload=payload,
                                timeout_seconds=idle_timeout,
                                on_usage=capture_usage,
                            ):
                                emitted = True
                                yield delta
                    except TimeoutError as error:
                        raise ModelGatewayError("timeout") from error
                    self.health.setdefault(key, HealthState()).success()
                    await self._record(
                        purpose=purpose,
                        key=key,
                        model=model,
                        messages=messages,
                        status="succeeded",
                        usage=stream_usage,
                        transport_attempts=attempt + 1,
                        prompt_context=prompt_context,
                    )
                    charged = usage_cost(stream_usage or {}, self.pricing.resolve(key, self._connection_identity(model), datetime.now(timezone.utc)))
                    cost = None if charged["cost"] is None else {"currency": charged["currency"], "estimatedCost": charged["cost"]}
                    await self._finish_model_budget(budget, budget_token, cost)
                    return
                except ModelGatewayError as error:
                    last_error = error
                    self.health.setdefault(key, HealthState()).failure()
                    if emitted or not error.retryable or attempt == 2:
                        await self._record(
                            purpose=purpose,
                            key=key,
                            model=model,
                            messages=messages,
                            status="failed",
                            error=error.category,
                            transport_attempts=attempt + 1,
                            prompt_context=prompt_context,
                        )
                        if emitted:
                            await self._finish_model_budget(budget, budget_token, None)
                            raise
                        break
                    retry_window = deadline - asyncio.get_running_loop().time()
                    if retry_window <= 0:
                        last_error = ModelGatewayError("timeout")
                        break
                    await asyncio.sleep(min(2**attempt, retry_window))
            excluded.add(key)
        assert last_error is not None
        await self._finish_model_budget(budget, budget_token, None)
        raise last_error


__all__ = ["ModelConfigurationError", "ModelGateway", "ModelGatewayError"]
