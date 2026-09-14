from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import pytest

from python_backend.api.factory import create_app
from python_backend.config import Settings
from python_backend.domain.contracts import ApiError, validate_payload


def test_research_cutoff_is_typed_and_future_cutoffs_fail():
    value = validate_payload({"question": "研究 AAPL"})
    assert datetime.fromisoformat(value["researchCutoff"].replace("Z", "+00:00")).tzinfo is not None
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    with pytest.raises(ApiError, match="不能晚于"):
        validate_payload({"question": "研究 AAPL", "researchCutoff": future})


def test_layered_packages_exist_and_flat_business_modules_are_absent():
    root = Path(__file__).resolve().parent.parent / "python_backend"
    assert all((root / name / "__init__.py").is_file() for name in ("api", "application", "domain", "infrastructure"))
    for retired in ("research.py", "storage.py", "gateway.py", "evidence.py", "financial.py"):
        assert not (root / retired).exists()


def test_business_layers_do_not_call_providers_or_name_models():
    root = Path(__file__).resolve().parent.parent / "python_backend"
    forbidden = ("api.openai.com", "api.deepseek.com", "bigmodel.cn", "data.sec.gov", "hkexnews.hk", "cninfo.com.cn")
    for layer in ("application", "domain"):
        for source in (root / layer).rglob("*.py"):
            text = source.read_text(encoding="utf-8")
            assert not any(value in text for value in forbidden), source


@pytest.mark.asyncio
async def test_request_body_limit_rate_limit_and_metrics(configured):
    _, storage = configured
    settings = Settings(root=Path.cwd(), initialize_services=False, max_request_bytes=1024, api_rate_limit_per_minute=10)
    app = create_app(settings, storage=storage, gateway=__import__("python_tests.conftest", fromlist=["FakeGateway"]).FakeGateway())
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            too_large = await client.post("/api/research/path", content=b"x" * 1025, headers={"content-type": "application/json"})
            assert too_large.status_code == 413
            for _ in range(10):
                assert (await client.post("/api/research/path", json={"question": "AAPL"})).status_code == 200
            limited = await client.post("/api/research/path", json={"question": "AAPL"})
            assert limited.status_code == 429
            metrics = (await client.get("/api/metrics")).json()["metrics"]
            assert metrics["http.status.200"] >= 10
