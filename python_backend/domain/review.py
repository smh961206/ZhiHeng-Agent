from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any, cast

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .contracts import MODES
from .judge import JudgeRequest


class ReviewFailure(ValueError):
    def __init__(self, message: str, kind: str = "validation") -> None:
        super().__init__(message)
        self.kind = kind


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ReviewedDecision(_StrictModel):
    action: str = Field(min_length=1, max_length=40)
    confidence: str
    summary: str = Field(min_length=1, max_length=2_000)
    falsifiers: list[str] = Field(min_length=3, max_length=12)
    data_as_of: str = Field(alias="dataAsOf")

    @field_validator("confidence")
    @classmethod
    def valid_confidence(cls, value: str) -> str:
        if value not in {"高", "中高", "中", "中低", "低"}:
            raise ValueError("置信度无效")
        return value

    @field_validator("falsifiers")
    @classmethod
    def unique_falsifiers(cls, values: list[str]) -> list[str]:
        clean = [value.strip() for value in values if isinstance(value, str) and value.strip()]
        if len(clean) < 3 or len(set(clean)) != len(clean):
            raise ValueError("须提供至少三条不同的证伪条件")
        return clean


class ReviewedResult(_StrictModel):
    report: str = Field(min_length=1, max_length=200_000)
    audit: str = Field(min_length=1, max_length=20_000)
    decision: ReviewedDecision
    judgeRequest: JudgeRequest | None = None


_REFERENCE = re.compile(r"\[([^\[\]\n]{1,128})\]")
_SOURCE_LIKE = re.compile(r"^(?:S\d+|[A-Z][A-Z0-9]+[-:][A-Za-z0-9_.:-]+)$")
NO_EVIDENCE_ACTIONS = {
    "A": "深度研究",
    "B": "深度研究",
    "C": "维持",
    "D": "深度研究",
    "E": "观察",
    "F": "深度研究",
}


def _json_object(value: str) -> dict[str, Any]:
    text = value.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        raise ReviewFailure("审计输出不是有效JSON", "format") from error
    if not isinstance(parsed, dict):
        raise ReviewFailure("审计输出必须是对象", "format")
    return parsed


def validate_review(
    value: str,
    *,
    mode: str,
    cutoff: str,
    evidence: list[dict[str, Any]],
    gaps: list[str],
) -> dict[str, Any]:
    try:
        reviewed = ReviewedResult.model_validate(_json_object(value))
    except ValidationError as error:
        raise ReviewFailure("审计输出缺少有效报告、审计意见或决策字段") from error
    allowed_actions = cast(list[str], MODES.get(mode, {}).get("actions", []))
    if reviewed.decision.data_as_of != cutoff:
        raise ValueError("审计不得改变研究截止时间")
    source_ids = {str(item.get("sourceId")) for item in evidence if item.get("sourceId")}
    bracketed = set(_REFERENCE.findall(reviewed.report))
    references = bracketed & source_ids
    unknown = sorted(item for item in bracketed if _SOURCE_LIKE.fullmatch(item) and item not in source_ids)
    if unknown:
        raise ValueError("报告引用了不存在的本次证据：" + "、".join(unknown))
    if source_ids and not references:
        raise ValueError("报告正文未关联本次证据编号")
    if not source_ids:
        expected_action = NO_EVIDENCE_ACTIONS[mode]
        if reviewed.decision.action != expected_action or reviewed.decision.confidence != "低":
            raise ValueError(f"没有可用证据时只能保留低置信度的{expected_action}动作")
    elif gaps and reviewed.decision.confidence in {"高", "中高"}:
        raise ValueError("仍有证据缺口时必须降低置信度")
    if reviewed.decision.action not in allowed_actions:
        raise ReviewFailure("审计输出包含当前研究模式不允许的动作", "semantic")
    result = reviewed.model_dump(by_alias=True, exclude_none=True)
    result["validation"] = {
        "contractVersion": 1,
        "citedSourceIds": sorted(references),
        "availableSourceIds": sorted(source_ids),
        "gapsPreserved": bool(gaps),
    }
    return deepcopy(result)
