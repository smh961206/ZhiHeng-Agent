from __future__ import annotations

import json
from copy import deepcopy

import pytest

from python_backend.application.baseline import attach_research_baseline
from python_backend.application.path_resolver import ResearchPathResolver
from python_backend.application.research_service import ResearchService
from python_backend.domain.contracts import ApiError, make_plan, now, validate_payload
from python_backend.domain.review import NO_EVIDENCE_ACTIONS, validate_review


class Gateway:
    def __init__(self, output: str):
        self.output = output
        self.calls = 0

    async def complete(self, *_args, **_kwargs):
        self.calls += 1
        return self.output


@pytest.mark.asyncio
async def test_semantic_path_receipt_is_bound_to_exact_question_and_manual_mode_wins():
    gateway = Gateway('{"mode":"B","reason":"否定了比较诉求，执行一般公司研究"}')
    resolver = ResearchPathResolver(gateway)
    question = "不做比较，只研究 AAPL 现金流"
    decision = await resolver.recommend(question)
    assert decision["source"] == "semantic" and decision["mode"] == "B"
    assert (await resolver.recommend(question))["decisionId"] == decision["decisionId"]
    assert gateway.calls == 1
    assert (await resolver.resolve({"question": question, "mode": "F", "pathDecisionId": decision["decisionId"]}))["mode"] == "F"
    with pytest.raises(ApiError, match="已失效"):
        await resolver.resolve({"question": "另一个问题", "pathDecisionId": decision["decisionId"]})


@pytest.mark.asyncio
async def test_financial_update_baseline_is_immutable_and_historical_citations_are_separate():
    prior = {
        "id": "00000000-0000-4000-8000-000000000001",
        "status": "completed",
        "createdAt": "2026-01-01T00:00:00Z",
        "input": {"question": "旧研究", "securities": [{"market": "US", "symbol": "AAPL"}]},
        "plan": {"executionCompatibilityVersion": 1, "contractVersion": 7},
        "result": {"report": "历史结论[S1]", "decision": {"summary": "旧摘要[S1]"}},
    }
    original = deepcopy(prior)
    current = {"baselineJobId": prior["id"], "securities": [{"market": "US", "symbol": "AAPL"}]}
    result = await attach_research_baseline(current, "C", lambda _id: _return(prior))
    assert result["baseline"]["report"] == "历史结论[历史:S1]"
    assert result["baseline"]["decision"]["summary"] == "旧摘要[历史:S1]"
    assert prior == original


async def _return(value):
    return value


def test_review_contract_rejects_unknown_citations_high_confidence_gaps_and_unsupported_actions():
    base = {
        "report": "已核对事实[S1]。",
        "audit": "证据范围内通过。",
        "decision": {
            "action": "观察",
            "confidence": "中低",
            "summary": "范围有限",
            "falsifiers": ["条件一", "条件二", "条件三"],
            "dataAsOf": "2025-01-01T00:00:00Z",
        },
    }
    evidence = [{"sourceId": "S1", "blockId": "b1", "text": "合成证据"}]
    result = validate_review(json.dumps(base, ensure_ascii=False), mode="B", cutoff="2025-01-01T00:00:00Z", evidence=evidence, gaps=["缺口"])
    assert result["validation"]["citedSourceIds"] == ["S1"]
    for mutate in (
        lambda item: item.update(report="伪引用[S99]"),
        lambda item: item["decision"].update(confidence="高"),
        lambda item: item["decision"].update(action="立即买入"),
    ):
        broken = deepcopy(base)
        mutate(broken)
        with pytest.raises(ValueError):
            validate_review(json.dumps(broken, ensure_ascii=False), mode="B", cutoff="2025-01-01T00:00:00Z", evidence=evidence, gaps=["缺口"])


def test_review_contract_uses_mode_compatible_low_confidence_actions_without_evidence():
    for mode, action in NO_EVIDENCE_ACTIONS.items():
        payload = {
            "report": "当前没有可用于形成结论的正式证据。",
            "audit": "保留证据缺口，不形成未经证实的判断。",
            "decision": {
                "action": action,
                "confidence": "低",
                "summary": "等待正式证据后复核。",
                "falsifiers": ["获得正式披露", "核实财务口径", "确认研究截止时点"],
                "dataAsOf": "2025-01-01T00:00:00Z",
            },
        }
        result = validate_review(
            json.dumps(payload, ensure_ascii=False),
            mode=mode,
            cutoff="2025-01-01T00:00:00Z",
            evidence=[],
            gaps=["缺口"],
        )
        assert result["decision"]["action"] == action


class DeliveryStorage:
    def __init__(self):
        self.job = None
        self.failures = 3

    async def save_job(self, job):
        if self.failures:
            self.failures -= 1
            raise OSError("temporary outage")
        job["revision"] = job.get("revision", 0) + 1
        self.job = deepcopy(job)

    async def get_job(self, _job_id):
        return deepcopy(self.job)


@pytest.mark.asyncio
async def test_failed_delivery_retains_private_result_and_manual_save_does_not_rerun_research():
    storage = DeliveryStorage()
    service = ResearchService(storage, Gateway(""), lambda *_: _return(None), delivery_delays=(0, 0, 0))
    input_data = validate_payload(
        {
            "question": "研究 AAPL",
            "mode": "B",
            "securities": [{"market": "US", "symbol": "AAPL"}],
            "researchCutoff": "2025-01-01T00:00:00Z",
        }
    )
    job = {
        "id": "00000000-0000-4000-8000-000000000099",
        "input": input_data,
        "mode": "B",
        "status": "running",
        "createdAt": now(),
        "plan": make_plan(input_data, "B"),
        "events": [],
        "submission": {"fingerprint": "a" * 64},
        "revision": 0,
        "retryCount": 0,
    }
    outcome = {
        "status": "completed",
        "result": {"report": "最终报告", "decision": {"action": "观察", "confidence": "中低", "summary": "摘要"}},
        "researchOutcome": {"action": "观察"},
    }
    assert not await service._finish_delivery(job, outcome)
    assert job["delivery"]["recoverable"] is True and "result" not in job
    service.jobs[job["id"]] = job
    saved = await service.retry_delivery(job["id"], 0)
    assert saved["status"] == "completed" and saved["result"]["report"] == "最终报告"
    assert storage.job["delivery"]["attempts"] == 4
