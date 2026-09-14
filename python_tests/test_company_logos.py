import asyncio
import time

import httpx
import pytest

from python_backend.infrastructure import company_logos as module
from python_backend.infrastructure.company_logos import CompanyLogos, listing_identity, listing_query, logo_files, thumbnail

PNG = b"\x89PNG\r\n\x1a\nfixture"


def bindings(*issuers):
    return {"results": {"bindings": [
        {"item": {"value": f"http://www.wikidata.org/entity/{issuer}"},
         "logo": {"value": "http://commons.wikimedia.org/wiki/Special:FilePath/Example.svg"}}
        for issuer in issuers
    ]}}


def info():
    return {"thumburl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ex/Example.svg/120px-Example.svg.png?utm_source=example",
            "extmetadata": {"LicenseShortName": {"value": "Public domain"}, "AttributionRequired": {"value": "false"}}}


def provider(calls, *, data=None, image_info=None, image=PNG, mime="image/png"):
    async def handle(request):
        calls.append(request)
        if request.url.host == "query.wikidata.org":
            return httpx.Response(200, json=data if data is not None else bindings("Q123"))
        if request.url.host == "commons.wikimedia.org":
            return httpx.Response(200, json={"query": {"pages": [{"imageinfo": [image_info or info()]}]}})
        assert request.url.host == "thumb.wikimedia.org"
        assert not request.url.query
        return httpx.Response(200, content=image, headers={"content-type": mime})
    return httpx.MockTransport(handle)


def test_listing_query_preserves_market_and_share_class_and_rejects_injection():
    assert listing_identity("HK", "700") == ("HK", "00700")
    assert listing_identity("US", " brk.b ") == ("US", "BRK.B")
    for market, symbol in [("CN", "00000"), ("HK", "00000"), ("US", 'A" }'), ("US", "A/B"), ("XX", "AAPL")]:
        assert listing_identity(market, symbol) is None
    cn = listing_query(("CN", "002594"))
    hk = listing_query(("HK", "00700"))
    us = listing_query(("US", "BRK.B"))
    assert "wd:Q517750" in cn and "wd:Q496672" not in cn
    assert all(f'"{ticker}"' in hk for ticker in ["700", "0700", "00700"])
    assert "wd:Q496672" in hk and "wd:Q82059" not in hk
    assert '"BRK.B"' in us and "BRK-B" not in us
    assert all(value in us for value in ["DeprecatedRank", "pq:P582", "pq:P580", "OPTIONAL", "LIMIT 21"])


def test_ambiguous_companies_and_truncated_results_are_not_guessed():
    assert logo_files(bindings("Q1", "Q2")) == []
    assert logo_files(bindings(*(["Q1"] * 21))) == []
    assert logo_files(bindings("Q1", "Q1")) == ["Example.svg"]
    assert logo_files({"results": {"bindings": [{"item": {"value": "http://www.wikidata.org/entity/Q1"}}]}}) == []


@pytest.mark.parametrize("url", ["http://thumb.wikimedia.org/wikipedia/commons/a.png", "https://127.0.0.1/a.png", "https://thumb.wikimedia.org.evil.test/wikipedia/commons/a.png", "https://user@thumb.wikimedia.org/wikipedia/commons/a.png", "https://thumb.wikimedia.org:444/wikipedia/commons/a.png"])
def test_thumbnail_rejects_untrusted_urls(url):
    data = info()
    data["thumburl"] = url
    assert thumbnail(data) is None


async def test_success_is_cached_and_concurrent_duplicates_share_one_lookup():
    calls = []
    service = CompanyLogos(transport=provider(calls))
    try:
        values = await asyncio.gather(*(service.get("HK", "700") for _ in range(8)))
        assert all(value and value.content == PNG for value in values)
        assert (await service.get("HK", "00700")) == values[0]
        assert values[0].source == "https://commons.wikimedia.org/wiki/File:Example.svg"
        assert len(calls) == 3
        assert not service.pending
    finally:
        await service.close()


