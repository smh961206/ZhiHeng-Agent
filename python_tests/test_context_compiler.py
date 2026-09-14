import json

import pytest

from python_backend.application.context_compiler import ResearchContextCompiler
from python_backend.application.research_pipeline import PipelineResult


def test_context_compiler_preserves_baseline_portfolio_and_rotates_sources_with_receipt():
    evidence = [
        {"sourceId": source, "blockId": f"b{index}", "security": security, "text": "x" * 500}
        for index, (source, security) in enumerate(
            [("S1", "US:AAPL"), ("S1", "US:AAPL"), ("S2", "US:MSFT"), ("S2", "US:MSFT")], start=1
        )
    ]
    prepared = PipelineResult([], evidence, [], [], ["缺口"], [])
    compiler = ResearchContextCompiler(max_characters=31_800)
    value = compiler.compile(
        {
            "question": "比较",
            "depth": "Standard",
            "historyYears": 5,
            "researchCutoff": "2025-01-01T00:00:00Z",
            "securities": [{"market": "US", "symbol": "AAPL"}, {"market": "US", "symbol": "MSFT"}],
            "portfolio": "组合约束",
            "portfolioContext": {"currency": "USD"},
            "previousResearch": "旧研究",
            "baseline": {"report": "历史结论"},
        },
        "D",
        prepared,
        knowledge_rules="证据优先",
        analysis_plan=None,
    )
    assert value["portfolio"] == "组合约束" and value["baseline"]["report"] == "历史结论"
    assert [item["sourceId"] for item in value["evidence"][:2]] == ["S1", "S2"]
    assert value["contextReceipt"]["omittedEvidenceBlocks"] > 0
    assert value["contextReceipt"]["compiledCharacters"] <= 31_800
    assert value["contextReceipt"]["compiledCharacters"] == len(
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)
    )
    assert value["contextReceipt"]["version"] == 2
    assert value["contextReceipt"]["requiredComplete"] is True


def test_context_compiler_rejects_missing_calculation_evidence():
    calculation = {
        "arguments": {"basis": {"evidenceBlocks": [{"sourceId": "S1", "blockId": "missing"}]}}
    }
    prepared = PipelineResult([], [], [], [calculation], [], [])
    with pytest.raises(RuntimeError, match="证据块不存在"):
        ResearchContextCompiler().compile(
            {"question": "研究", "researchCutoff": "2025-01-01T00:00:00Z"},
            "B", prepared, knowledge_rules="证据优先", analysis_plan=None,
        )
