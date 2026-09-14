import pytest

from python_backend.domain.analytics import dcf_sensitivity, quick_screen, review_valuation_models, shareholder_return, valuation_percentiles


def test_quick_screen_and_valuation_history_keep_missing_values():
    result = quick_screen([{"kind": "annual", "revenue": 100, "netIncome": 10, "equity": 50, "ocf": None, "capex": 3}])
    assert result["financial"][0]["roe"] == 0.2
    assert result["financial"][0]["quickFcf"] is None
    assert valuation_percentiles([{"value": 10}, {"value": None}, {"value": 20}])["median"] == 15


def test_sensitivity_and_review_preserve_assumption_boundaries():
    base = {"kind": "FCFE", "cashFlow": 100, "growth": 0, "discount": 0.1, "terminalGrowth": 0, "years": 5, "shares": 10}
    assert dcf_sensitivity(base, [0], [0.1])["matrix"][0]["values"][0] == pytest.approx(100)
    reviewed = review_valuation_models(
        [{"toolCallId": "a", "role": "primary", "limitation": "现金流假设"}, {"toolCallId": "b", "role": "cross-check", "limitation": "收益率假设"}]
    )
    assert reviewed["status"] == "reviewed-needs-evidence"


def test_shareholder_return_subtracts_issuance_and_never_fills_missing():
    assert shareholder_return(10, 5, 3, 100)["yield"] == 0.12
    assert shareholder_return(10, None, 3, 100)["netReturn"] is None
