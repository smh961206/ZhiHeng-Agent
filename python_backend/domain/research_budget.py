"""Durable per-research resource accounting with fail-closed enforcement."""
from __future__ import annotations

import asyncio
import json
import math
import re
import uuid
from contextvars import ContextVar, Token
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable

KINDS = {"model", "toolRound", "webRequest", "visionPage"}
PURPOSES = {"input", "vision", "researcher", "writer", "evidence-verifier", "auditor", "critical-review", "judge"}


class ResearchBudgetError(RuntimeError):
    pass


ACTIVE_BUDGET: ContextVar[BudgetLedger | None] = ContextVar("research_budget", default=None)


def _time(value: object) -> datetime:
    if not isinstance(value, str):
        raise ResearchBudgetError("研究预算时间无效")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ResearchBudgetError("研究预算时间无效") from error
    if parsed.tzinfo is None:
        raise ResearchBudgetError("研究预算时间须包含时区")
    return parsed.astimezone(timezone.utc)


def _money(value: object, *, limit: bool = False) -> dict[str, Any] | None:
    if value is None:
        return None
    keys = {"currency", "amount" if limit else "estimatedCost"}
    if not isinstance(value, dict) or set(value) != keys:
        raise ResearchBudgetError("研究预算费用格式无效")
    currency, amount = value.get("currency"), value.get("amount" if limit else "estimatedCost")
    if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
        raise ResearchBudgetError("研究预算币种无效")
    if not isinstance(amount, (int, float)) or isinstance(amount, bool) or not math.isfinite(amount) or amount < 0:
        raise ResearchBudgetError("研究预算金额无效")
    return {"currency": currency, "amount" if limit else "estimatedCost": float(amount)}


def validate_limits(value: object) -> dict[str, Any]:
    keys = {"version", "maxModelCost", "maxToolRounds", "maxWebRequests", "maxVisionPages", "maxDurationMs"}
    if not isinstance(value, dict) or set(value) != keys or value.get("version") != 1:
        raise ResearchBudgetError("研究预算配置无效")
    result = deepcopy(value)
    result["maxModelCost"] = _money(value["maxModelCost"], limit=True)
    for key in ("maxToolRounds", "maxWebRequests", "maxVisionPages", "maxDurationMs"):
        item = value[key]
        if item is not None and (not isinstance(item, int) or isinstance(item, bool) or item < 0):
            raise ResearchBudgetError("研究预算限制须为非负整数或空值")
    return result


def create_state(limits: object, *, started_at: str, mode: str) -> dict[str, Any]:
    if mode not in {"dry-run", "enforce"}:
        raise ResearchBudgetError("研究预算模式无效")
    _time(started_at)
    return {"version": 1, "limits": validate_limits(limits), "mode": mode, "startedAt": started_at, "receipts": [], "decisions": []}


def load_configuration(path: Path | None, mode: str) -> dict[str, Any] | None:
    if path is None or mode == "disabled":
        return None
    try:
        raw = path.read_bytes()
        if len(raw) > 16_000:
            raise ResearchBudgetError("研究预算配置过大")
        return {"limits": validate_limits(json.loads(raw)), "mode": mode}
    except (OSError, json.JSONDecodeError) as error:
        raise ResearchBudgetError("无法读取研究预算配置") from error


def validate_state(value: object) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != {"version", "limits", "mode", "startedAt", "receipts", "decisions"}:
        raise ResearchBudgetError("研究预算状态无效")
    state = create_state(value["limits"], started_at=value["startedAt"], mode=value["mode"])
    receipts, decisions = value["receipts"], value["decisions"]
    if not isinstance(receipts, list) or len(receipts) > 20_000 or not isinstance(decisions, list) or len(decisions) > 20_000:
        raise ResearchBudgetError("研究预算记录无效")
    ids: set[str] = set()
    for row in receipts:
        expected = {"id", "kind", "units", "purpose", "status", "createdAt", "completedAt", "cost", "reservedCost"}
        if not isinstance(row, dict) or set(row) != expected or not isinstance(row.get("id"), str) or not re.fullmatch(r"[A-Za-z0-9._:-]{1,160}", row["id"]):
            raise ResearchBudgetError("研究预算凭证无效")
        if row["id"] in ids or row.get("kind") not in KINDS or not isinstance(row.get("units"), int) or isinstance(row.get("units"), bool) or row["units"] < 0:
            raise ResearchBudgetError("研究预算凭证重复或计量无效")
        ids.add(row["id"])
        if row.get("purpose") is not None and row["purpose"] not in PURPOSES or row.get("status") not in {"reserved", "completed"}:
            raise ResearchBudgetError("研究预算凭证用途或状态无效")
        created = _time(row["createdAt"])
        completed = _time(row["completedAt"]) if row["completedAt"] is not None else None
        if created < _time(state["startedAt"]) or (row["status"] == "completed") != (completed is not None) or completed is not None and completed < created:
            raise ResearchBudgetError("研究预算凭证时间无效")
        row_cost, reserved = _money(row["cost"]), _money(row["reservedCost"])
        if row["kind"] != "model" and (row_cost is not None or reserved is not None):
            raise ResearchBudgetError("非模型资源不能记录模型费用")
    for row in decisions:
        if not isinstance(row, dict) or set(row) != {"id", "at", "reason", "action"} or not isinstance(row["id"], str):
            raise ResearchBudgetError("研究预算决策无效")
        _time(row["at"])
        if row["reason"] not in {"model_cost", "tool_rounds", "web_requests", "vision_pages", "duration", "unknown_cost"} or row["action"] not in {"would-stop", "stop"}:
            raise ResearchBudgetError("研究预算决策无效")
    state["receipts"], state["decisions"] = deepcopy(receipts), deepcopy(decisions)
    return state


