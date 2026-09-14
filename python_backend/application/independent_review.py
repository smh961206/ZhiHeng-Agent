"""Persist-before-dispatch sessions for optional independent model stages."""
from __future__ import annotations

import asyncio
import json
from contextlib import nullcontext
from copy import deepcopy
from typing import Callable

from ..domain.independent_review import clean_context, digest
from .ports import ModelGatewayPort, StoragePort
from .prompt_governance import build_prompt_plan
from .recovery import resume_scope


class IndependentStateError(ValueError):
    def __init__(self) -> None:
        super().__init__("独立复核状态未确认、输入或配置已变化；不能自动重复请求，请新建研究")


def independent_scope(job: dict) -> str:
    return digest({"researchScope": resume_scope(job), "humanOverride": job.get("humanOverride")})


def assert_independent_recovery(job: dict) -> None:
    state = job.get("flagshipState")
    if state is None:
        return
    try:
        if state["version"] != 2 or state["jobId"] != job["id"] or state["cutoff"] != job["input"]["researchCutoff"]:
            raise IndependentStateError()
        if (state["modelHash"] != digest(job.get("modelState")) or state["scopeHash"] != independent_scope(job)
                or not isinstance(state["sessions"], dict)):
            raise IndependentStateError()
        for purpose, session in state["sessions"].items():
            if (purpose not in {"criticalReviewer", "judge"} or session["status"] != "completed"
                    or session["inputHash"] != digest(session["packet"]) or session["outcomeHash"] != digest(session["outcome"])
                    or session["profileHash"] != digest(session["profile"])):
                raise IndependentStateError()
            if session["packet"]["cutoff"] != state["cutoff"]:
                raise IndependentStateError()
            assignments = job["modelState"]["assignments"][purpose]
            if session["profile"]["assignment"] not in assignments or session["profile"]["configurationFingerprint"] != job["modelState"]["configurationFingerprint"]:
                raise IndependentStateError()
    except (KeyError, TypeError, ValueError) as error:
        raise IndependentStateError() from error


class IndependentReviewService:
    def __init__(self, storage: StoragePort, gateway: ModelGatewayPort) -> None:
        self.storage, self.gateway = storage, gateway

    @staticmethod
    def enabled(job: dict, purpose: str) -> bool:
        return bool(job.get("modelState", {}).get("assignments", {}).get(purpose))

    async def run(self, job: dict, purpose: str, packet: dict, system: str, validate: Callable[[str], dict]) -> dict:
        if not self.enabled(job, purpose):
            raise ValueError("独立复核环节未配置")
        assert_independent_recovery(job)
        packet = clean_context(packet)
        if packet.get("cutoff") != job["input"]["researchCutoff"] or len(json.dumps(packet, ensure_ascii=False)) > 220_000:
            raise ValueError("独立复核输入时点或安全窗口无效")
        state = job.setdefault("flagshipState", {"version": 2, "jobId": job["id"], "cutoff": job["input"]["researchCutoff"],
                                                 "modelHash": digest(job["modelState"]), "scopeHash": independent_scope(job), "sessions": {}})
        previous = state["sessions"].get(purpose)
        if previous:
            if previous["inputHash"] != digest(packet):
                raise IndependentStateError()
            return validate(json.dumps(previous["outcome"], ensure_ascii=False))
        selector = getattr(self.gateway, "optional_profile", None)
        if not callable(selector):
            raise ValueError("模型网关不支持安全独立复核")
        profile = selector(purpose)
        if (profile["assignment"] not in job["modelState"]["assignments"][purpose]
                or profile["configurationFingerprint"] != job["modelState"]["configurationFingerprint"]):
            raise IndependentStateError()
        session = {"status": "reserved", "packet": deepcopy(packet), "inputHash": digest(packet),
                   "profile": profile, "profileHash": digest(profile)}
        state["sessions"][purpose] = session
        # If this write is uncertain, never send the model request.
        await self.storage.save_job(job)
        scope_factory = getattr(self.gateway, "job_scope", None)
        scope = scope_factory(job["id"]) if callable(scope_factory) else nullcontext()
        try:
            with scope:
                prompt_id = {"criticalReviewer": "critical-reviewer", "judge": "evidence-judge"}[purpose]
                prompt = build_prompt_plan(
                    prompt_id,
                    [{"role": "system", "content": system},
                     {"role": "user", "content": json.dumps(packet, ensure_ascii=False)}],
                    required_complete=True,
                    stats={
                        "evidenceBlocks": len(packet.get("evidence", [])),
                        "calculationCount": len(packet.get("tools", [])),
                    },
                )
                raw = await self.gateway.complete(
                    purpose, prompt.messages, stream=False, max_tokens=8000, pinned_profile=profile,
                    prompt_context=prompt.telemetry,
                )
        except (Exception, asyncio.CancelledError):
            session["status"] = "uncertain"
            await self.storage.save_job(job)
            raise
        try:
            if not isinstance(raw, str):
                raise ValueError("独立复核输出无效")
            outcome = clean_context(validate(raw))
        except ValueError:
            session["status"] = "rejected"
            await self.storage.save_job(job)
            raise
        session.update(status="completed", outcome=outcome, outcomeHash=digest(outcome))
        try:
            await self.storage.save_job(job)
        except Exception:
            session["status"] = "uncertain"
            raise IndependentStateError() from None
        return deepcopy(outcome)
