from __future__ import annotations

import os
import uuid
from copy import deepcopy

import pytest

from python_backend.domain.contracts import ApiError, make_plan, now, validate_payload
from python_backend.domain.model_cache import model_prefix_fingerprint
from python_backend.infrastructure.mongo_storage import MongoStorage

pytestmark = pytest.mark.skipif(os.getenv("MONGO_INTEGRATION") != "1", reason="requires an explicitly selected MongoDB test database")


def _job(job_id: str) -> dict:
    input_data = validate_payload({"question": "研究 AAPL", "mode": "B", "researchCutoff": "2025-01-01T00:00:00Z"})
    return {
        "id": job_id,
        "input": input_data,
        "mode": "B",
        "status": "queued",
        "createdAt": now(),
        "plan": make_plan(input_data, "B"),
        "events": [],
        "submission": {"fingerprint": "a" * 64},
        "revision": 0,
    }


@pytest.mark.asyncio
async def test_mongo_revision_payload_cleanup_lease_and_cost_summary():
    database = "zhiheng_integration_" + uuid.uuid4().hex
    storage = MongoStorage(os.getenv("MONGO_INTEGRATION_URI", "mongodb://127.0.0.1:27017"), database)
    try:
        await storage.initialize()
        job = _job("job-1")
        await storage.create_job(job)
        stale = deepcopy(job)
        job["events"].append({"time": now(), "type": "progress"})
        await storage.save_job(job)
        with pytest.raises(ApiError, match="其他执行更新"):
            await storage.save_job(stale)
        assert storage.db["job_payloads.files"].count_documents({"filename": "job-1.json"}) == 1

        assert await storage.claim_job("job-1", "worker-a", 60) is True
        assert await storage.claim_job("job-1", "worker-b", 60) is False
        await storage.release_job("job-1", "worker-a")
        assert await storage.claim_job("job-1", "worker-b", 60) is True

        await storage.request_cancel("job-1")
        assert await storage.is_cancel_requested("job-1") is True
        loaded = await storage.get_job("job-1")
        assert loaded is not None
        await storage.release_job("job-1", "worker-b")
        await storage.save_job(loaded)
        assert await storage.is_cancel_requested("job-1") is True
        await storage.clear_cancel("job-1")
        assert await storage.is_cancel_requested("job-1") is False

        await storage.record_model_call({"jobId": "job-1", "usage": {"cost": 0.25, "currency": "USD"}})
        await storage.record_model_call({"jobId": "job-1", "usage": {"cost": None, "currency": None}})
        summary = await storage.model_cost_summary("job-1")
        assert summary["knownCosts"] == [{"currency": "USD", "amount": 0.25}]
        assert summary["unknownCalls"] == 1 and summary["complete"] is False

        request = {"purpose": "researcher", "messages": [{"role": "system", "content": "stable"}]}
        profile = {"id": "configured-main", "model": "opaque", "protocol": "openai-chat-completions"}
        cache = model_prefix_fingerprint(request, profile, "a" * 64)
        call = {
            "id": "cache-call-1",
            "jobId": "job-cache",
            "profile": "configured-main",
            "purpose": "researcher",
            "status": "started",
            "transportAttempts": 0,
            "finishedAt": now(),
            "cache": cache,
            "usage": {"inputTokens": None, "cachedInputTokens": None, "cost": None, "currency": None},
        }
        await storage.record_model_call(call)
        await storage.record_model_call(
            {
                **call,
                "status": "succeeded",
                "transportAttempts": 1,
                "usage": {"inputTokens": 100, "cachedInputTokens": 80, "cost": 0.1, "currency": "USD"},
                "tokenSources": {"inputTokens": "provider", "cachedInputTokens": "provider"},
            }
        )
        cache_summary = await storage.model_cost_summary("job-cache")
        assert cache_summary["calls"] == 1 and cache_summary["complete"] is True
        assert cache_summary["byModel"] == [{"profile": "configured-main", "calls": 1, "billing": [{"currency": "USD", "knownEstimatedCost": 0.1}]}]
        assert cache_summary["cacheObservations"] == [
            {"samples": 1, "unknownCalls": 0, "observedHitRatio": 1.0, "observedTokenRatio": 0.8}
        ]

        cached_source = {"type": "data-archive", "fetchedAt": now(), "text": "{}", "sha256": "digest"}
        await storage.save_cached_report("archive-key", cached_source, retain_seconds=60)
        assert await storage.get_cached_report("archive-key") == cached_source

        loaded = await storage.get_job("job-1")
        assert loaded is not None
        loaded["status"] = "completed"
        await storage.save_job(loaded)
        await storage.delete_job("job-1")
        assert await storage.is_job_deleted("job-1") is True
        with pytest.raises(ApiError, match="已删除"):
            await storage.create_job(_job("job-1"))
    finally:
        await __import__("asyncio").to_thread(storage.client.drop_database, database)
        await storage.close()
