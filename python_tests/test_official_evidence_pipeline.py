from __future__ import annotations

import json

import httpx
import pytest

from python_backend.application.research_pipeline import ResearchPipeline
from python_backend.infrastructure.official_evidence import OfficialEvidenceCollector


@pytest.mark.asyncio
async def test_sec_company_facts_respect_cutoff_and_feed_deterministic_screen():
    directory = {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}}
    submissions = {
        "filings": {
            "recent": {
                "form": [],
                "filingDate": [],
                "accessionNumber": [],
                "primaryDocument": [],
            }
        }
    }
    units = {
        "RevenueFromContractWithCustomerExcludingAssessedTax": ("revenue", 1000),
        "NetIncomeLoss": ("netIncome", 100),
        "StockholdersEquity": ("equity", 500),
        "NetCashProvidedByUsedInOperatingActivities": ("ocf", 140),
        "PaymentsToAcquirePropertyPlantAndEquipment": ("capex", 40),
    }
    facts = {}
    for concept, (_, value) in units.items():
        row = {"end": "2025-09-27", "val": value, "unit": "USD", "form": "10-K", "filed": "2025-10-31", "fy": 2025, "fp": "FY", "accn": "0000320193-25-000001"}
        if concept != "StockholdersEquity":
            row["start"] = "2024-09-29"
        future = {**row, "val": value * 2, "filed": "2026-10-30", "accn": "0000320193-26-000001"}
        facts[concept] = {"label": concept, "units": {"USD": [row, future]}}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("company_tickers.json"):
            return httpx.Response(200, json=directory)
        if "/submissions/" in request.url.path:
            return httpx.Response(200, json=submissions)
        if "/companyfacts/" in request.url.path:
            return httpx.Response(200, json={"cik": 320193, "facts": {"us-gaap": facts}})
        raise AssertionError(str(request.url))

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        collector = OfficialEvidenceCollector("Research Test test@example.com", client=client)
        input_data = {
            "researchCutoff": "2026-01-01T00:00:00Z",
            "securities": [{"market": "US", "symbol": "AAPL"}],
            "sources": [],
        }
        sources, gaps = await collector.collect(input_data)
        result = await ResearchPipeline(official=collector).prepare(input_data)

    assert not gaps
    assert len(sources[0]["financialFacts"]) == 5
    assert all(fact["filed"] <= "2026-01-01" for fact in sources[0]["financialFacts"])
    calculation = result.calculations[0]
    row = calculation["output"]["financial"][0]
    assert row["netMargin"] == pytest.approx(0.1)
    assert row["roe"] == pytest.approx(0.2)
    assert row["quickFcf"] == 100
    assert json.dumps(calculation, ensure_ascii=False).find("0000320193-25-000001") >= 0


def test_company_facts_reject_entity_mismatch():
    source = OfficialEvidenceCollector._company_facts(
        {"market": "US", "symbol": "AAPL"},
        "0000320193",
        {"cik": 1, "facts": {}},
        __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    assert source is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("market", "symbol", "handler_payload", "expected_provider"),
    [
        (
            "HK",
            "00001",
            {
                "directory": 'callback({"stockInfo":[{"code":"00001","stockId":"1","name":"CKH"}]});',
                "listing": '31/03/2025 <span>00001</span><a href="/listedco/listconews/sehk/2025/0331/report.pdf">Annual Report 2024</a>',
            },
            "HKEXnews",
        ),
        (
            "CN",
            "600000",
            {
                "announcements": [
                    {
                        "secCode": "600000",
                        "announcementTime": 1743379200000,
                        "adjunctUrl": "finalpage/2025-03-31/report.pdf",
                        "announcementTitle": "2024年年度报告",
                    }
                ]
            },
            "巨潮资讯网",
        ),
    ],
)
async def test_cn_and_hk_adapters_validate_identity_cutoff_and_official_host(monkeypatch, market, symbol, handler_payload, expected_provider):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("prefix.do"):
            return httpx.Response(200, text=handler_payload["directory"])
        if request.url.path.endswith("titlesearch.xhtml"):
            return httpx.Response(200, text=handler_payload["listing"])
        if request.url.path.endswith("hisAnnouncement/query"):
            return httpx.Response(200, json=handler_payload)
        if request.url.path.endswith("report.pdf"):
            return httpx.Response(200, content=b"pdf")
        raise AssertionError(str(request.url))

    monkeypatch.setattr(OfficialEvidenceCollector, "_pdf_text", staticmethod(lambda _: "经审计年度报告正文"))
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        collector = OfficialEvidenceCollector("Research Test test@example.com", client=client)
        sources, gaps = await collector.collect(
            {"researchCutoff": "2025-06-01T00:00:00Z", "securities": [{"market": market, "symbol": symbol}], "sources": []}
        )
    assert not gaps
    assert sources[0]["provider"] == expected_provider
    assert sources[0]["security"] == f"{market}:{symbol}"
    assert sources[0]["official"] is True
