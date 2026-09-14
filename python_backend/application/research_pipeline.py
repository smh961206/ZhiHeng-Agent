"""Deterministic evidence preparation used by every research job."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any, Protocol

from ..domain.analytics import quick_screen
from ..domain.evidence import evidence_blocks, usable_evidence


class MarketPort(Protocol):
    async def quote(self, security: dict[str, Any]) -> dict[str, Any]: ...


class OfficialEvidencePort(Protocol):
    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]: ...


class VendorFinancialsPort(Protocol):
    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]: ...


@dataclass(frozen=True)
class PipelineResult:
    sources: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    observations: list[dict[str, Any]]
    calculations: list[dict[str, Any]]
    gaps: list[str]
    tool_records: list[dict[str, Any]]

    def to_state(self) -> dict[str, Any]:
        return {
            "version": 1,
            "sources": self.sources,
            "evidence": self.evidence,
            "observations": self.observations,
            "calculations": self.calculations,
            "gaps": self.gaps,
            "toolRecords": self.tool_records,
        }

    @classmethod
    def from_state(cls, value: object) -> PipelineResult | None:
        if not isinstance(value, dict) or value.get("version") != 1:
            return None
        keys = ("sources", "evidence", "observations", "calculations", "gaps", "toolRecords")
        if any(not isinstance(value.get(key), list) for key in keys):
            return None
        return cls(
            sources=value["sources"],
            evidence=value["evidence"],
            observations=value["observations"],
            calculations=value["calculations"],
            gaps=value["gaps"],
            tool_records=value["toolRecords"],
        )


class ResearchPipeline:
    def __init__(
        self,
        market: MarketPort | None = None,
        official: OfficialEvidencePort | None = None,
        financials: VendorFinancialsPort | tuple[VendorFinancialsPort, ...] | None = None,
    ) -> None:
        self.market = market
        self.official = official
        self.financials = () if financials is None else financials if isinstance(financials, tuple) else (financials,)

    async def prepare(self, input_data: dict[str, Any]) -> PipelineResult:
        sources = [dict(source) for source in input_data.get("sources", [])]
        official_gaps: list[str] = []
        if self.official:
            official_sources, official_gaps = await self.official.collect(input_data)
            sources.extend(official_sources)
        vendor_warnings: list[str] = []
        if self.financials:
            results = await asyncio.gather(*(provider.collect(input_data) for provider in self.financials), return_exceptions=True)
            for result in results:
                if isinstance(result, BaseException):
                    vendor_warnings.append(f"补充数据源获取失败：{type(result).__name__}")
                    continue
                provider_sources, provider_warnings = result
                sources.extend(provider_sources)
                vendor_warnings.extend(provider_warnings)
        evidence: list[dict[str, Any]] = []
        for source in sources:
            for block in evidence_blocks(source):
                if usable_evidence(source, block):
                    evidence.append(
                        {
                            "sourceId": source["id"],
                            "blockId": block["id"],
                            "title": source.get("title"),
                            "security": source.get("security"),
                            "publishedAt": source.get("publishedAt"),
                            "page": block.get("page"),
                            "text": block.get("text", ""),
                        }
                    )

        observations: list[dict[str, Any]] = []
        if self.market:
            securities = input_data.get("securities", [])
            values = await asyncio.gather(*(self.market.quote(item) for item in securities), return_exceptions=True)
            for security, value in zip(securities, values, strict=True):
                if isinstance(value, Exception):
                    observations.append({"security": security, "status": "missing", "reason": "行情来源暂不可用"})
                else:
                    as_of = value.get("asOf") if isinstance(value, dict) else None
                    eligible = bool(as_of and as_of <= input_data["researchCutoff"])
                    observations.append({"security": security, "status": "observed-unverified" if eligible else "outside-cutoff", "quote": value})

        calculations, calculation_gaps = self._financial_screen(sources)
        gaps = list(official_gaps)
        gaps.extend(vendor_warnings)
        if not evidence:
            gaps.append("没有可用于金融事实或计算的官方原文证据块")
        if not input_data.get("securities"):
            gaps.append("没有明确证券身份")
        gaps.extend(calculation_gaps)
        tool_records: list[dict[str, Any]] = [
            {"toolName": "collect_market_observations", "result": observations},
            {"toolName": "prepare_evidence_pack", "result": {"matches": evidence, "gaps": gaps}},
            {"toolName": "collect_vendor_financials", "result": {"sources": [item["id"] for item in sources if item.get("type") == "vendor-financials"], "warnings": vendor_warnings}},
            {"toolName": "deterministic_financial_screen", "result": calculations},
        ]
        return PipelineResult(
            sources=sources,
            evidence=evidence,
            observations=observations,
            calculations=calculations,
            gaps=gaps,
            tool_records=tool_records,
        )

    @staticmethod
    def _financial_screen(sources: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
        """Build annual rows only where SEC provides an unambiguous filed fact."""
        periods: dict[tuple[str, str, str], dict[str, Any]] = {}
        for source in sources:
            if source.get("type") != "official-xbrl":
                continue
            for index, fact in enumerate(source.get("financialFacts", []), start=1):
                if fact.get("form") not in {"10-K", "20-F", "40-F"} or fact.get("unit") not in {"USD", "CNY", "HKD"}:
                    continue
                start, end, accession = fact.get("start"), fact.get("end"), fact.get("accession")
                if fact.get("metric") != "equity" and (not start or not end):
                    continue
                key = (str(end), str(fact.get("unit")), str(accession))
                row = periods.setdefault(
                    key,
                    {
                        "kind": "annual",
                        "start": start,
                        "end": end,
                        "currency": fact.get("unit"),
                        "accession": accession,
                        "sourceIds": [source["id"]],
                        "factReferences": {},
                    },
                )
                metric = fact.get("metric")
                # Prefer the first fact after deterministic newest-first sorting;
                # conflicting duplicates stay out of the derived row.
                if metric in row and row[metric] != fact.get("value"):
                    row[metric] = None
                    row["factReferences"].pop(metric, None)
                elif metric not in row:
                    row[metric] = fact.get("value")
                    row["factReferences"][metric] = {"sourceId": source["id"], "blockId": f"fact{index}"}
        rows = sorted(periods.values(), key=lambda row: row["end"], reverse=True)
        if not rows:
            return [], ["未取得具备明确期间、币种、申报表单和 accession 的年度结构化财务事实"]
        screen = quick_screen(rows)
        return [
            {
                "id": "deterministic-financial-screen-v1",
                "kind": "financial-screen",
                "status": "calculated-needs-review",
                "formulaVersion": "financial-screen-v1",
                "inputs": rows,
                "output": screen,
                "limitations": [
                    "仅使用同一 SEC accession 内的年度事实；冲突值保持 null。",
                    "净利率、ROE 与 Quick FCF 是机械计算，不构成预测、估值或投资结论。",
                    "股东权益是期末存量，净利润是期间流量，ROE 未做平均权益调整。",
                ],
            }
        ], []
