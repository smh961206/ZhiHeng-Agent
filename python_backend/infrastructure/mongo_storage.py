from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

import gridfs
from pymongo import DESCENDING, MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..domain.contracts import ApiError
from ..domain.model_cache import model_cache_analytics
from ..domain.models import validate_job_record


class MongoStorage:
    def __init__(self, uri: str = "mongodb://127.0.0.1:27017", database: str = "zhiheng_agent") -> None:
        self.client: MongoClient = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, w=1, journal=True)
        self.db = self.client[database]
        self.jobs = self.db.jobs
        self.deleted = self.db.deleted_jobs
        self.bucket = gridfs.GridFSBucket(self.db, bucket_name="job_payloads")

    async def initialize(self) -> None:
        await asyncio.to_thread(self.db.command, {"ping": 1})
        await asyncio.to_thread(self._migrate)

    async def get_cached_report(self, key: str) -> dict[str, Any] | None:
        row = await asyncio.to_thread(
            self.db.report_cache.find_one,
            {"_id": key, "expiresAt": {"$gt": datetime.now(timezone.utc)}},
            {"source": 1},
        )
        return deepcopy(row.get("source")) if row and isinstance(row.get("source"), dict) else None

    async def save_cached_report(self, key: str, source: dict[str, Any], *, retain_seconds: int = 7 * 86400) -> None:
        if not 0 < retain_seconds <= 3650 * 86400:
            raise ValueError("数据保留时间无效")
        fetched = datetime.fromisoformat(str(source.get("fetchedAt", "")).replace("Z", "+00:00"))
        expires = fetched.astimezone(timezone.utc).timestamp() + retain_seconds
        await asyncio.to_thread(
            self.db.report_cache.replace_one,
            {"_id": key},
            {"_id": key, "source": deepcopy(source), "expiresAt": datetime.fromtimestamp(expires, timezone.utc)},
            upsert=True,
        )

    def _migrate(self) -> None:
        self.jobs.create_index([("createdAt", DESCENDING)])
        self.db.report_cache.create_index("expiresAt", expireAfterSeconds=0)
        self.db.model_calls.create_index([("jobId", 1), ("startedAt", 1)])
        records = self.db.schema_migrations
        expected = [(1, "initial_indexes"), (2, "model_call_indexes")]
        applied = list(records.find().sort("_id", 1))
        for index, row in enumerate(applied):
            if index >= len(expected) or (row["_id"], row["name"]) != expected[index]:
                raise RuntimeError("数据库结构版本超出或不匹配当前代码；禁止降级启动")
        for version, name in expected[len(applied) :]:
            records.insert_one({"_id": version, "name": name, "appliedAt": datetime.now(timezone.utc)})

    def _write(self, job: dict[str, Any], *, insert: bool = False) -> int:
        stored = deepcopy(job)
        stored.pop("liveReport", None)
        expected_revision = int(stored.get("revision", 0))
        next_revision = 0 if insert else expected_revision + 1
        stored["revision"] = next_revision
        payload_id = self.bucket.upload_from_stream(f"{job['id']}.json", json.dumps(stored, ensure_ascii=False, separators=(",", ":")).encode())
        input_data = stored.get("input", {})
        omitted = {"input", "result", "events", "draft", "marketData", "checkpoint", "knowledgeUsage", "modelState", "budgetState", "flagshipState"}
        summary = {key: value for key, value in stored.items() if key not in omitted}
        entry = {
            "_id": job["id"],
            **summary,
            "question": input_data.get("question", ""),
            "sourceCount": len(input_data.get("sources", [])),
            "payloadId": payload_id,
            "revision": next_revision,
        }
        previous = None
        try:
            if insert:
                if self.deleted.find_one({"_id": job["id"]}):
                    raise ApiError(409, "研究已删除，不能恢复本次提交")
                self.jobs.insert_one(entry)
            else:
                previous = self.jobs.find_one({"_id": job["id"]}, {"payloadId": 1, "revision": 1, "cancelRequestedAt": 1})
                if previous and previous.get("cancelRequestedAt"):
                    entry["cancelRequestedAt"] = previous["cancelRequestedAt"]
                revision_filter: dict[str, Any] = {"_id": job["id"], "revision": expected_revision}
                if expected_revision == 0:
                    revision_filter = {"_id": job["id"], "$or": [{"revision": 0}, {"revision": {"$exists": False}}]}
                result = self.jobs.replace_one(revision_filter, entry)
                if result.matched_count != 1:
                    raise ApiError(409, "研究记录已被其他执行更新，请刷新后重试")
        except (DuplicateKeyError, ApiError):
            self.bucket.delete(payload_id)
            raise
        old_payload = previous.get("payloadId") if previous else None
        if old_payload and old_payload != payload_id:
            try:
                self.bucket.delete(old_payload)
            except Exception:
                pass
        return next_revision

    async def create_job(self, job: dict[str, Any]) -> None:
        job["revision"] = await asyncio.to_thread(self._write, validate_job_record(job), insert=True)

    async def save_job(self, job: dict[str, Any]) -> None:
        current = job.get("plan", {}).get("executionCompatibilityVersion") == 1
        job["revision"] = await asyncio.to_thread(self._write, validate_job_record(job) if current else job)

    def _get(self, job_id: str) -> dict[str, Any] | None:
        entry = self.jobs.find_one({"_id": job_id})
        if not entry:
            return None
        stream = self.bucket.open_download_stream(entry["payloadId"])
        return json.loads(stream.read().decode())

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        return await asyncio.to_thread(self._get, job_id)

    async def list_jobs(self) -> list[dict[str, Any]]:
        return await asyncio.to_thread(lambda: list(self.jobs.find({}, {"_id": 0, "payloadId": 0, "submission": 0}).sort("createdAt", -1)))

    async def ping(self) -> None:
        await asyncio.to_thread(self.db.command, {"ping": 1})

    async def delete_job(self, job_id: str) -> None:
        def remove() -> None:
            entry = self.jobs.find_one({"_id": job_id}, {"status": 1})
            if entry and entry.get("status") in {"queued", "running"}:
                raise ApiError(409, "研究正在运行，请先取消并等待结束后再删除")
            self.deleted.update_one({"_id": job_id}, {"$setOnInsert": {"deletedAt": datetime.now(timezone.utc)}}, upsert=True)
            self.jobs.delete_one({"_id": job_id})
            self.db.model_calls.delete_many({"jobId": job_id})
            for item in self.db["job_payloads.files"].find({"filename": f"{job_id}.json"}, {"_id": 1}):
                try:
                    self.bucket.delete(item["_id"])
                except Exception:
                    pass

        await asyncio.to_thread(remove)

    async def is_job_deleted(self, job_id: str) -> bool:
        return await asyncio.to_thread(lambda: self.deleted.find_one({"_id": job_id}, {"_id": 1}) is not None)

    async def request_cancel(self, job_id: str) -> None:
        result = await asyncio.to_thread(
            self.jobs.update_one,
            {"_id": job_id, "status": {"$in": ["queued", "running"]}},
            {"$set": {"cancelRequestedAt": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            entry = await asyncio.to_thread(self.jobs.find_one, {"_id": job_id}, {"_id": 1})
            if not entry:
                raise ApiError(404, "任务不存在")

    async def is_cancel_requested(self, job_id: str) -> bool:
        entry = await asyncio.to_thread(self.jobs.find_one, {"_id": job_id}, {"cancelRequestedAt": 1})
        return bool(entry and entry.get("cancelRequestedAt"))

    async def clear_cancel(self, job_id: str) -> None:
        await asyncio.to_thread(self.jobs.update_one, {"_id": job_id}, {"$unset": {"cancelRequestedAt": ""}})

    async def list_recoverable_jobs(self) -> list[dict[str, Any]]:
        rows = await asyncio.to_thread(
            lambda: list(
                self.jobs.find(
                    {
                        "status": {"$in": ["queued", "running"]},
                        "$or": [{"lease.expiresAt": {"$lt": datetime.now(timezone.utc)}}, {"lease": {"$exists": False}}],
                    },
                    {"_id": 1},
                )
            )
        )
        jobs = [await self.get_job(str(row["_id"])) for row in rows]
        return [job for job in jobs if job]

    async def claim_job(self, job_id: str, worker_id: str, lease_seconds: int) -> bool:
        from datetime import timedelta

        now_value = datetime.now(timezone.utc)
        result = await asyncio.to_thread(
            self.jobs.find_one_and_update,
            {
                "_id": job_id,
                "$or": [
                    {"lease.owner": worker_id},
                    {"lease.expiresAt": {"$lt": now_value}},
                    {"lease": {"$exists": False}},
                ],
            },
            {"$set": {"lease": {"owner": worker_id, "expiresAt": now_value + timedelta(seconds=lease_seconds)}}},
            return_document=ReturnDocument.AFTER,
        )
        return result is not None

    async def release_job(self, job_id: str, worker_id: str) -> None:
        await asyncio.to_thread(self.jobs.update_one, {"_id": job_id, "lease.owner": worker_id}, {"$unset": {"lease": ""}})

    async def record_model_call(self, record: dict[str, Any]) -> None:
        value = deepcopy(record)
        call_id = value.get("id")
        if isinstance(call_id, str) and call_id:
            await asyncio.to_thread(self.db.model_calls.replace_one, {"id": call_id}, value, upsert=True)
        else:
            await asyncio.to_thread(self.db.model_calls.insert_one, value)

    async def model_cost_summary(self, job_id: str) -> dict[str, Any]:
        rows = await asyncio.to_thread(lambda: list(self.db.model_calls.find({"jobId": job_id}, {"_id": 0, "prompt": 0, "messages": 0})))
        token_keys = ("inputTokens", "outputTokens", "totalTokens", "cachedInputTokens")

        def summarize(items: list[dict[str, Any]]) -> dict[str, Any]:
            known: dict[str, float] = {}
            usage: dict[str, dict[str, int | None]] = {}
            for key in token_keys:
                values = [row.get("usage", {}).get(key) for row in items]
                valid = [value for value in values if isinstance(value, int) and not isinstance(value, bool) and value >= 0]
                usage[key] = {"knownTotal": sum(valid) if valid else None, "unknownCalls": len(values) - len(valid)}
            for row in items:
                details = row.get("usage", {})
                cost, currency = details.get("cost"), details.get("currency")
                if isinstance(cost, (int, float)) and not isinstance(cost, bool) and isinstance(currency, str):
                    known[currency] = known.get(currency, 0.0) + float(cost)
            unknown = sum(
                not isinstance(row.get("usage", {}).get("cost"), (int, float))
                or isinstance(row.get("usage", {}).get("cost"), bool)
                or not isinstance(row.get("usage", {}).get("currency"), str)
                for row in items
            )
            complete = (
                bool(items)
                and unknown == 0
                and len(known) == 1
                and all(row.get("status") != "started" and row.get("transportAttempts") == 1 for row in items)
            )
            return {
                "calls": len(items),
                "usage": usage,
                "billing": [{"currency": currency, "knownEstimatedCost": amount} for currency, amount in sorted(known.items())],
                "unknownBillingCalls": unknown,
                "complete": complete,
            }

        summary = summarize(rows)
        purposes = list(dict.fromkeys(str(row.get("purpose")) for row in rows if row.get("purpose")))
        profiles = list(dict.fromkeys(str(row.get("profile")) for row in rows if row.get("profile")))
        unknown_attempts = sum(not isinstance(row.get("transportAttempts"), int) for row in rows)
        unpriced_attempts = sum(
            max(0, row["transportAttempts"] - (1 if isinstance(row.get("usage", {}).get("cost"), (int, float)) else 0))
            for row in rows
            if isinstance(row.get("transportAttempts"), int)
        )
        observations = [
            {
                "samples": row["samples"],
                "unknownCalls": row["unknownCalls"],
                "observedHitRatio": row["observedHitRatio"],
                "observedTokenRatio": row["observedTokenRatio"],
            }
            for row in model_cache_analytics(rows)
        ]
        prompt_ids = list(
            dict.fromkeys(
                str(row.get("promptContext", {}).get("promptId"))
                for row in rows
                if row.get("promptContext", {}).get("promptId")
            )
        )
        prompt_efficiency = []
        for prompt_id in prompt_ids:
            prompt_rows = [row for row in rows if row.get("promptContext", {}).get("promptId") == prompt_id]
            sizes = [
                row["promptContext"].get("serializedCharacters")
                for row in prompt_rows
                if isinstance(row.get("promptContext", {}).get("serializedCharacters"), int)
            ]
            prompt_efficiency.append(
                {
                    "promptId": prompt_id,
                    "calls": len(prompt_rows),
                    "averageSerializedCharacters": round(sum(sizes) / len(sizes)) if sizes else None,
                    "requiredIncompleteCalls": sum(
                        row.get("promptContext", {}).get("requiredComplete") is False for row in prompt_rows
                    ),
                }
            )
        return {
            "version": 2,
            **summary,
            "byPurpose": [{"purpose": purpose, **summarize([row for row in rows if row.get("purpose") == purpose])} for purpose in purposes],
            "byModel": [
                {
                    "profile": profile if profile.startswith("configured-") else None,
                    "calls": model_summary["calls"],
                    "billing": model_summary["billing"],
                }
                for profile in profiles
                for model_summary in [summarize([row for row in rows if row.get("profile") == profile])]
            ],
            "cache": {
                "inputTokens": summary["usage"]["inputTokens"]["knownTotal"],
                "cachedInputTokens": summary["usage"]["cachedInputTokens"]["knownTotal"],
                "unknownCalls": summary["usage"]["cachedInputTokens"]["unknownCalls"],
            },
            "unpricedAttempts": unpriced_attempts,
            "unknownAttemptCalls": unknown_attempts,
            "knownCosts": [{"currency": row["currency"], "amount": row["knownEstimatedCost"]} for row in summary["billing"]],
            "unknownCalls": summary["unknownBillingCalls"],
            "cacheObservations": observations,
            "promptEfficiency": prompt_efficiency,
            "notice": "费用为已记录模型调用的估算；未知用量或价格不会记为零，且不包含外部数据费用。",
        }

    async def close(self) -> None:
        await asyncio.to_thread(self.client.close)
