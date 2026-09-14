import pytest

from python_backend.domain.securities import explicit_mentions, parse_security_intent, resolve_securities


def test_explicit_codes_aliases_and_financial_terms_are_separated():
    rows = explicit_mentions("比较 sh600519、00700.HK、AAPL 的 ROE、DCF 和 SEC 财报")
    assert [(item["market"], item["symbol"]) for item in rows] == [("CN", "600519"), ("HK", "00700"), ("US", "AAPL")]
    assert explicit_mentions("收入增长20%，未来2026年看ROE") == []


@pytest.mark.asyncio
async def test_resolution_deduplicates_and_reports_overflow():
    result = await resolve_securities("贵州茅台600519和腾讯、AAPL、MSFT")
    assert [item["symbol"] for item in result["securities"]] == ["600519", "00700", "AAPL"]
    assert result["overflow"] is True


def test_semantic_intent_must_be_grounded_in_user_text():
    result = parse_security_intent({"targets": [{"mention": "茅台", "market": "CN", "marketEvidence": "A股"}]}, "分析A股茅台")
    assert result["targets"] == [{"mention": "茅台", "market": "CN"}]
    with pytest.raises(ValueError):
        parse_security_intent({"targets": [{"mention": "腾讯"}]}, "研究茅台")
