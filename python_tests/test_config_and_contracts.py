from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from python_backend.api.schemas import ExchangeRequest, QuotesRequest
from python_backend.config import Settings


def test_settings_parse_environment_and_are_immutable(monkeypatch):
    monkeypatch.setenv("PORT", "4100")
    monkeypatch.setenv("PUBLIC_ORIGINS", "https://research.example.com, https://review.example.com")
    monkeypatch.setenv("WEB_SEARCH_ENABLED", "false")
    monkeypatch.setenv("WEB_RESEARCH_ISSUER_DOMAINS", '{"US:AAPL":["investor.apple.com","bad host"]}')
    settings = Settings(root=Path.cwd(), initialize_services=False)
    assert settings.port == 4100
    assert settings.public_origins == ("https://research.example.com", "https://review.example.com")
    assert settings.web_search_enabled is False
    assert settings.web_research_issuer_domains == {"US:AAPL": ("investor.apple.com",)}
    with pytest.raises(ValidationError):
        settings.port = 4200


def test_settings_reject_invalid_operational_limits():
    with pytest.raises(ValidationError):
        Settings(port=70_000)
    with pytest.raises(ValidationError):
        Settings(max_concurrent_research=0)


def test_request_contracts_normalize_symbols_and_reject_unknown_fields():
    quotes = QuotesRequest.model_validate({"securities": [{"market": "US", "symbol": " aapl "}]})
    assert quotes.securities[0].symbol == "AAPL"
    exchanges = ExchangeRequest.model_validate({"symbols": ["brk.b"]})
    assert exchanges.symbols == ["BRK.B"]
    with pytest.raises(ValidationError):
        QuotesRequest.model_validate({"securities": [{"market": "US", "symbol": "AAPL", "currency": "USD"}]})


@pytest.mark.asyncio
async def test_request_context_and_access_policy(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            response = await client.get("/api/config", headers={"x-request-id": "trace-123"})
            assert response.headers["x-request-id"] == "trace-123"
            denied = await client.post("/api/research/path", json={"question": "AAPL"}, headers={"origin": "https://attacker.example"})
            assert denied.status_code == 403
            assert denied.json() == {"error": "访问地址或请求来源未获允许"}


@pytest.mark.asyncio
async def test_validation_errors_keep_public_error_envelope(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            response = await client.post("/api/research/path", json={"question": "  ", "unexpected": True})
            assert response.status_code == 422
            assert set(response.json()) == {"error"}
