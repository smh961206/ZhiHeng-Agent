from datetime import datetime, timezone
from types import SimpleNamespace

import httpx
import pytest

from python_backend.infrastructure.data_providers import LongportProvider, TushareFinancials, longport_symbol, parse_tushare_table, tushare_symbol
from python_backend.infrastructure.market import freshness, parse_eastmoney, parse_yahoo


def test_eastmoney_requires_exact_symbol_and_scales_fields():
    data = {
        "data": {
            "f57": "600519",
            "f58": "测试",
            "f59": 2,
            "f43": 12345,
            "f44": 12400,
            "f45": 12000,
            "f46": 12100,
            "f48": 10,
            "f60": 12200,
            "f86": 1700000000,
            "f116": 1000,
            "f167": 250,
            "f170": 125,
        }
    }
    result = parse_eastmoney(data, {"market": "CN", "symbol": "600519"})
    assert result["price"] == 123.45 and result["currency"] == "CNY" and result["pb"] == 2.5
    with pytest.raises(ValueError):
        parse_eastmoney(data, {"market": "CN", "symbol": "000001"})


def test_yahoo_requires_symbol_currency_price_and_time():
    data = {"chart": {"result": [{"meta": {"symbol": "BRK-B", "currency": "USD", "regularMarketPrice": 500, "regularMarketTime": 1700000000}}]}}
    assert parse_yahoo(data, {"market": "US", "symbol": "BRK.B"})["price"] == 500
    data["chart"]["result"][0]["meta"].pop("currency")
    with pytest.raises(ValueError):
        parse_yahoo(data, {"market": "US", "symbol": "BRK.B"})


def test_freshness_keeps_stale_state_explicit():
    assert "过时" in freshness({"asOf": "2020-01-01T00:00:00Z"}, datetime(2020, 1, 9, tzinfo=timezone.utc).timestamp() * 1000)


def test_python_provider_symbols_and_tushare_contract_preserve_raw_nulls():
    assert longport_symbol({"market": "HK", "symbol": "00700"}) == "700.HK"
    assert longport_symbol({"market": "US", "symbol": "BRK-B"}) == "BRK.B.US"
    assert tushare_symbol({"market": "CN", "symbol": "600519"}) == "600519.SH"
    security = {"market": "CN", "symbol": "600519"}
    fields, rows, limited = parse_tushare_table(
        {
            "code": 0,
            "data": {
                "fields": ["ts_code", "end_date", "ann_date", "revenue"],
                "items": [["600519.SH", "20251231", "20260301", None]],
                "has_more": False,
            },
        },
        security,
    )
    assert fields[-1] == "revenue" and rows[0]["revenue"] is None and limited is False
    with pytest.raises(ValueError, match="证券"):
        parse_tushare_table(
            {"code": 0, "data": {"fields": ["ts_code", "end_date"], "items": [["000001.SZ", "20251231"]]}},
            security,
        )


@pytest.mark.asyncio
async def test_tushare_financials_exclude_rows_published_after_research_cutoff():
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "code": 0,
                "data": {
                    "fields": ["ts_code", "end_date", "ann_date", "revenue"],
                    "items": [
                        ["600519.SH", "20241231", "20250301", 100.0],
                        ["600519.SH", "20251231", "20260301", 200.0],
                    ],
                },
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = TushareFinancials("test-token", client=client)
    sources, warnings = await provider.collect(
        {
            "researchCutoff": "2025-06-01T00:00:00Z",
            "historyYears": 5,
            "securities": [{"market": "CN", "symbol": "600519"}],
        }
    )
    await client.aclose()
    assert len(sources) == 3 and not warnings
    for source in sources:
        payload = __import__("json").loads(source["text"])
        assert [row["revenue"] for row in payload["rows"]] == [100.0]
        assert source["verified"] is False and source["official"] is False


