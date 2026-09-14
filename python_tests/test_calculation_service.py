import json

import pytest

from python_backend.application.calculation_service import CalculationService


def test_calculation_plan_executes_only_allowlisted_deterministic_programs():
    service = CalculationService()
    plan = service.parse_plan(
        json.dumps(
            {
                "objective": "复算显式假设",
                "hypotheses": ["现金流按给定增速变化"],
                "steps": ["执行DCF", "保留局限"],
                "calculations": [
                    {
                        "id": "C1",
                        "name": "dcf",
                        "purpose": "检查估值对显式参数的结果",
                        "arguments": {
                            "kind": "FCFF",
                            "cashFlow": 100,
                            "growth": 0.05,
                            "discount": 0.1,
                            "terminalGrowth": 0.02,
                            "years": 5,
                            "shares": 10,
                            "debt": 0,
                            "cash": 0,
                            "minority": 0,
                            "investments": 0,
                        },
                    },
                    {"id": "C2", "name": "cashflow_bridge", "purpose": "验证缺失输入会被拒绝", "arguments": {}},
                ],
            },
            ensure_ascii=False,
        )
    )
    calculations, records = service.execute(plan, [])
    assert calculations[0]["output"]["perShare"] > 0
    assert records[0]["status"] == "calculated-needs-review"
    assert records[1]["status"] == "rejected"
    assert records[0]["inputDigest"]


def test_calculation_plan_rejects_unknown_program_and_duplicate_receipt():
    service = CalculationService()
    base = {"objective": "检查", "hypotheses": [], "steps": ["一步"], "calculations": []}
    with pytest.raises(ValueError, match="未授权"):
        service.parse_plan(json.dumps({**base, "calculations": [{"id": "C1", "name": "shell", "arguments": {}, "purpose": "运行"}]}))
    with pytest.raises(ValueError, match="重复"):
        service.parse_plan(
            json.dumps(
                {
                    **base,
                    "calculations": [
                        {"id": "C1", "name": "dcf", "arguments": {}, "purpose": "一"},
                        {"id": "C1", "name": "dividend", "arguments": {}, "purpose": "二"},
                    ],
                }
            )
        )


def test_mode_allowlist_and_advanced_calculation_dependencies_are_enforced():
    service = CalculationService()
    plan = {
        "objective": "检查",
        "hypotheses": [],
        "steps": ["一步"],
        "calculations": [
            {
                "id": "C1",
                "name": "dcf_sensitivity",
                "purpose": "敏感性",
                "arguments": {"baseCallId": "C0", "growthRates": [0.01], "discountRates": [0.1]},
            }
        ],
    }
    calculations, records = service.execute(plan, [], service.mode_names["B"])
    assert calculations == [] and records[0]["status"] == "rejected"
    with pytest.raises(ValueError, match="未授权"):
        service.parse_plan(json.dumps(plan), service.mode_names["A"])
