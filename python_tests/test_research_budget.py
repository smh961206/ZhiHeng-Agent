import json
from copy import deepcopy

import httpx
import pytest

from python_backend.domain.research_budget import BudgetLedger, ResearchBudgetError, assert_recoverable, create_state, limit_reason, summary
from python_backend.infrastructure.model_gateway import ModelGateway

LIMITS = {
    "version": 1,
    "maxModelCost": {"currency": "CNY", "amount": 1.0},
    "maxToolRounds": 2,
    "maxWebRequests": 3,
    "maxVisionPages": 4,
    "maxDurationMs": 60_000,
}


def test_budget_preserves_zero_unknown_and_currency_boundaries():
    state = create_state(LIMITS, started_at="2026-09-14T00:00:00Z", mode="enforce")
    assert limit_reason(state, kind="model", units=1, reserved_cost=None, at="2026-09-14T00:00:01Z") == "unknown_cost"
    assert limit_reason(state, kind="model", units=1, reserved_cost={"currency": "USD", "estimatedCost": 0}, at="2026-09-14T00:00:01Z") == "unknown_cost"
    assert limit_reason(state, kind="model", units=1, reserved_cost={"currency": "CNY", "estimatedCost": 0}, at="2026-09-14T00:00:01Z") is None
    assert summary(state, at="2026-09-14T00:00:02Z")["counts"]["model"] == 0


@pytest.mark.asyncio
async def test_budget_reserves_before_work_and_blocks_uncertain_recovery():
    job = {"budgetState": create_state({**LIMITS, "maxModelCost": None}, started_at=BudgetLedger.now(), mode="enforce")}
    snapshots = []

    async def persist(value):
        snapshots.append(deepcopy(value["budgetState"]))

    ledger = BudgetLedger(job, persist)
    token = await ledger.begin("toolRound", 1)
    assert snapshots[-1]["receipts"][0]["status"] == "reserved"
    with pytest.raises(ResearchBudgetError):
        assert_recoverable(job)
    await ledger.finish(token)
    assert_recoverable(job)
    assert summary(job["budgetState"], at=ledger.now())["counts"]["toolRound"] == 1


@pytest.mark.asyncio
async def test_enforcement_persists_decision_before_rejecting_resource():
    job = {"budgetState": create_state({**LIMITS, "maxModelCost": None, "maxToolRounds": 0}, started_at="2026-09-14T00:00:00Z", mode="enforce")}
    saved = []

    async def persist(value):
        saved.append(deepcopy(value["budgetState"]))

    with pytest.raises(ResearchBudgetError):
        await BudgetLedger(job, persist).begin("toolRound", 1)
    assert saved[-1]["decisions"][0]["action"] == "stop"
    assert saved[-1]["receipts"] == []


@pytest.mark.asyncio
async def test_gateway_durably_accounts_a_logical_model_call(tmp_path):
    config = {
        "schemaVersion": 2,
        "models": {"fixture": {"model": "fixture", "baseUrl": "https://model.example/v1", "apiKeyEnv": "MODEL_KEY"}},
        "pipeline": {key: ([] if key in {"criticalReviewer", "judge"} else "fixture") for key in
                     ("input", "vision", "researcher", "writer", "evidenceVerifier", "auditor", "criticalReviewer", "judge")},
    }
    path = tmp_path / "models.json"
    path.write_text(json.dumps(config), encoding="utf-8")

    async def handler(_request):
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}, "finish_reason": "stop"}],
                                         "usage": {"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3}})

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    job = {"id": "job-budget", "budgetState": create_state({**LIMITS, "maxModelCost": None}, started_at=BudgetLedger.now(), mode="enforce")}
    saves = []

    async def persist(value):
        saves.append(deepcopy(value["budgetState"]))

    gateway.attach_budget(job, persist)
    with gateway.job_scope(job["id"]):
        assert await gateway.complete("auditor", [{"role": "user", "content": "x"}]) == "ok"
    gateway.detach_budget(job["id"])
    receipt = job["budgetState"]["receipts"][0]
    assert receipt["status"] == "completed" and receipt["purpose"] == "auditor"
    assert receipt["cost"] is None
    assert [row["receipts"][0]["status"] for row in saves] == ["reserved", "completed"]
