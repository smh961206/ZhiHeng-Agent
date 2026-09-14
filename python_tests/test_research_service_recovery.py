from __future__ import annotations

import asyncio
import json
from copy import deepcopy

import pytest

from python_backend.application.recovery import make_checkpoint
from python_backend.application.research_pipeline import PipelineResult
from python_backend.application.research_service import ResearchService
from python_backend.domain.contracts import make_plan, now, validate_payload


class Storage:
    def __init__(self, jobs):
        self.jobs = {job["id"]: deepcopy(job) for job in jobs}
        self.claims = 0

    async def list_recoverable_jobs(self):
        return [deepcopy(job) for job in self.jobs.values() if job["status"] in {"queued", "running"}]

    async def save_job(self, job):
        job["revision"] = job.get("revision", 0) + 1
        self.jobs[job["id"]] = deepcopy(job)

    async def get_job(self, job_id):
        return deepcopy(self.jobs.get(job_id))

    async def claim_job(self, *_):
        self.claims += 1
        return True

    async def release_job(self, *_):
        return None


class Gateway:
    researcher_calls = 0

    async def complete(self, purpose, messages, **options):
        if purpose == "researcher":
            self.researcher_calls += 1
            async def stream():
                yield "should not run"
            return stream()
        payload = json.loads(messages[1]["content"])
        return json.dumps(
            {
                "report": payload["draft"],
                "audit": "审计通过",
                "decision": {
                    "action": payload["requiredFallback"]["action"],
                    "confidence": payload["requiredFallback"]["confidence"],
                    "summary": "仅覆盖证据范围",
                    "falsifiers": ["条件一", "条件二", "条件三"],
                    "dataAsOf": payload["researchCutoff"],
                },
            },
            ensure_ascii=False,
        )


class Pipeline:
    calls = 0

    async def prepare(self, _):
        self.calls += 1
        return PipelineResult([], [], [], [], ["缺少证据"], [])


def _job(status="running"):
    input_data = validate_payload({"question": "研究 AAPL", "mode": "B", "researchCutoff": "2025-01-01T00:00:00Z"})
    job = {
        "id": "resume-job",
        "input": input_data,
        "mode": "B",
        "status": status,
        "createdAt": now(),
        "plan": make_plan(input_data, "B"),
        "events": [],
        "submission": {"fingerprint": "a" * 64},
        "revision": 0,
    }
    return job


@pytest.mark.asyncio
async def test_startup_resumes_review_checkpoint_without_replaying_researcher():
    job = _job()
    saved_pipeline = PipelineResult([], [], [], [], ["原检查点缺少证据"], [])
    job["checkpoint"] = make_checkpoint(
        job, "review", tool_records=[], evidence=[], draft="# 已保存草稿", pipeline_state=saved_pipeline.to_state()
    )
    storage, gateway = Storage([job]), Gateway()
    pipeline = Pipeline()
    service = ResearchService(storage, gateway, lambda *_: asyncio.sleep(0), pipeline=pipeline, lease_seconds=15)
    await service.start()
    await asyncio.gather(*tuple(service.tasks.values()))
    assert storage.jobs[job["id"]]["status"] == "completed"
    assert gateway.researcher_calls == 0
    assert pipeline.calls == 0
    assert storage.claims >= 1


@pytest.mark.asyncio
async def test_startup_fails_running_job_without_valid_checkpoint():
    job = _job()
    storage = Storage([job])
    service = ResearchService(storage, Gateway(), lambda *_: asyncio.sleep(0), pipeline=Pipeline())
    await service.start()
    assert storage.jobs[job["id"]]["status"] == "failed"
    assert not service.tasks


@pytest.mark.asyncio
async def test_graceful_shutdown_keeps_writer_job_resumable_instead_of_cancelling_it():
    job = _job(status="queued")
    storage = Storage([job])
    entered = asyncio.Event()

    class SlowGateway:
        async def complete(self, purpose, _messages, **options):
            if purpose == "researcher" and not options.get("stream"):
                return json.dumps({"objective": "研究", "hypotheses": [], "steps": ["核对"], "calculations": []}, ensure_ascii=False)
            if purpose == "writer":
                async def stream():
                    entered.set()
                    yield "草稿"
                    await asyncio.Event().wait()

                return stream()
            raise AssertionError("shutdown test should not reach audit")

    service = ResearchService(storage, SlowGateway(), lambda *_: asyncio.sleep(0), pipeline=Pipeline(), lease_seconds=15)
    service._launch(job)
    await asyncio.wait_for(entered.wait(), timeout=1)
    await service.shutdown()
    saved = storage.jobs[job["id"]]
    assert saved["status"] == "queued"
    assert saved["checkpoint"]["phase"] == "research"
    assert saved.get("finishedAt") is None and saved.get("error") is None
