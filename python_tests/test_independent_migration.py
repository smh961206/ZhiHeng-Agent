import asyncio
import json
from copy import deepcopy

import httpx
import pytest

from python_backend.application.independent_review import IndependentReviewService, IndependentStateError, assert_independent_recovery
from python_backend.application.recovery import make_checkpoint
from python_backend.application.research_pipeline import PipelineResult
from python_backend.application.research_service import ResearchService
from python_backend.domain.contracts import public_job
from python_backend.domain.independent_review import digest, eligible, independent_packet
from python_backend.domain.judge import detect_conflict, judge_packet, validate_judge
from python_backend.domain.review import validate_review
from python_backend.infrastructure.model_adapter import ModelGatewayError
from python_backend.infrastructure.model_gateway import ModelConfigurationError, ModelGateway
from python_tests.test_model_gateway import config_file
from python_tests.test_research_service_recovery import Storage, _job

CUTOFF = "2025-01-01T00:00:00Z"
TEXT = "经营现金流保持增长，但新增投入和需求下滑可能改变长期判断。"


def evidence_fixture():
    sources = [{"id": "S1", "type": "official-report", "official": True, "publishedAt": "2024-12-01",
                "documentBlocks": [{"id": "b1", "method": "native", "text": TEXT}]}]
    return sources, [{"sourceId": "S1", "blockId": "b1", "text": TEXT}]


def pair_fixture(kind="claim"):
    conclusion = {"id": "L1", "subject": "持续回报", "kind": kind, "completed": True, "statement": "增长支持持续回报",
                  "position": "support", "basis": {"entity": "US:AAPL", "period": "2024", "currency": "USD", "shareBasis": "diluted",
                                                   "accountingScope": "consolidated", "valuationBasis": "per-share"},
                  "evidenceRefs": [{"sourceId": "S1", "blockId": "b1"}], "counterEvidenceRefs": [{"sourceId": "S1", "blockId": "b1"}],
                  "toolCallIds": []}
    return {"l1": conclusion, "l2": deepcopy(conclusion) | {"id": "L2", "statement": "投入和需求风险反对持续回报", "position": "oppose"}}


def packet_fixture():
    sources, evidence = evidence_fixture()
    return judge_packet(pair_fixture(), cutoff=CUTOFF, sources=sources, evidence=evidence, tools=[])


def output_fixture(packet):
    return {"version": 1, "inputHash": packet["inputHash"], "outcome": "accept_l1", "selectedId": "L1",
            "reasonCode": "evidence_consistency", "citations": [{"sourceId": "S1", "blockId": "b1", "quote": TEXT}], "reviewedToolCallIds": []}


@pytest.mark.parametrize("change", ["missing", "future", "duplicate", "truncated", "vision", "unknown_block", "changed_text"])
def test_incomplete_and_future_evidence_is_not_admitted(change):
    sources, evidence = evidence_fixture()
    if change == "missing":
        sources[0].pop("publishedAt")
    elif change == "future":
        sources[0]["publishedAt"] = "2025-01-02"
    elif change == "duplicate":
        evidence.append(deepcopy(evidence[0]))
    elif change == "truncated":
        sources[0]["truncated"] = True
    elif change == "vision":
        sources[0]["documentBlocks"][0]["method"] = "vision"
    elif change == "unknown_block":
        evidence[0]["blockId"] = "unknown"
    else:
        evidence[0]["text"] = "invented"
    with pytest.raises(ValueError):
        independent_packet(CUTOFF, sources, evidence, [], ["公开结论"])


@pytest.mark.parametrize("kwargs", [{"mode": "A"}, {"gaps": ["missing"]}, {"evidence": []}, {"provider_failure": True},
                                   {"tools_pending": True}, {"failures": ["format", "validation"]}])
def test_critical_review_admission(kwargs):
    assert not eligible("criticalReviewer", **({"mode": "B", "gaps": [], "evidence": [{}], "failures": ["format", "semantic"]} | kwargs))


@pytest.mark.parametrize("change", ["third", "no_citations", "invented_quote", "duplicate", "missing_tools", "hash", "reason"])
def test_judge_rejects_third_conclusion_and_incomplete_citations(change):
    packet = packet_fixture()
    output = output_fixture(packet)
    assert validate_judge(json.dumps(output), packet)["selectedId"] == "L1"
    if change == "third":
        output["selectedId"] = "L3"
    elif change == "no_citations":
        output["citations"] = []
    elif change == "invented_quote":
        output["citations"][0]["quote"] = "invented"
    elif change == "duplicate":
        output["citations"] *= 2
    elif change == "missing_tools":
        output["reviewedToolCallIds"] = ["unknown"]
    elif change == "hash":
        packet["cutoff"] = "2026-01-01"
    else:
        output["reasonCode"] = "calculation_consistency"
    with pytest.raises(ValueError):
        validate_judge(json.dumps(output), packet)


