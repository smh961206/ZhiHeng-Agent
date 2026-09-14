"""Exceptional review admission and immutable, point-in-time evidence packets."""
from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .evidence import evidence_blocks, usable_evidence

PRIVATE_KEYS = {"reasoning_content", "reasoning", "chainOfThought", "hiddenReasoning", "messages", "apiKey", "api_key", "authorization", "prompt", "systemPrompt"}


def clean_context(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: clean_context(item) for key, item in value.items() if key not in PRIVATE_KEYS}
    if isinstance(value, list):
        return [clean_context(item) for item in value]
    return deepcopy(value)


def digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def timestamp(value: Any) -> datetime:
    if not isinstance(value, str) or len(value) < 10:
        raise ValueError("独立复核缺少可验证发布日期")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if len(value) != 10 and parsed.tzinfo is None:
        raise ValueError("独立复核时间须包含时区")
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed


def eligible(purpose: str, mode: str, *, gaps: list[str], evidence: list[dict], failures: list[str] | None = None,
             conflict: dict | None = None, provider_failure: bool = False, tools_pending: bool = False) -> bool:
    if purpose not in {"criticalReviewer", "judge"} or mode not in {"B", "C", "D", "E", "F"}:
        return False
    if gaps or not evidence or provider_failure or tools_pending:
        return False
    if purpose == "criticalReviewer":
        return sum(kind in {"format", "semantic"} for kind in (failures or [])) >= 2
    return bool(conflict and conflict.get("material") is True and conflict.get("completed") is True)


def independent_packet(cutoff: str, sources: list[dict], evidence: list[dict], tools: list[dict], conclusions: list[str]) -> dict[str, Any]:
    boundary = timestamp(cutoff)
    source_map = {source.get("id"): source for source in sources}
    if len(source_map) != len(sources) or not evidence or not conclusions:
        raise ValueError("独立复核缺少唯一、完整证据")
    if any(not isinstance(item, str) or not item.strip() or len(item) > 80_000 for item in conclusions):
        raise ValueError("独立复核结论无效")
    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in evidence:
        ref = (item.get("sourceId", ""), item.get("blockId", ""))
        source = source_map.get(ref[0])
        if not source or not all(ref) or ref in seen or timestamp(source.get("publishedAt")) > boundary:
            raise ValueError("独立复核证据无法在原截止时点唯一定位")
        blocks = [block for block in evidence_blocks(source) if block.get("id") == ref[1]]
        if (len(blocks) != 1 or not usable_evidence(source, blocks[0]) or source.get("truncated")
                or blocks[0].get("method") == "ocr" or item.get("referenceAmbiguous")
                or not blocks[0].get("text") or blocks[0]["text"] not in item.get("text", "")):
            raise ValueError("独立复核不能使用缺失、截断或未核验原文")
        seen.add(ref)
        entries.append({"sourceId": ref[0], "blockId": ref[1], "text": blocks[0]["text"],
                        "publishedAt": source["publishedAt"], "page": blocks[0].get("page")})
    records = clean_context(tools)
    ids = [record.get("id") for record in records]
    if len(ids) != len(set(ids)) or any(not isinstance(identity, str) or not identity for identity in ids):
        raise ValueError("独立复核计算凭证无效")
    for record in records:
        if record.get("status") != "calculated-needs-review" or record.get("output") is None:
            raise ValueError("独立复核计算尚未完成")
        basis = record.get("arguments", {}).get("basis", {})
        if any(ref.get("sourceId") not in source_map or (ref.get("sourceId"), ref.get("blockId")) not in seen
               for ref in basis.get("evidenceBlocks", [])):
            raise ValueError("独立复核计算依据未进入证据窗口")
        if any(identity not in {ref[0] for ref in seen} for identity in basis.get("sourceIds", [])):
            raise ValueError("独立复核计算来源缺失")
    packet = {"version": 1, "cutoff": cutoff, "evidence": entries, "tools": records, "conclusions": conclusions}
    if any(len(json.dumps(value, ensure_ascii=False)) > 80_000 for value in (entries, records)) or len(json.dumps(packet, ensure_ascii=False)) > 220_000:
        raise ValueError("独立复核完整证据超过安全窗口")
    return packet
