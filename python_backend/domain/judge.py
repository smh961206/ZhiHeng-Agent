"""Advisory comparison of completed conclusions; never a canonical fact writer."""
from __future__ import annotations

import json
import math
from copy import deepcopy
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .independent_review import digest, independent_packet

Text = Annotated[str, Field(min_length=1, max_length=16_000)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)


class Reference(StrictModel):
    sourceId: Text
    blockId: Text


class Basis(StrictModel):
    entity: Text
    period: Text
    currency: Text
    shareBasis: Text
    accountingScope: Text
    valuationBasis: Text


class Conclusion(StrictModel):
    id: Text
    subject: Text
    kind: Literal["claim", "valuation"]
    completed: Literal[True]
    statement: Text
    position: Literal["support", "oppose"]
    basis: Basis
    evidenceRefs: list[Reference] = Field(min_length=1, max_length=80)
    counterEvidenceRefs: list[Reference] = Field(max_length=80)
    toolCallIds: list[Text] = Field(max_length=160)

    @model_validator(mode="after")
    def unique_references(self) -> Conclusion:
        for refs in (self.evidenceRefs, self.counterEvidenceRefs):
            if len({(ref.sourceId, ref.blockId) for ref in refs}) != len(refs):
                raise ValueError("裁决证据编号重复")
        if len(set(self.toolCallIds)) != len(self.toolCallIds):
            raise ValueError("裁决工具编号重复")
        return self


class JudgeRequest(StrictModel):
    l1: Conclusion
    l2: Conclusion


class Citation(Reference):
    quote: str = Field(min_length=1, max_length=800)


class JudgeOutput(StrictModel):
    version: Literal[1]
    inputHash: str = Field(pattern=r"^[a-f0-9]{64}$")
    outcome: Literal["accept_l1", "accept_l2", "insufficient_to_decide"]
    selectedId: Text | None
    reasonCode: Literal["evidence_consistency", "calculation_consistency", "insufficient_evidence", "unresolved_counter_evidence"]
    citations: list[Citation] = Field(max_length=160)
    reviewedToolCallIds: list[Text] = Field(max_length=160)


def _valuation_interval(conclusion: dict, tools: list[dict]) -> tuple[float, float]:
    ids = conclusion["toolCallIds"]
    records = [record for record in tools if record.get("id") in ids]
    if len(ids) != 1 or len(records) != 1:
        raise ValueError("裁决须引用单个已完成估值凭证")
    record = records[0]
    if record.get("status") != "calculated-needs-review" or record.get("arguments", {}).get("basis") is None:
        raise ValueError("估值缺少已完成凭证和口径")
    basis = record["arguments"]["basis"]
    if any(basis.get(key) != value for key, value in conclusion["basis"].items()):
        raise ValueError("估值与结论口径不一致")
    output = record["output"]
    if record["name"] == "dcf":
        values = [output.get("perShare")]
    elif record["name"] == "normalized_earnings":
        values = output.get("value", [])
    elif record["name"] == "dividend":
        values = [row.get("price") for row in output.get("anchors", [])]
    elif record["name"] == "dcf_sensitivity":
        values = [value for row in output.get("matrix", []) for value in row.get("values", [])]
    else:
        raise ValueError("此计算不是可比较的每股估值区间")
    if not values or any(not isinstance(v, (float, int)) or isinstance(v, bool) or not math.isfinite(v) for v in values):
        raise ValueError("估值区间含缺失或非有限值")
    return min(values), max(values)


def detect_conflict(request: dict, tools: list[dict], materiality: float = 0.2) -> dict[str, Any]:
    pair = JudgeRequest.model_validate(request).model_dump()
    a, b = pair["l1"], pair["l2"]
    if not math.isfinite(materiality) or not 0.05 <= materiality <= 1:
        raise ValueError("裁决重大性阈值无效")
    if a["id"] == b["id"] or any(a[key] != b[key] for key in ("subject", "kind", "basis")):
        raise ValueError("裁决结论不可比")
    gap_ratio = None
    if a["kind"] == "claim":
        if a["position"] == b["position"]:
            raise ValueError("不存在相反核心主张")
        kind = "opposing_core_claim"
    else:
        x, y = _valuation_interval(a, tools), _valuation_interval(b, tools)
        gap = max(x[0], y[0]) - min(x[1], y[1])
        scale = max(abs(value) for value in (*x, *y))
        gap_ratio = gap / scale if scale else 0
        if gap <= 0 or gap_ratio < materiality:
            raise ValueError("估值分歧未达到重大性阈值")
        kind = "valuation_interval"
    return {"version": 1, "material": True, "completed": True, "type": kind, "gapRatio": gap_ratio,
            "materiality": materiality, "signature": digest({**pair, "tools": tools, "materiality": materiality})}