def test_valuation_uses_actual_program_receipts_and_identical_basis():
    pair, tools = pair_fixture("valuation"), []
    for index, conclusion in enumerate(pair.values(), 1):
        identity = f"C{index}"
        conclusion["toolCallIds"] = [identity]
        basis = deepcopy(conclusion["basis"]) | {"sourceIds": ["S1"], "evidenceBlocks": conclusion["evidenceRefs"]}
        tools.append({"id": identity, "name": "normalized_earnings", "arguments": {"basis": basis},
                      "status": "calculated-needs-review", "output": {"value": [10, 15] if index == 1 else [30, 40]}})
    assert detect_conflict(pair, tools)["gapRatio"] == 15 / 40
    sources, evidence = evidence_fixture()
    assert judge_packet(pair, cutoff=CUTOFF, sources=sources, evidence=evidence, tools=tools)["conflict"]["material"]
    tools[1]["output"]["value"] = [14, 20]
    with pytest.raises(ValueError, match="重大性"):
        detect_conflict(pair, tools)
    tools[1]["arguments"]["basis"]["currency"] = "CNY"
    with pytest.raises(ValueError, match="口径"):
        detect_conflict(pair, tools)


class OptionalGateway:
    def __init__(self, storage=None, fail=False):
        self.calls = []
        self.storage, self.fail = storage, fail
        self.assignment = {"key": "configured-fixture", "model": "fixture", "connectionIdentity": "a" * 64}

    def pinned_state(self):
        return {"version": 2, "configurationFingerprint": "b" * 64,
                "assignments": {key: [self.assignment] for key in ("judge", "criticalReviewer")}}

    def optional_profile(self, _purpose):
        return {"assignment": self.assignment, "configurationFingerprint": "b" * 64}

    async def complete(self, purpose, messages, **kwargs):
        self.calls.append(purpose)
        if self.storage:
            assert self.storage.jobs["resume-job"]["flagshipState"]["sessions"][purpose]["status"] == "reserved"
        if self.fail:
            raise RuntimeError("request uncertain")
        return json.dumps(output_fixture(json.loads(messages[1]["content"])))


@pytest.mark.asyncio
async def test_session_reuse_tampering_scope_and_legacy_state():
    job = _job()
    storage = Storage([job])
    gateway = OptionalGateway(storage)
    job["modelState"] = gateway.pinned_state()
    service, packet = IndependentReviewService(storage, gateway), packet_fixture()

    def validate(raw):
        return validate_judge(raw, packet)

    first = await service.run(job, "judge", packet, "system", validate)
    assert await service.run(job, "judge", packet, "system", validate) == first
    assert gateway.calls == ["judge"] and "flagshipState" not in public_job(job)
    changed_override = deepcopy(job) | {"humanOverride": {"decision": "changed"}}
    with pytest.raises(IndependentStateError):
        assert_independent_recovery(changed_override)
    for target, key, value in [("input", "question", "different"), ("modelState", "configurationFingerprint", "changed"), ("flagshipState", "version", 1)]:
        changed = deepcopy(job)
        changed[target][key] = value
        with pytest.raises(IndependentStateError):
            assert_independent_recovery(changed)
    job["flagshipState"]["sessions"]["judge"]["outcome"]["selectedId"] = "L3"
    with pytest.raises(IndependentStateError):
        assert_independent_recovery(job)


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["reservation", "provider", "completion", "rejected", "cancelled"])
async def test_uncertain_or_rejected_sessions_never_replay(failure):
    job, packet = _job(), packet_fixture()
    storage = Storage([job])
    original, writes = storage.save_job, 0

    async def save(value):
        nonlocal writes
        writes += 1
        if failure == "reservation" and writes == 1 or failure == "completion" and writes == 2:
            raise RuntimeError("database uncertain")
        await original(value)

    class Gateway(OptionalGateway):
        async def complete(self, *args, **kwargs):
            if failure == "cancelled":
                self.calls.append("judge")
                raise asyncio.CancelledError()
            return await super().complete(*args, **kwargs)

    storage.save_job = save
    gateway = Gateway(fail=failure == "provider")
    job["modelState"] = gateway.pinned_state()
    service = IndependentReviewService(storage, gateway)

    def validate(raw):
        if failure == "rejected":
            raise ValueError("invalid output")
        return validate_judge(raw, packet)

    with pytest.raises((ValueError, RuntimeError, asyncio.CancelledError)):
        await service.run(job, "judge", packet, "system", validate)
    with pytest.raises(IndependentStateError):
        await service.run(job, "judge", packet, "system", validate)
    assert len(gateway.calls) == (0 if failure == "reservation" else 1)


@pytest.mark.asyncio
async def test_gateway_independent_call_does_not_retry_or_fail_over(tmp_path):
    path = config_file(tmp_path, candidates=True)
    config = json.loads(path.read_text())
    config["pipeline"]["judge"] = ["primary", "fallback"]
    path.write_text(json.dumps(config))
    calls, records = [], []

    async def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("uncertain", request=request)

    async def record(value):
        records.append(value)

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    gateway.set_recorder(record)
    with pytest.raises(ModelConfigurationError):
        await gateway.complete("judge", [{"role": "user", "content": "test"}])
    with gateway.job_scope("job-optional"):
        with pytest.raises(ModelGatewayError):
            await gateway.complete("judge", [{"role": "user", "content": "test"}], pinned_profile=gateway.optional_profile("judge"))
    assert len(calls) == 1 and records[0]["jobId"] == "job-optional" and records[0]["transportAttempts"] == 1


