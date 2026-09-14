from datetime import datetime, timedelta, timezone

from python_backend.domain.model_governance import Candidate, HealthState, Price, UsageLedger, request_fingerprint, select_candidate, usage_cost


def test_quality_first_routing_is_provider_neutral_and_health_aware():
    candidates = [Candidate("primary", frozenset({"researcher"}), 0.9), Candidate("fallback", frozenset({"researcher"}), 0.8)]
    assert select_candidate("researcher", candidates).key == "primary"
    now = datetime.now(timezone.utc)
    health = HealthState(failures=3, blocked_until=now + timedelta(minutes=1))
    assert select_candidate("researcher", candidates, {"primary": health}).key == "fallback"
    health.success()
    assert select_candidate("researcher", candidates, {"primary": health}).key == "primary"


def test_cost_and_cache_identity_preserve_unknowns():
    assert usage_cost({"inputTokens": 100, "outputTokens": 50}, Price(None, 2))["status"] == "unknown"
    ledger = UsageLedger()
    ledger.record(purpose="researcher", candidate="primary", usage={"inputTokens": 1_000_000, "outputTokens": 500_000}, price=Price(1, 2))
    assert ledger.summary()["cost"] == 2
    first = request_fingerprint("researcher", [{"role": "user", "content": "x"}], "v1")
    second = request_fingerprint("researcher", [{"role": "user", "content": "x"}], "v2")
    assert first != second