async def test_missing_negative_cache_and_expiry():
    calls = []
    service = CompanyLogos(transport=provider(calls, data=bindings()))
    try:
        assert await service.get("CN", "920001") is None
        assert await service.get("CN", "920001") is None
        assert len(calls) == 1
        service.cache[("CN", "920001")] = (time.monotonic() - 1, None)
        assert await service.get("CN", "920001") is None
        assert len(calls) == 2
    finally:
        await service.close()


@pytest.mark.parametrize("response", [httpx.Response(429), httpx.Response(503), httpx.Response(302, headers={"location": "http://127.0.0.1/private"}), httpx.Response(200, content=b"not json"), httpx.Response(200, content=b"x" * (module.MAX_BYTES + 1))])
async def test_provider_failures_are_missing_without_redirects_or_retries(response):
    calls = []
    def handle(request):
        calls.append(request)
        return response
    service = CompanyLogos(transport=httpx.MockTransport(handle))
    try:
        assert await service.get("US", "AAPL") is None
        assert await service.get("US", "AAPL") is None
        if response.status_code in {429, 503}:
            assert await service.get("US", "MSFT") is None
        assert len(calls) == 1
    finally:
        await service.close()


async def test_timeout_is_missing_and_invalid_identity_never_requests():
    calls = []
    def handle(request):
        calls.append(request)
        raise httpx.ReadTimeout("fixture")
    service = CompanyLogos(transport=httpx.MockTransport(handle))
    try:
        assert await service.get("HK", "../../private") is None
        assert not calls
        assert await service.get("US", "AAPL") is None
        assert not service.pending
    finally:
        await service.close()


@pytest.mark.parametrize("image,mime", [(b"<svg><script/></svg>", "image/svg+xml"), (b"<html>wrong</html>", "image/png"), (PNG, "text/html"), (PNG + b"x" * module.MAX_BYTES, "image/png")], ids=["svg", "fake-png", "wrong-mime", "oversize"])
async def test_active_wrong_or_oversized_images_are_rejected(image, mime):
    service = CompanyLogos(transport=provider([], image=image, mime=mime))
    try:
        assert await service.get("US", "AAPL") is None
    finally:
        await service.close()


async def test_unknown_license_does_not_download_image():
    data = info()
    data["extmetadata"] = {}
    calls = []
    service = CompanyLogos(transport=provider(calls, image_info=data))
    try:
        assert await service.get("US", "AAPL") is None
        assert len(calls) == 2
    finally:
        await service.close()


async def test_cache_bound(monkeypatch):
    monkeypatch.setattr(module, "MAX_ENTRIES", 2)
    service = CompanyLogos(transport=provider([], data=bindings()))
    try:
        for symbol in ["AAA", "BBB", "CCC"]:
            await service.get("US", symbol)
        assert len(service.cache) == 2 and ("US", "AAA") not in service.cache
    finally:
        await service.close()


async def test_pending_bound_and_shutdown_cancel_upstream(monkeypatch):
    monkeypatch.setattr(module, "MAX_PENDING", 1)
    started = asyncio.Event()
    async def handle(request):
        started.set()
        await asyncio.Event().wait()
        return httpx.Response(500)
    service = CompanyLogos(transport=httpx.MockTransport(handle))
    request = asyncio.create_task(service.get("US", "AAPL"))
    await started.wait()
    assert await service.get("US", "MSFT") is None
    request.cancel()
    await asyncio.gather(request, return_exceptions=True)
    # A cancelled browser request cannot cancel the shared lookup for others.
    assert len(service.pending) == 1
    await service.close()
    assert not service.pending and service.client.is_closed


async def test_logo_http_contract_and_generic_missing(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        await app.state.logos.close()
        app.state.logos = CompanyLogos(transport=provider([]))
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            response = await client.get("/api/securities/US/AAPL/logo")
            assert response.status_code == 200 and response.content == PNG
            assert response.headers["content-type"] == "image/png"
            assert response.headers["x-content-type-options"] == "nosniff"
            assert 'rel="describedby"' in response.headers["link"]
            assert (await client.get("/api/securities/XX/AAPL/logo")).status_code == 404
