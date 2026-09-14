from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, cast


@dataclass(frozen=True)
class Price:
    input_per_million: float | None
    output_per_million: float | None
    currency: str = "USD"
    cache_read_per_million: float | None = None


def usage_cost(usage: dict[str, Any], price: Price) -> dict[str, Any]:
    input_tokens, output_tokens = usage.get("inputTokens"), usage.get("outputTokens")
    known = all(isinstance(item, int) and not isinstance(item, bool) and item >= 0 for item in (input_tokens, output_tokens))
    cached_tokens = usage.get("cachedInputTokens")
    valid_cached = isinstance(cached_tokens, int) and not isinstance(cached_tokens, bool)
    cached_count = cast(int, cached_tokens) if valid_cached else 0
    cache_within_input = valid_cached and isinstance(input_tokens, int) and cached_count <= input_tokens
    cache_known = cached_tokens is None or cache_within_input and cached_count == 0 or cache_within_input and price.cache_read_per_million is not None
    priced = price.input_per_million is not None and price.output_per_million is not None and cache_known
    cost = (
        (
            (cast(int, input_tokens) - cached_count) * cast(float, price.input_per_million)
            + cached_count * cast(float, price.cache_read_per_million or 0)
            + cast(int, output_tokens) * cast(float, price.output_per_million)
        )
        / 1_000_000
        if known and priced
        else None
    )
    return {
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "totalTokens": usage.get("totalTokens"),
        "cachedInputTokens": usage.get("cachedInputTokens"),
        "cost": cost,
        "currency": price.currency if cost is not None else None,
        "status": "calculated" if cost is not None else "unknown",
    }


def request_fingerprint(purpose: str, messages: list[dict], contract_version: str) -> str:
    payload = json.dumps(
        {"purpose": purpose, "messages": messages, "contractVersion": contract_version}, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(payload.encode()).hexdigest()


@dataclass
class HealthState:
    failures: int = 0
    blocked_until: datetime | None = None

    def success(self) -> None:
        self.failures = 0
        self.blocked_until = None

    def failure(self, now: datetime | None = None, *, threshold: int = 3, cooldown_seconds: int = 60) -> None:
        self.failures += 1
        if self.failures >= threshold:
            self.blocked_until = (now or datetime.now(timezone.utc)) + timedelta(seconds=cooldown_seconds)

    def eligible(self, now: datetime | None = None) -> bool:
        return self.blocked_until is None or self.blocked_until <= (now or datetime.now(timezone.utc))


@dataclass(frozen=True)
class Candidate:
    key: str
    purposes: frozenset[str]
    quality: float
    priority: int = 0
    enabled: bool = True


def select_candidate(purpose: str, candidates: list[Candidate], health: dict[str, HealthState] | None = None) -> Candidate:
    states = health or {}
    eligible = [item for item in candidates if item.enabled and purpose in item.purposes and states.get(item.key, HealthState()).eligible()]
    if not eligible:
        raise ValueError(f"模型环节 {purpose} 没有健康且启用的候选")
    if any(not math.isfinite(item.quality) for item in eligible):
        raise ValueError("模型质量分必须是有限数字")
    return sorted(eligible, key=lambda item: (-item.quality, item.priority, item.key))[0]


@dataclass
class UsageLedger:
    calls: list[dict[str, Any]] = field(default_factory=list)

    def record(self, *, purpose: str, candidate: str, usage: dict[str, Any], price: Price, cached: bool = False) -> dict[str, Any]:
        row = {"purpose": purpose, "candidate": candidate, "cached": cached, **usage_cost(usage, price)}
        self.calls.append(row)
        return row

    def summary(self) -> dict[str, Any]:
        known = [item["cost"] for item in self.calls if item["cost"] is not None]
        return {
            "calls": len(self.calls),
            "knownCostCalls": len(known),
            "unknownCostCalls": len(self.calls) - len(known),
            "cost": sum(known) if len(known) == len(self.calls) else None,
            "currency": "USD" if self.calls and len(known) == len(self.calls) else None,
        }
