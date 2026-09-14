"""Privacy-preserving model prompt-cache observations.

The cache receipt hashes only stable leading system text and dispatch
configuration.  User messages, images, tool results and private reasoning are
never persisted.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, cast

CACHE_ELIGIBILITY_POLICY: dict[str, Any] = {
    "version": "cache-eligibility-1",
    "minSamples": 30,
    "minUniqueJobs": 5,
    "minCoverage": 0.9,
    "minTokenRatio": 0.5,
    "windowMs": 7 * 86_400_000,
}


def _canonical_json(value: object) -> str:
    # Matches JSON.stringify for the JSON-compatible request/profile values used
    # by the gateway, including insertion order and compact separators.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def model_prefix_fingerprint(request: dict[str, Any], profile: dict[str, Any], connection_identity: str) -> dict[str, Any] | None:
    messages = request.get("messages")
    if not isinstance(messages, list):
        return None
    text_only = all(
        isinstance(message, dict)
        and (
            message.get("content") is None
            or isinstance(message.get("content"), str)
            or (
                isinstance(message.get("content"), list)
                and all(
                    isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str)
                    for part in message["content"]
                )
            )
        )
        for message in messages
    )
    prefix: list[str] = []
    for message in messages:
        if message.get("role") != "system":
            break
        content = message.get("content")
        if not isinstance(content, str):
            return None
        prefix.append(content)
    if not text_only or not prefix:
        return None
    dimensions = {
        "version": 1,
        "connectionIdentity": connection_identity,
        "profile": profile.get("id"),
        "model": profile.get("model"),
        "protocol": profile.get("protocol"),
        "purpose": request.get("purpose"),
        "reasoningEffort": request.get("reasoningEffort"),
        "prefix": prefix,
        "tools": request.get("tools"),
        "responseFormat": request.get("responseFormat"),
    }
    digest = hashlib.sha256(_canonical_json(dimensions).encode()).hexdigest()
    return {"schemaVersion": 1, "prefixFingerprint": digest, "textOnly": True}


def _time(value: object) -> datetime | None:
    if not isinstance(value, (str, datetime)):
        return None
    try:
        parsed = value if isinstance(value, datetime) else datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return None
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


def _unique_calls(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    known: dict[str, dict[str, Any]] = {}
    anonymous: list[dict[str, Any]] = []
    for raw in records:
        call_id = raw.get("id")
        if not isinstance(call_id, str) or not call_id:
            anonymous.append(raw)
            continue
        previous = known.get(call_id)
        if previous is None or previous.get("status") == "started":
            known[call_id] = raw
    return [*known.values(), *anonymous]


def model_cache_analytics(
    records: list[dict[str, Any]], *, as_of: str | datetime | None = None, window_ms: int = 7 * 86_400_000
) -> list[dict[str, Any]]:
    cutoff = _time(as_of or datetime.now(timezone.utc))
    if cutoff is None or isinstance(window_ms, bool) or not isinstance(window_ms, int) or window_ms <= 0:
        raise TypeError("Invalid cache observation window")
    groups: dict[tuple[str, str], dict[str, Any]] = {}
    for call in _unique_calls(records):
        cache, profile, finished = call.get("cache"), call.get("profile"), _time(call.get("finishedAt"))
        if (
            not isinstance(cache, dict)
            or cache.get("schemaVersion") != 1
            or cache.get("textOnly") is not True
            or not isinstance(cache.get("prefixFingerprint"), str)
            or not isinstance(profile, str)
            or finished is None
            or finished > cutoff
            or finished <= cutoff - timedelta(milliseconds=window_ms)
        ):
            continue
        key = (profile, cache["prefixFingerprint"])
        group = groups.setdefault(
            key,
            {
                "schemaVersion": 1,
                "profile": profile,
                "prefixFingerprint": cache["prefixFingerprint"],
                "textOnly": True,
                "asOf": cutoff.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                "windowMs": window_ms,
                "calls": 0,
                "samples": 0,
                "hitCalls": 0,
                "inputTokens": 0,
                "cachedInputTokens": 0,
                "jobs": set(),
            },
        )
        group["calls"] += 1
        usage = cast(dict[str, Any], call.get("usage")) if isinstance(call.get("usage"), dict) else {}
        sources = cast(dict[str, Any], call.get("tokenSources")) if isinstance(call.get("tokenSources"), dict) else {}
        input_tokens, cached_tokens = usage.get("inputTokens"), usage.get("cachedInputTokens")
        input_source = sources.get("inputTokens", "provider" if isinstance(input_tokens, int) else "unknown")
        cached_source = sources.get("cachedInputTokens", "provider" if isinstance(cached_tokens, int) else "unknown")
        observed = (
            call.get("status") in {"succeeded", "completed"}
            and call.get("transportAttempts") == 1
            and isinstance(input_tokens, int)
            and not isinstance(input_tokens, bool)
            and input_tokens > 0
            and isinstance(cached_tokens, int)
            and not isinstance(cached_tokens, bool)
            and input_source == "provider"
            and cached_source == "provider"
        )
        if observed:
            assert isinstance(input_tokens, int) and isinstance(cached_tokens, int)
            group["samples"] += 1
            group["hitCalls"] += int(cached_tokens > 0)
            group["inputTokens"] += input_tokens
            group["cachedInputTokens"] += cached_tokens
            if isinstance(call.get("jobId"), str) and call["jobId"]:
                group["jobs"].add(call["jobId"])
    result = []
    for group in groups.values():
        jobs = group.pop("jobs")
        samples, calls = group["samples"], group["calls"]
        group["uniqueJobs"] = len(jobs)
        group["unknownCalls"] = calls - samples
        if not samples:
            group["inputTokens"] = None
            group["cachedInputTokens"] = None
        group["observedHitRatio"] = group["hitCalls"] / samples if samples else None
        group["observedTokenRatio"] = group["cachedInputTokens"] / group["inputTokens"] if samples and group["inputTokens"] else None
        result.append(group)
    return result


def cache_eligibility(
    records: list[dict[str, Any]], *, request: dict[str, Any], profile: dict[str, Any], connection_identity: str, as_of: str | None = None
) -> dict[str, Any]:
    fingerprint = model_prefix_fingerprint(request, profile, connection_identity)
    reasons: list[str] = []
    if fingerprint is None:
        reasons.append("text_prefix_required")
    stats = None
    if fingerprint is not None:
        stats = next(
            (
                row
                for row in model_cache_analytics(records, as_of=as_of, window_ms=cast(int, CACHE_ELIGIBILITY_POLICY["windowMs"]))
                if row["profile"] == profile.get("id") and row["prefixFingerprint"] == fingerprint["prefixFingerprint"]
            ),
            None,
        )
    if stats is None or stats["samples"] < CACHE_ELIGIBILITY_POLICY["minSamples"]:
        reasons.append("observations_required")
    if stats is None or stats["uniqueJobs"] < CACHE_ELIGIBILITY_POLICY["minUniqueJobs"]:
        reasons.append("independent_jobs_required")
    if stats is None or not stats["calls"] or stats["samples"] / stats["calls"] < CACHE_ELIGIBILITY_POLICY["minCoverage"]:
        reasons.append("observed_coverage_required")
    if stats is None or stats["observedTokenRatio"] is None or stats["observedTokenRatio"] < CACHE_ELIGIBILITY_POLICY["minTokenRatio"]:
        reasons.append("observed_ratio_required")
    return {"policyVersion": CACHE_ELIGIBILITY_POLICY["version"], "eligible": not reasons, "reasons": reasons, "stats": stats}


__all__ = ["CACHE_ELIGIBILITY_POLICY", "cache_eligibility", "model_cache_analytics", "model_prefix_fingerprint"]
