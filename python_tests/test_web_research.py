from __future__ import annotations

import httpx
import pytest

from python_backend.infrastructure.web_research import WebResearchCollector


@pytest.mark.asyncio
async def test_web_research_uses_search_only_for_discovery_and_reads_bound_body(monkeypatch):
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.tavily.com":
            return httpx.Response(
                200,
                json={
                    "answer": "this generated answer must be discarded",
                    "results": [
                        {"title": "unbound", "url": "https://example.net/summary"},
                        {"title": "filing", "url": "https://investor.example.com/report"},
                    ],
                },
            )
        return httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            text=(
                "<html><head><title>Annual filing</title>"
                '<meta property="article:published_time" content="2025-03-01T00:00:00Z"></head>'
                "<body><p>Published on 2025-03-01</p><p>" + "audited disclosure text " * 30 + "</p></body></html>"
            ),
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    collector = WebResearchCollector(
        enabled=True,
        tavily_key="secret",
        brave_key="",
        issuer_domains={"US:AAPL": ("investor.example.com",)},
        client=client,
    )

    async def public(_host: str) -> bool:
        return True

    monkeypatch.setattr(collector, "_public_host", public)
    sources, warnings = await collector.collect(
        {"researchCutoff": "2025-06-01T00:00:00Z", "securities": [{"market": "US", "symbol": "AAPL"}]}
    )
    await client.aclose()
    assert not warnings and len(sources) == 1
    source = sources[0]
    assert source["security"] == "US:AAPL" and source["authorityVerified"] is True
    assert source["publishedAt"] == "2025-03-01T00:00:00Z"
    assert "generated answer" not in source["text"]


@pytest.mark.asyncio
async def test_web_research_reports_disabled_and_unconfigured_states():
    disabled = WebResearchCollector(enabled=False, tavily_key="", brave_key="", issuer_domains={})
    assert (await disabled.collect({"researchCutoff": "2025-01-01T00:00:00Z", "securities": []}))[1] == ["主动网页搜索已关闭"]
    await disabled.close()
    missing = WebResearchCollector(enabled=True, tavily_key="", brave_key="", issuer_domains={})
    assert "未配置" in (await missing.collect({"researchCutoff": "2025-01-01T00:00:00Z", "securities": []}))[1][0]
    await missing.close()
