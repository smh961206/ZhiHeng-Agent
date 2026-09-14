from __future__ import annotations

import json
from contextlib import contextmanager
from copy import deepcopy

import pytest

from python_backend.application.research_pipeline import PipelineResult
from python_backend.application.research_service import ResearchService
from python_backend.domain.contracts import make_plan, now, validate_payload


class _Storage:
    pass


class _Gateway:
    def __init__(self, outputs: list[str]):
        self.outputs = iter(outputs)
        self.purposes: list[str] = []

    async def complete(self, purpose, *_args, **_kwargs):
        self.purposes.append(purpose)
        return next(self.outputs)


async def _publish(*_args):
    return None


@pytest.mark.asyncio
async def test_evidence_verifier_accepts_only_literal_existing_block_quotes():
    quote = "公司在截至报告期末披露营业收入同比增长，并明确说明统计口径与合并范围保持一致。"
    gateway = _Gateway(
        [json.dumps({"checks": [{"id": "G1", "status": "supported", "sourceId": "S1", "blockId": "b1", "quote": quote}]}, ensure_ascii=False)]
    )
    service = ResearchService(_Storage(), gateway, _publish)
    result = await service._verify_evidence_gaps(
        {"id": "job-1"},
        {"gaps": ["核对收入口径"], "evidence": [{"sourceId": "S1", "blockId": "b1", "text": "前文。" + quote + "后文。"}]},
    )
    assert result["status"] == "completed"
    assert result["checks"][0]["sourceId"] == "S1"
    assert gateway.purposes == ["evidenceVerifier"]


@pytest.mark.asyncio
async def test_evidence_verifier_keeps_gap_when_model_invents_quote():
    invalid = json.dumps(
        {"checks": [{"id": "G1", "status": "supported", "sourceId": "S1", "blockId": "b1", "quote": "这是一段模型编造且不在证据中的足够长连续文字，用于验证系统不会接受。"}]},
        ensure_ascii=False,
    )
    gateway = _Gateway([invalid, invalid])
    service = ResearchService(_Storage(), gateway, _publish)
    result = await service._verify_evidence_gaps(
        {"id": "job-1"},
        {"gaps": ["核对收入口径"], "evidence": [{"sourceId": "S1", "blockId": "b1", "text": "真实证据正文，不包含模型声称的文字。"}]},
    )
    assert result["status"] == "failed" and result["checks"] == []


@pytest.mark.asyncio
async def test_complete_research_flow_calls_every_active_research_model_stage():
    quote = "公司在截至报告期末披露营业收入同比增长，并明确说明统计口径与合并范围保持一致。"

    class Storage:
        def __init__(self):
            self.jobs = {}

        async def claim_job(self, *_args):
            return True

        async def release_job(self, *_args):
            return None

        async def save_job(self, job):
            job["revision"] = job.get("revision", 0) + 1
            self.jobs[job["id"]] = deepcopy(job)

        async def get_job(self, job_id):
            return deepcopy(self.jobs.get(job_id))

    class Pipeline:
        async def prepare(self, _input):
            return PipelineResult(
                [],
                [{"sourceId": "S1", "blockId": "b1", "security": "US:AAPL", "text": "前文。" + quote + "后文。"}],
                [],
                [],
                ["核对收入口径"],
                [],
            )

    class Gateway:
        def __init__(self):
            self.purposes = []
            self.job_ids = []
            self.current_job = None

        @contextmanager
        def job_scope(self, job_id):
            previous, self.current_job = self.current_job, job_id
            try:
                yield
            finally:
                self.current_job = previous

        async def complete(self, purpose, messages, **_options):
            self.purposes.append(purpose)
            self.job_ids.append(self.current_job)
            if purpose == "researcher":
                return json.dumps({"objective": "核对收入", "hypotheses": [], "steps": ["核对"], "calculations": []}, ensure_ascii=False)
            if purpose == "evidenceVerifier":
                return json.dumps(
                    {"checks": [{"id": "G1", "status": "supported", "sourceId": "S1", "blockId": "b1", "quote": quote}]},
                    ensure_ascii=False,
                )
            if purpose == "writer":
                async def stream():
                    yield "# 研究报告\n\n公司披露了相关收入口径信息[S1]。"

                return stream()
            if purpose == "auditor":
                payload = json.loads(messages[1]["content"])
                return json.dumps(
                    {
                        "report": payload["draft"],
                        "audit": "引用与缺口已核对",
                        "decision": {
                            "action": payload["requiredFallback"]["action"],
                            "confidence": payload["requiredFallback"]["confidence"],
                            "summary": "结论限于当前证据范围",
                            "falsifiers": ["后续披露改变统计口径", "审计报告否定相关数据", "主体范围发生重大变化"],
                            "dataAsOf": payload["researchCutoff"],
                        },
                    },
                    ensure_ascii=False,
                )
            raise AssertionError(f"unexpected purpose: {purpose}")

    input_data = validate_payload({"question": "研究 AAPL", "mode": "B", "researchCutoff": "2025-01-01T00:00:00Z"})
    job = {
        "id": "full-active-stage-job",
        "input": input_data,
        "mode": "B",
        "status": "queued",
        "createdAt": now(),
        "plan": make_plan(input_data, "B"),
        "events": [],
        "submission": {"fingerprint": "a" * 64},
        "revision": 0,
    }
    storage, gateway = Storage(), Gateway()
    service = ResearchService(storage, gateway, _publish, pipeline=Pipeline(), lease_seconds=15)

    await service._run(job)

    saved = storage.jobs[job["id"]]
    assert saved["status"] == "completed"
    assert saved["evidenceVerification"]["status"] == "completed"
    assert gateway.purposes == ["researcher", "evidenceVerifier", "writer", "auditor"]
    assert gateway.job_ids == [job["id"]] * 4
