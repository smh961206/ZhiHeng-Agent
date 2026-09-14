from __future__ import annotations

from copy import deepcopy

from python_backend.domain.model_cache import cache_eligibility, model_cache_analytics, model_prefix_fingerprint

PROFILE = {"id": "main", "model": "opaque", "protocol": "openai-chat-completions"}
REQUEST = {
    "purpose": "research",
    "messages": [{"role": "system", "content": "private-system"}, {"role": "user", "content": "private-company"}],
}
AS_OF = "2026-09-12T00:00:00.000Z"


def _record(call_id: str, **extra):
    value = {
        "id": call_id,
        "jobId": "job-" + call_id,
        "profile": "main",
        "status": "succeeded",
        "errorCategory": None,
        "transportAttempts": 1,
        "finishedAt": "2026-09-11T00:00:00.000Z",
        "cache": model_prefix_fingerprint(REQUEST, PROFILE, "a" * 64),
        "usage": {"inputTokens": 100, "cachedInputTokens": 80},
    }
    value.update(extra)
    return value


def test_prefix_hash_uses_stable_text_prefix_and_never_continuation():
    first = model_prefix_fingerprint(REQUEST, PROFILE, "a" * 64)
    assert first and len(first["prefixFingerprint"]) == 64
    changed_user = {**REQUEST, "messages": [REQUEST["messages"][0], {"role": "user", "content": "another-company"}]}
    assert model_prefix_fingerprint(changed_user, PROFILE, "a" * 64) == first
    assert model_prefix_fingerprint({**REQUEST, "reasoningEffort": "high"}, PROFILE, "a" * 64) != first
    assert model_prefix_fingerprint({**REQUEST, "tools": [{"type": "function", "function": {"name": "search"}}]}, PROFILE, "a" * 64) != first
    assert model_prefix_fingerprint(REQUEST, PROFILE, "b" * 64) != first
    assert model_prefix_fingerprint({**REQUEST, "messages": [REQUEST["messages"][1]]}, PROFILE, "a" * 64) is None
    image = {**REQUEST, "messages": [REQUEST["messages"][0], {"role": "user", "content": [{"type": "image_url"}]}]}
    assert model_prefix_fingerprint(image, PROFILE, "a" * 64) is None


def test_cache_eligibility_requires_observed_samples_and_independent_jobs():
    rows = [_record(str(index)) for index in range(30)]
    options = {"request": REQUEST, "profile": PROFILE, "connection_identity": "a" * 64, "as_of": AS_OF}
    assert cache_eligibility(rows, **options)["eligible"] is True
    assert cache_eligibility(rows[:29], **options)["eligible"] is False
    one_job = [{**row, "jobId": "one"} for row in rows]
    assert cache_eligibility(one_job, **options)["eligible"] is False
    weak = [{**row, "usage": {"inputTokens": 100, "cachedInputTokens": 20}} for row in rows]
    assert cache_eligibility(weak, **options)["eligible"] is False


def test_cache_analytics_deduplicates_and_keeps_unknown_observations_unknown():
    first = _record("a")
    second = _record("b", usage={"inputTokens": 900, "cachedInputTokens": 0})
    unknown = _record("u", tokenSources={"cachedInputTokens": "estimated"})
    rows = model_cache_analytics(
        [
            first,
            deepcopy(first),
            second,
            unknown,
            _record("future", finishedAt="2026-09-13T00:00:00.000Z"),
            _record("old", finishedAt="2026-08-01T00:00:00.000Z"),
        ],
        as_of=AS_OF,
    )
    assert len(rows) == 1
    assert rows[0]["samples"] == 2 and rows[0]["unknownCalls"] == 1
    assert rows[0]["observedHitRatio"] == 0.5
    assert rows[0]["observedTokenRatio"] == 0.08
    assert rows[0]["uniqueJobs"] == 2
    empty = model_cache_analytics([_record("missing", usage=None)], as_of=AS_OF)[0]
    assert empty["observedTokenRatio"] is None

