from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from ..domain.evidence import evidence_blocks, usable_evidence

EXECUTION_COMPATIBILITY = 1


def restore_legacy_research_cutoff(job: dict[str, Any]) -> bool:
    """Materialize the cutoff that the retired runtime represented as createdAt."""

    input_data = job.get("input")
    if not isinstance(input_data, dict):
        raise ValueError("研究记录缺少原始输入，无法安全重试；请修改研究输入后新建研究")
    if input_data.get("researchCutoff"):
        return False
    created_at = job.get("createdAt")
    if not isinstance(created_at, str) or not created_at.strip():
        raise ValueError("历史研究未保存截止时间，无法安全重试；请修改研究输入后新建研究")
    try:
        cutoff = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError("历史研究的创建时间无效，无法安全重试；请修改研究输入后新建研究") from error
    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=timezone.utc)
    cutoff = cutoff.astimezone(timezone.utc)
    if cutoff > datetime.now(timezone.utc):
        raise ValueError("历史研究的创建时间晚于当前时间，无法安全重试；请修改研究输入后新建研究")
    value = cutoff.isoformat().replace("+00:00", "Z")
    input_data["researchCutoff"] = value
    input_data["researchCutoffSource"] = "legacy-createdAt"
    plan = job.get("plan")
    if isinstance(plan, dict):
        plan.setdefault("researchCutoff", value)
    return True


def resume_scope(job: dict[str, Any]) -> str:
    plan, input_data = job.get("plan", {}), job.get("input", {})
    value = {
        "executionCompatibilityVersion": plan.get("executionCompatibilityVersion"),
        "contractVersion": plan.get("contractVersion"),
        "mode": job.get("mode"),
        "question": input_data.get("question"),
        "securities": input_data.get("securities"),
        "depth": input_data.get("depth"),
        "historyYears": input_data.get("historyYears"),
        "researchCutoff": input_data.get("researchCutoff"),
        "knowledgeSnapshot": plan.get("knowledgeSnapshot"),
        "modelState": job.get("modelState"),
    }
    if "promptState" in job:
        value["promptState"] = job["promptState"]
    if "contextVersion" in plan:
        value["contextVersion"] = plan["contextVersion"]
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def research_resume(job: dict[str, Any]) -> dict[str, Any] | None:
    checkpoint = job.get("checkpoint")
    if not isinstance(checkpoint, dict) or checkpoint.get("version") != 1 or checkpoint.get("scope") != resume_scope(job):
        return None
    if (
        checkpoint.get("phase") not in {"research", "review"}
        or not isinstance(checkpoint.get("toolRecords"), list)
        or not isinstance(checkpoint.get("evidence"), list)
    ):
        return None
    if checkpoint["phase"] == "review" and not str(checkpoint.get("draft", "")).strip():
        return None
    return deepcopy(checkpoint)


def make_checkpoint(
    job: dict[str, Any],
    phase: str,
    *,
    tool_records: list[dict],
    evidence: list[dict],
    draft: str = "",
    pipeline_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if phase not in {"research", "review"} or phase == "review" and not draft.strip():
        raise ValueError("检查点阶段或复核草稿无效")
    checkpoint = {
        "version": 1,
        "scope": resume_scope(job),
        "phase": phase,
        "origin": "checkpoint",
        "draft": draft,
        "toolRecords": deepcopy(tool_records),
        "evidence": deepcopy(evidence),
    }
    if pipeline_state is not None:
        checkpoint["pipelineState"] = deepcopy(pipeline_state)
    return checkpoint


def calculation_recovery(error: dict, sources: list[dict], seen: list[dict]) -> dict | None:
    if error.get("code") != "calculation_evidence":
        return None
    source_ids = list(dict.fromkeys(error.get("sourceIds", [])))
    candidates = []
    for match in seen:
        actual = [source for source in sources if source.get("id") == match.get("id")]
        if match.get("id") not in source_ids or len(actual) != 1:
            continue
        blocks = [block for block in evidence_blocks(actual[0]) if block.get("id") == match.get("blockId")]
        if len(blocks) == 1 and usable_evidence(actual[0], blocks[0]) and str(blocks[0].get("text", "")) in str(match.get("text", "")):
            candidates.append({"sourceId": match["id"], "blockId": match["blockId"], "page": match.get("page"), "text": str(match["text"])[:1000]})
    return {
        "sourceIds": source_ids,
        "candidates": candidates[-8:],
        "instruction": "只用本次已检索的可读官方片段定位；核对数值、单位和期间后再计算，证据不足时保留缺口。",
    }