def summary(value: object, *, at: str) -> dict[str, Any]:
    state = validate_state(value)
    current = _time(at)
    counts = {kind: sum(row["units"] for row in state["receipts"] if row["kind"] == kind) for kind in sorted(KINDS)}
    model = [row for row in state["receipts"] if row["kind"] == "model"]
    totals: dict[str, float] = {}
    for row in model:
        if row["cost"] is not None:
            totals[row["cost"]["currency"]] = totals.get(row["cost"]["currency"], 0.0) + row["cost"]["estimatedCost"]
    return {
        "version": 1,
        "mode": state["mode"],
        "limits": state["limits"],
        "counts": counts,
        "billing": [{"currency": key, "knownEstimatedCost": totals[key]} for key in sorted(totals)],
        "unknownModelCalls": sum(row["cost"] is None for row in model),
        "pending": sum(row["status"] == "reserved" for row in state["receipts"]),
        "elapsedMs": max(0, int((current - _time(state["startedAt"])).total_seconds() * 1000)),
        "decisions": deepcopy(state["decisions"]),
        "completeCost": bool(model) and all(row["cost"] is not None for row in model) and len(totals) == 1,
    }


def limit_reason(value: object, *, kind: str, units: int, reserved_cost: dict[str, Any] | None, at: str) -> str | None:
    state, view = validate_state(value), summary(value, at=at)
    limits = state["limits"]
    if limits["maxDurationMs"] is not None and view["elapsedMs"] >= limits["maxDurationMs"]:
        return "duration"
    dimensions = {"toolRound": ("maxToolRounds", "tool_rounds"), "webRequest": ("maxWebRequests", "web_requests"), "visionPage": ("maxVisionPages", "vision_pages")}
    if kind in dimensions:
        key, reason = dimensions[kind]
        if limits[key] is not None and view["counts"][kind] + units > limits[key]:
            return reason
    maximum = limits["maxModelCost"]
    if kind == "model" and maximum is not None:
        reservation = _money(reserved_cost)
        if reservation is None or reservation["currency"] != maximum["currency"]:
            return "unknown_cost"
        rows = [row["reservedCost"] if row["status"] == "reserved" else row["cost"] for row in state["receipts"] if row["kind"] == "model"]
        if any(row is None or row["currency"] != maximum["currency"] for row in rows):
            return "unknown_cost"
        if sum(row["estimatedCost"] for row in rows) + reservation["estimatedCost"] > maximum["amount"]:
            return "model_cost"
    return None


def assert_recoverable(job: dict[str, Any]) -> None:
    if "budgetState" not in job:
        return
    state = validate_state(job["budgetState"])
    if any(row["status"] == "reserved" for row in state["receipts"]):
        raise ResearchBudgetError("上次资源执行结果未确认，不能自动重复消耗预算")


class BudgetLedger:
    def __init__(self, job: dict[str, Any], persist: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        self.job, self.persist, self.lock = job, persist, asyncio.Lock()
        assert_recoverable(job)

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    async def begin(self, kind: str, units: int, *, purpose: str | None = None, reserved_cost: dict[str, Any] | None = None) -> str:
        async with self.lock:
            if kind not in KINDS or not isinstance(units, int) or isinstance(units, bool) or units < 0 or purpose is not None and purpose not in PURPOSES:
                raise ResearchBudgetError("研究资源计量无效")
            identity, at = str(uuid.uuid4()), self.now()
            reason = limit_reason(self.job["budgetState"], kind=kind, units=units, reserved_cost=reserved_cost, at=at)
            if reason:
                action = "stop" if self.job["budgetState"]["mode"] == "enforce" else "would-stop"
                self.job["budgetState"]["decisions"].append({"id": identity, "at": at, "reason": reason, "action": action})
                await self.persist(self.job)
                if action == "stop":
                    raise ResearchBudgetError("研究预算已达到限制，任务已安全停止")
            self.job["budgetState"]["receipts"].append({"id": identity, "kind": kind, "units": units, "purpose": purpose, "status": "reserved", "createdAt": at, "completedAt": None, "cost": None, "reservedCost": _money(reserved_cost)})
            validate_state(self.job["budgetState"])
            await self.persist(self.job)
            return identity

    async def finish(self, identity: str, *, cost: dict[str, Any] | None = None) -> None:
        async with self.lock:
            rows = [row for row in self.job["budgetState"]["receipts"] if row["id"] == identity]
            if len(rows) != 1:
                raise ResearchBudgetError("研究预算凭证不存在")
            row = rows[0]
            if row["status"] == "completed":
                return
            row.update(status="completed", completedAt=self.now(), cost=_money(cost))
            validate_state(self.job["budgetState"])
            await self.persist(self.job)


def activate(job: dict[str, Any], persist: Callable[[dict[str, Any]], Awaitable[None]]) -> Token[BudgetLedger | None] | None:
    if job.get("budgetState") is None:
        return None
    return ACTIVE_BUDGET.set(BudgetLedger(job, persist))


def deactivate(token: Token[BudgetLedger | None] | None) -> None:
    if token is not None:
        ACTIVE_BUDGET.reset(token)


def current() -> BudgetLedger | None:
    return ACTIVE_BUDGET.get()


async def account(kind: str, units: int, run: Callable[[], Awaitable[Any]], *, purpose: str | None = None) -> Any:
    ledger = current()
    if ledger is None:
        return await run()
    token = await ledger.begin(kind, units, purpose=purpose)
    try:
        result = await run()
    except asyncio.CancelledError:
        # Process cancellation may make the external outcome unknowable.
        raise
    except Exception:
        await ledger.finish(token)
        raise
    await ledger.finish(token)
    return result
