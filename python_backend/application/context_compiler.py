from __future__ import annotations

import hashlib
import json
from collections import defaultdict, deque
from copy import deepcopy
from typing import Any

from .research_pipeline import PipelineResult


def _size(value: object) -> int:
    return len(json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str))


class ResearchContextCompiler:
    """Build a bounded, deterministic context and record exactly what the model received."""

    def __init__(self, max_characters: int = 220_000) -> None:
        self.version = 2
        self.max_characters = max_characters

    @staticmethod
    def _required_evidence(calculations: list[dict[str, Any]]) -> set[tuple[str, str]]:
        required: set[tuple[str, str]] = set()
        for calculation in calculations:
            basis = calculation.get("arguments", {}).get("basis", {}) if isinstance(calculation, dict) else {}
            for reference in basis.get("evidenceBlocks", []) if isinstance(basis, dict) else []:
                if isinstance(reference, dict) and reference.get("sourceId") and reference.get("blockId"):
                    required.add((str(reference["sourceId"]), str(reference["blockId"])))
        return required

    @staticmethod
    def refresh_size(payload: dict[str, Any]) -> None:
        receipt = payload["contextReceipt"]
        for _ in range(8):
            actual = _size(payload)
            if receipt["compiledCharacters"] == actual:
                return
            receipt["compiledCharacters"] = actual
        raise RuntimeError("研究上下文回执大小无法稳定")

    @staticmethod
    def _source_projection(source: dict[str, Any]) -> dict[str, Any]:
        kind = source.get("type")
        text = str(source.get("text", ""))
        limit = 20_000 if kind == "user-reference" else 6_000
        kept = text[:limit]
        return {
            key: deepcopy(value)
            for key, value in source.items()
            if key not in {"text", "documentBlocks", "financialFacts"}
        } | {"text": kept, "contextTruncated": len(text) > len(kept)}

    @staticmethod
    def _round_robin(evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
        groups: dict[str, deque[dict[str, Any]]] = defaultdict(deque)
        for item in evidence:
            groups[str(item.get("security") or item.get("sourceId") or "general")].append(item)
        ordered: list[dict[str, Any]] = []
        keys = sorted(groups)
        while keys:
            next_keys = []
            for key in keys:
                ordered.append(groups[key].popleft())
                if groups[key]:
                    next_keys.append(key)
            keys = next_keys
        return ordered

    def compile(
        self,
        input_data: dict[str, Any],
        mode: str,
        prepared: PipelineResult,
        *,
        knowledge_rules: str,
        analysis_plan: dict[str, Any] | None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "question": input_data["question"],
            "mode": mode,
            "depth": input_data.get("depth"),
            "historyYears": input_data.get("historyYears"),
            "researchCutoff": input_data["researchCutoff"],
            "securities": deepcopy(input_data.get("securities", [])),
            "portfolio": input_data.get("portfolio", ""),
            "portfolioContext": deepcopy(input_data.get("portfolioContext", {})),
            "previousResearch": input_data.get("previousResearch", ""),
            "baseline": deepcopy(input_data.get("baseline")),
            "marketObservations": deepcopy(prepared.observations),
            "calculations": deepcopy(prepared.calculations),
            "gaps": deepcopy(prepared.gaps),
            "knowledgeRules": knowledge_rules,
            "analysisPlan": deepcopy(analysis_plan),
            "evidence": [],
            "unverifiedMaterials": [],
        }
        content_limit = self.max_characters - 30_000
        base_size = _size(payload)
        if base_size > content_limit:
            raise RuntimeError("研究必需上下文超过安全窗口；请缩小组合、历史对照或研究范围")
        selected: list[dict[str, Any]] = []
        omitted: list[dict[str, str]] = []
        required = self._required_evidence(prepared.calculations)
        available = {(str(item.get("sourceId", "")), str(item.get("blockId", ""))) for item in prepared.evidence}
        if required - available:
            raise RuntimeError("确定性计算引用的证据块不存在，不能编译研究上下文")
        ordered = sorted(
            self._round_robin(prepared.evidence),
            key=lambda item: (str(item.get("sourceId", "")), str(item.get("blockId", ""))) not in required,
        )
        for item in ordered:
            if _size(payload) + _size(item) <= content_limit:
                selected.append(deepcopy(item))
                payload["evidence"] = selected
            else:
                omitted.append({"sourceId": str(item.get("sourceId", "")), "blockId": str(item.get("blockId", ""))})
        materials = []
        omitted_materials: list[str] = []
        for source in prepared.sources:
            projection = self._source_projection(source)
            if _size(payload) + _size(projection) <= content_limit:
                materials.append(projection)
                payload["unverifiedMaterials"] = materials
            else:
                omitted_materials.append(str(source.get("id", "")))
        included_sources = sorted({str(item.get("sourceId")) for item in selected if item.get("sourceId")})
        included_references = {(str(item.get("sourceId", "")), str(item.get("blockId", ""))) for item in selected}
        required_complete = required <= included_references
        if not required_complete:
            raise RuntimeError("确定性计算所需证据超过安全窗口，不能发送不完整上下文")
        omitted_payload = json.dumps(omitted, ensure_ascii=False, separators=(",", ":"))
        payload["contextReceipt"] = {
            "version": self.version,
            "maxCharacters": self.max_characters,
            "compiledCharacters": 0,
            "includedEvidenceBlocks": len(selected),
            "omittedEvidenceBlocks": len(omitted),
            "requiredEvidenceBlocks": len(required),
            "requiredComplete": required_complete,
            "includedSourceIds": included_sources,
            "omittedReferences": omitted[:200],
            "omittedReferencesDigest": hashlib.sha256(omitted_payload.encode()).hexdigest(),
            "includedMaterialIds": [str(item.get("id")) for item in materials if item.get("id")],
            "omittedMaterialIds": omitted_materials[:200],
            "omittedMaterialIdsDigest": hashlib.sha256(
                json.dumps(omitted_materials, ensure_ascii=False, separators=(",", ":")).encode()
            ).hexdigest(),
            "complete": not omitted and len(materials) == len(prepared.sources),
        }
        self.refresh_size(payload)
        if payload["contextReceipt"]["compiledCharacters"] > self.max_characters:
            raise RuntimeError("研究上下文回执超过安全窗口")
        return payload
