from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any, Callable, cast

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from ..domain.analytics import dcf_sensitivity, review_valuation_models, shareholder_return, valuation_percentiles
from ..domain.calculations import dcf, dividend, normalized_earnings
from ..domain.evidence import search_evidence, verify_financial_inputs
from ..domain.financial import cashflow_bridge, reinvestment_diagnostics


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CalculationRequest(_Strict):
    id: str = Field(pattern=r"^C[1-9]\d{0,2}$")
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    purpose: str = Field(min_length=1, max_length=300)


class PublicAnalysisPlan(_Strict):
    objective: str = Field(min_length=1, max_length=1_000)
    hypotheses: list[str] = Field(default_factory=list, max_length=6)
    steps: list[str] = Field(default_factory=list, min_length=1, max_length=12)
    calculations: list[CalculationRequest] = Field(default_factory=list, max_length=12)


class CalculationService:
    """Validate and execute the model's allow-listed deterministic calculations."""

    names = {
        "dcf",
        "dividend",
        "normalized_earnings",
        "dcf_sensitivity",
        "valuation_percentiles",
        "shareholder_return",
        "verify_financial_inputs",
        "cashflow_bridge",
        "reinvestment_diagnostics",
        "search_evidence",
        "review_valuation_models",
    }

    mode_names = {
        "A": {"search_evidence", "verify_financial_inputs", "valuation_percentiles"},
        "B": names,
        "C": {"search_evidence", "verify_financial_inputs", "cashflow_bridge", "reinvestment_diagnostics", "dcf", "dcf_sensitivity", "review_valuation_models"},
        "D": names,
        "E": {"search_evidence", "verify_financial_inputs", "shareholder_return", "valuation_percentiles"},
        "F": {"search_evidence", "verify_financial_inputs", "dividend", "shareholder_return", "valuation_percentiles"},
    }

    @staticmethod
    def parse_plan(value: str, allowed: set[str] | None = None) -> dict[str, Any]:
        text = value.strip()
        if text.startswith("```"):
            text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            plan = PublicAnalysisPlan.model_validate_json(text)
        except ValidationError as error:
            raise ValueError("分析计划不符合公开结构化协议") from error
        ids = [item.id for item in plan.calculations]
        permitted = allowed or CalculationService.names
        if len(ids) != len(set(ids)) or any(item.name not in permitted for item in plan.calculations):
            raise ValueError("分析计划包含重复编号或未授权计算")
        if any(not item.strip() for item in plan.hypotheses + plan.steps):
            raise ValueError("分析计划包含空步骤")
        return plan.model_dump()

    @staticmethod
    def _run(name: str, arguments: dict[str, Any], sources: list[dict[str, Any]]) -> Any:
        dispatch: dict[str, Callable[[], Any]] = {
            "dcf": lambda: dcf(arguments),
            "dividend": lambda: dividend(cast(float, arguments.get("dps")), arguments.get("yields")),
            "normalized_earnings": lambda: normalized_earnings(arguments),
            "dcf_sensitivity": lambda: dcf_sensitivity(arguments.get("base", {}), arguments.get("growthRates", []), arguments.get("discountRates", [])),
            "valuation_percentiles": lambda: valuation_percentiles(arguments.get("rows", [])),
            "shareholder_return": lambda: shareholder_return(
                arguments.get("dividends"), arguments.get("buybacks"), arguments.get("issuance"), arguments.get("marketCap")
            ),
            "verify_financial_inputs": lambda: verify_financial_inputs(arguments.get("items", []), sources),
            "cashflow_bridge": lambda: cashflow_bridge(arguments, sources=sources),
            "reinvestment_diagnostics": lambda: reinvestment_diagnostics(arguments, sources=sources),
            "search_evidence": lambda: search_evidence(sources, arguments.get("query", ""), arguments.get("sourceId")),
            "review_valuation_models": lambda: review_valuation_models(arguments.get("models", [])),
        }
        return dispatch[name]()

    def execute(
        self,
        plan: dict[str, Any],
        sources: list[dict[str, Any]],
        allowed: set[str] | None = None,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        records: list[dict[str, Any]] = []
        calculations: list[dict[str, Any]] = []
        successful: dict[str, dict[str, Any]] = {}
        permitted = allowed or self.names
        for request in plan.get("calculations", []):
            arguments = deepcopy(request["arguments"])
            receipt = hashlib.sha256(
                json.dumps({"name": request["name"], "arguments": arguments}, sort_keys=True, ensure_ascii=False, default=str).encode()
            ).hexdigest()
            try:
                if request["name"] not in permitted:
                    raise ValueError("当前研究路径未开放此计算")
                if request["name"] == "dcf_sensitivity":
                    base_id = arguments.get("baseCallId")
                    base = successful.get(base_id) if isinstance(base_id, str) else None
                    if not base or base["name"] != "dcf":
                        raise ValueError("DCF敏感性须引用本计划中先前成功的DCF调用")
                    arguments["base"] = deepcopy(base["arguments"])
                if request["name"] == "review_valuation_models":
                    references = [item.get("toolCallId") for item in arguments.get("models", []) if isinstance(item, dict)]
                    valuation_names = {"dcf", "dividend", "normalized_earnings", "dcf_sensitivity", "valuation_percentiles"}
                    if not references or any(reference not in successful or successful[reference]["name"] not in valuation_names for reference in references):
                        raise ValueError("估值复核只能引用本计划中先前成功的估值调用")
                output = self._run(request["name"], arguments, sources)
                record = {
                    "id": request["id"],
                    "name": request["name"],
                    "purpose": request["purpose"],
                    "status": "calculated-needs-review",
                    "inputDigest": receipt,
                    "arguments": arguments,
                    "output": output,
                    "notice": "程序只复算显式输入；来源、期间、币种、股本口径和假设仍须审计。",
                }
                records.append(record)
                successful[request["id"]] = record
                if request["name"] != "search_evidence":
                    calculations.append(record)
            except (KeyError, TypeError, ValueError) as error:
                records.append(
                    {
                        "id": request["id"],
                        "name": request["name"],
                        "purpose": request["purpose"],
                        "status": "rejected",
                        "inputDigest": receipt,
                        "error": str(error),
                    }
                )
        return calculations, records
