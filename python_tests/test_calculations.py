import pytest

from python_backend.domain.calculations import dcf, dividend, normalized_earnings


def test_dcf_preserves_fcff_equity_bridge():
    result = dcf(
        {
            "cashFlow": 100,
            "growth": 0.05,
            "discount": 0.1,
            "terminalGrowth": 0.02,
            "years": 5,
            "shares": 100,
            "kind": "FCFF",
            "debt": 20,
            "cash": 10,
            "minority": 2,
            "investments": 3,
        }
    )
    assert result["equity"] == pytest.approx(result["value"] - 9)
    assert 0 < result["terminalShare"] < 1


def test_dcf_rejects_financial_company_and_invalid_terminal_rate():
    base = {"cashFlow": 100, "growth": 0.05, "discount": 0.1, "terminalGrowth": 0.02, "shares": 100, "kind": "FCFE"}
    with pytest.raises(ValueError):
        dcf({**base, "sector": "bank"})
    with pytest.raises(ValueError):
        dcf({**base, "terminalGrowth": 0.1})


def test_dividend_and_normalized_earnings_are_deterministic():
    assert dividend(2, [0.04])["anchors"][0]["price"] == 50
    result = normalized_earnings({"equity": 100, "shares": 10, "roeLow": 0.1, "roeHigh": 0.2, "peLow": 10, "peHigh": 20})
    assert result["value"] == [10, 40]
