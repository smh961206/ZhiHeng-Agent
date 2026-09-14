from copy import deepcopy

import pytest

from python_backend.domain.financial import cashflow_bridge, reinvestment_diagnostics

SOURCES = [{"id": "S1", "type": "official-report"}]


def _bridge():
    def item(key, value):
        return {"key": key, "label": key, "contribution": value, "sourceIds": ["S1"]}

    return {
        "amountUnit": "人民币亿元",
        "scope": "合并范围含财务子公司；只调整所列两项",
        "basis": {"sourceIds": ["S1"], "currency": "CNY"},
        "current": {"start": "2026-01-01", "end": "2026-06-30", "ocf": 70, "sourceIds": ["S1"], "adjustments": [item("deposits", 10), item("placement", 30)]},
        "previous": {"start": "2025-01-01", "end": "2025-06-30", "ocf": 20, "sourceIds": ["S1"], "adjustments": [item("placement", -10), item("deposits", 0)]},
    }


def test_cashflow_bridge_preserves_signed_contributions_and_missing_values():
    result = cashflow_bridge(_bridge(), sources=SOURCES)
    assert result["ocfChange"] == 50 and result["explainedChange"] == 50
    assert result["adjustedCurrent"] == result["adjustedPrevious"] == 30
    assert result["adjustedGrowth"] == 0 and result["status"] == "calculated-needs-review"
    missing = _bridge()
    missing["current"]["adjustments"][0]["contribution"] = None
    assert cashflow_bridge(missing, sources=SOURCES)["status"] == "incomplete"


def test_cashflow_bridge_rejects_period_source_and_item_drift():
    for mutate in (
        lambda row: row["previous"].update(end="2025-12-31"),
        lambda row: row["current"]["adjustments"].append(deepcopy(row["current"]["adjustments"][0])),
        lambda row: row["basis"].update(sourceIds=["missing"]),
    ):
        values = _bridge()
        mutate(values)
        with pytest.raises(ValueError):
            cashflow_bridge(values, sources=SOURCES)


def test_reinvestment_keeps_missing_data_and_checks_research_reconciliation():
    row = {
        "start": "2026-01-01",
        "end": "2026-06-30",
        "sourceIds": ["S1"],
        "revenue": 100,
        "profit": 10,
        "ocf": 12,
        "capex": 3,
        "rdTotal": 8,
        "rdExpensed": 6,
        "rdCapitalized": 2,
    }
    previous = {**row, "start": "2025-01-01", "end": "2025-06-30", "rdTotal": 5, "rdExpensed": 4, "rdCapitalized": 1}
    values = {"current": row, "previous": previous, "basis": {"sourceIds": ["S1"], "currency": "CNY"}}
    result = reinvestment_diagnostics(values, sources=SOURCES)
    assert result["current"]["metrics"]["quickFCF"] == 9
    assert result["sameRateSensitivity"]["hypotheticalCapitalized"] == 1.6
    bad = deepcopy(values)
    bad["current"]["rdCapitalized"] = 3
    with pytest.raises(ValueError, match="研发总投入"):
        reinvestment_diagnostics(bad, sources=SOURCES)