def reviewed_fixture():
    return {"report": "研究结论和反证[S1]", "audit": "证据已核对", "decision": {"action": "观察", "confidence": "中",
            "summary": "证据范围内判断", "falsifiers": ["条件一", "条件二", "条件三"], "dataAsOf": CUTOFF}}


@pytest.mark.asyncio
@pytest.mark.parametrize("purpose", ["criticalReviewer", "judge", "judge_override", "critical_missing", "judge_final_invalid"])
async def test_research_flow_optional_stages_and_final_audit(purpose):
    job = _job()
    sources, evidence = evidence_fixture()
    prepared = PipelineResult(sources, evidence, [], [], ["missing"] if purpose == "critical_missing" else [], [])
    storage = Storage([job])

    class Gateway(OptionalGateway):
        async def complete(self, stage, messages, **kwargs):
            self.calls.append(stage)
            if stage == "evidenceVerifier":
                return '{"checks":[{"id":"G1","status":"search_needed"}]}'
            if stage == "auditor":
                if purpose.startswith("critical") or purpose == "judge_final_invalid" and self.calls.count("auditor") > 1:
                    return "bad json"
                result = reviewed_fixture()
                if self.calls.count("auditor") == 1:
                    result["judgeRequest"] = pair_fixture()
                else:
                    assert "judgeReview" in messages[-1]["content"]
                return json.dumps(result)
            if stage == "criticalReviewer":
                return json.dumps(reviewed_fixture())
            if stage == "judge":
                return json.dumps(output_fixture(json.loads(messages[1]["content"])))
            raise AssertionError(stage)

    gateway = Gateway()
    job["modelState"] = gateway.pinned_state()
    job["checkpoint"] = make_checkpoint(job, "review", tool_records=[], evidence=evidence, draft="草稿[S1]", pipeline_state=prepared.to_state())
    if purpose == "judge_override":
        job["humanOverride"] = {"decision": "保留人工判断"}
    await ResearchService(storage, gateway, lambda *_: asyncio.sleep(0))._run(job)
    saved = storage.jobs[job["id"]]
    if purpose in {"critical_missing", "judge_final_invalid"}:
        assert saved["status"] == "failed" and "criticalReviewer" not in gateway.calls
        assert "result" not in saved
    else:
        assert saved["status"] == "completed", saved.get("error")
        assert "judgeRequest" not in saved["result"]
        if purpose == "criticalReviewer":
            assert gateway.calls == ["auditor"] * 3 + ["criticalReviewer"]
        elif purpose == "judge":
            assert gateway.calls == ["auditor", "judge", "auditor"]
            assert saved["judgeReview"]["status"] == "advisory-needs-review"
        else:
            assert gateway.calls == ["auditor", "auditor"]
            assert saved["humanOverride"] == job["humanOverride"]
            assert saved["judgeReview"]["reason"] == "human_override_preserved"


def test_invalid_action_plus_cutoff_failure_does_not_qualify_for_escalation():
    value = reviewed_fixture()
    value["decision"].update(action="invalid", dataAsOf="2026-01-01")
    with pytest.raises(ValueError) as error:
        validate_review(json.dumps(value), mode="B", cutoff=CUTOFF, evidence=evidence_fixture()[1], gaps=[])
    assert getattr(error.value, "kind", "validation") == "validation"


@pytest.mark.asyncio
async def test_restart_reuses_completed_judge_and_saved_audit_without_dispatch():
    job = _job()
    sources, evidence = evidence_fixture()
    prepared = PipelineResult(sources, evidence, [], [], [], [])
    storage = Storage([job])

    class Gateway(OptionalGateway):
        async def complete(self, purpose, messages, **kwargs):
            if purpose == "auditor":
                self.calls.append(purpose)
                assert "judgeReview" in messages[-1]["content"]
                return json.dumps(reviewed_fixture())
            return await super().complete(purpose, messages, **kwargs)

    gateway = Gateway()
    job["modelState"] = gateway.pinned_state()
    job["checkpoint"] = make_checkpoint(job, "review", tool_records=[], evidence=evidence, draft="草稿[S1]", pipeline_state=prepared.to_state())
    saved = reviewed_fixture() | {"judgeRequest": pair_fixture()}
    job["checkpoint"].update(preJudgeReview=saved, preJudgeReviewHash=digest(saved))
    packet = packet_fixture()
    await IndependentReviewService(storage, gateway).run(job, "judge", packet, "system", lambda raw: validate_judge(raw, packet))
    service = ResearchService(storage, gateway, lambda *_: asyncio.sleep(0))
    await service.start()
    await asyncio.gather(*tuple(service.tasks.values()))
    assert gateway.calls == ["judge", "auditor"]
    assert storage.jobs[job["id"]]["status"] == "completed"