def judge_packet(request: dict, *, cutoff: str, sources: list[dict], evidence: list[dict], tools: list[dict], human_override: Any = None) -> dict:
    if human_override is not None:
        raise ValueError("人工覆盖必须保留")
    pair = JudgeRequest.model_validate(request).model_dump()
    context = independent_packet(cutoff, sources, evidence, tools, [pair["l1"]["statement"], pair["l2"]["statement"]])
    conflict = detect_conflict(pair, context["tools"])
    refs = {(item["sourceId"], item["blockId"]) for item in context["evidence"]}
    indexed = {record["id"]: record for record in context["tools"]}
    for conclusion in pair.values():
        if any((ref["sourceId"], ref["blockId"]) not in refs for ref in conclusion["evidenceRefs"] + conclusion["counterEvidenceRefs"]):
            raise ValueError("裁决正反证据不完整")
        for identity in conclusion["toolCallIds"]:
            basis = indexed.get(identity, {}).get("arguments", {}).get("basis", {})
            if not basis.get("sourceIds") or not basis.get("evidenceBlocks"):
                raise ValueError("裁决计算缺少来源链")
    packet = {key: value for key, value in context.items() if key != "conclusions"} | pair | {"conflict": conflict}
    if len(json.dumps(packet, ensure_ascii=False)) > 220_000:
        raise ValueError("裁决完整输入超过安全窗口")
    return packet | {"inputHash": digest(packet)}


def validate_judge(raw: str, packet: dict) -> dict:
    value = JudgeOutput.model_validate_json(raw).model_dump()
    expected = digest({key: item for key, item in packet.items() if key != "inputHash"})
    conflict = detect_conflict({key: packet[key] for key in ("l1", "l2")}, packet["tools"], packet["conflict"]["materiality"])
    if value["inputHash"] != packet["inputHash"] or expected != value["inputHash"] or conflict != packet["conflict"]:
        raise ValueError("裁决输入校验不一致")
    insufficient = value["outcome"] == "insufficient_to_decide"
    if insufficient:
        if value["selectedId"] is not None or value["reasonCode"] not in {"insufficient_evidence", "unresolved_counter_evidence"}:
            raise ValueError("证据不足时不得选择结论")
    elif (value["selectedId"] != packet["l1" if value["outcome"] == "accept_l1" else "l2"]["id"]
          or value["reasonCode"] not in {"evidence_consistency", "calculation_consistency"}):
        raise ValueError("裁决只能选择原有结论")
    refs = {(item["sourceId"], item["blockId"]): item["text"] for item in packet["evidence"]}
    citations = value["citations"]
    keys = [(item["sourceId"], item["blockId"]) for item in citations]
    if len(keys) != len(set(keys)) or set(keys) != set(refs) or any(item["quote"] not in refs[key] for item, key in zip(citations, keys, strict=True)):
        raise ValueError("裁决须逐一引用所有正反证据的连续原文")
    ids = value["reviewedToolCallIds"]
    if len(ids) != len(set(ids)) or set(ids) != {record["id"] for record in packet["tools"]}:
        raise ValueError("裁决未核对完整工具凭证")
    if value["reasonCode"] == "calculation_consistency" and conflict["type"] != "valuation_interval":
        raise ValueError("主张裁决不能冒充计算一致性")
    return deepcopy(value)


def advisory(decision: dict, packet: dict) -> dict:
    insufficient = decision["outcome"] == "insufficient_to_decide"
    return {"version": 1, "status": "unresolved" if insufficient else "advisory-needs-review", "decision": deepcopy(decision),
            "selectedConclusion": None if insufficient else deepcopy(packet["l1" if decision["outcome"] == "accept_l1" else "l2"]),
            "conflict": deepcopy(packet["conflict"]), "notice": "仅为独立裁决建议；须最终审计，不覆盖事实或人工判断。"}