@pytest.mark.asyncio
async def test_longport_fundamentals_are_cutoff_filtered_and_remain_unverified(monkeypatch):
    import longport.openapi as openapi

    point = SimpleNamespace(timestamp=datetime(2025, 2, 1, tzinfo=timezone.utc), value="18.5")
    metric = SimpleNamespace(list=[point])
    valuation = SimpleNamespace(history=SimpleNamespace(metrics=SimpleNamespace(pe=metric, pb=None, ps=None)))
    dividends = SimpleNamespace(
        list=[
            SimpleNamespace(symbol="AAPL.US", id="d1", desc="cash", record_date="20250301", ex_date="20250302", payment_date="20250310"),
            SimpleNamespace(symbol="AAPL.US", id="d2", desc="future", record_date="20260101", ex_date="20260102", payment_date="20260110"),
        ]
    )
    buybacks = SimpleNamespace(
        buyback_history=[
            SimpleNamespace(fiscal_year="FY2024", fiscal_year_range="2024", net_buyback="10", net_buyback_yield="0.01", net_buyback_growth_rate="0.02", currency="USD")
        ]
    )
    actions = SimpleNamespace(
        items=[SimpleNamespace(id="a1", date="20250401", date_type="event", act_type="split", act_desc="split", action="split")]
    )

    class Context:
        def __init__(self, _config):
            pass

        def valuation_history(self, _symbol):
            return valuation

        def dividend_detail(self, _symbol):
            return dividends

        def buyback(self, _symbol):
            return buybacks

        def corp_action(self, _symbol):
            return actions

    monkeypatch.setattr(openapi.Config, "from_apikey", lambda *_args, **_kwargs: object())
    monkeypatch.setattr(openapi, "FundamentalContext", Context)
    provider = LongportProvider("key", "secret", "token")
    sources, warnings = await provider.collect(
        {"researchCutoff": "2025-06-01T00:00:00Z", "securities": [{"market": "US", "symbol": "AAPL"}]}
    )
    assert not warnings and len(sources) == 1
    payload = __import__("json").loads(sources[0]["text"])
    assert payload["valuationHistory"]["pe"][0]["value"] == 18.5
    assert [item["id"] for item in payload["dividends"]] == ["d1"]
    assert sources[0]["official"] is False and sources[0]["pointInTimeVerified"] is False


def test_longport_linux_sdk_fallback_uses_supported_calculated_indexes(monkeypatch):
    import longport

    indexes = SimpleNamespace(PeTtmRatio=1, PbRatio=2, DividendRatioTtm=3, TotalMarketValue=4)
    row = SimpleNamespace(
        symbol="AAPL.US",
        pe_ttm_ratio="18.5",
        pb_ratio="7.2",
        dividend_ratio_ttm=None,
        total_market_value="3000000000",
    )

    class Config:
        @staticmethod
        def from_apikey(*_args, **_kwargs):
            return object()

    class Context:
        def __init__(self, _config):
            pass

        def calc_indexes(self, symbols, requested):
            assert symbols == ["AAPL.US"] and requested == [1, 2, 3, 4]
            return [row]

    monkeypatch.setattr(longport, "openapi", SimpleNamespace(Config=Config, QuoteContext=Context, CalcIndex=indexes))
    payload, warnings = LongportProvider("key", "secret", "token")._fundamentals_sync(
        {"market": "US", "symbol": "AAPL"}, datetime(2025, 6, 1, tzinfo=timezone.utc)
    )
    assert payload["currentValuation"]["peTtm"] == 18.5
    assert payload["currentValuation"]["pb"] == 7.2
    assert payload["currentValuation"]["dividendYieldTtm"] is None
    assert payload["currentValuation"]["marketValue"] == 3000000000.0
    assert payload["currentValuation"]["researchCutoff"] == "2025-06-01T00:00:00Z"
    assert payload["currentValuation"]["pointInTimeVerified"] is False
    assert "Linux SDK" in warnings[0]
