import httpx
import pytest


@pytest.mark.asyncio
async def test_health_config_and_path_contract(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            assert (await client.get("/api/health")).json() == {"ok": True, "storage": "mongodb"}
            config = (await client.get("/api/config")).json()
            assert config["knowledgeVersion"] == "K1.0.0"
            path = await client.post("/api/research/path", json={"question": "比较 AAPL 和 MSFT"})
            assert path.json()["mode"] == "D"


@pytest.mark.asyncio
async def test_create_idempotency_and_terminal_stream(configured):
    app, storage = configured
    key = "12345678-1234-4123-8123-123456789abc"
    payload = {"question": "研究 $AAPL", "mode": "B", "securities": [{"market": "US", "symbol": "AAPL"}]}
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            first = await client.post("/api/jobs", json=payload, headers={"idempotency-key": key})
            second = await client.post("/api/jobs", json=payload, headers={"idempotency-key": key})
            assert first.status_code == 201 and second.status_code == 200
            job_id = first.json()["id"]
            for _ in range(20):
                await __import__("asyncio").sleep(0)
                if storage.jobs[job_id]["status"] == "completed":
                    break
            response = await client.get(f"/api/jobs/{job_id}/stream")
            assert "event: done" in response.text
            assert "submission" not in (await client.get(f"/api/jobs/{job_id}")).json()


@pytest.mark.asyncio
async def test_spa_fallback(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:3001") as client:
            assert (await client.get("/missing.js")).status_code == 404


def test_openapi_contract_exposes_api_routes_only(configured):
    app, _ = configured
    schema = app.openapi()
    assert "/api/jobs" in schema["paths"]
    assert "/api/research/path" in schema["paths"]
    assert "/{path}" not in schema["paths"]
    assert "QuestionRequest" in schema["components"]["schemas"]


@pytest.mark.asyncio
async def test_plan_resolves_security_and_enforces_comparison_cardinality(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            resolved = await client.post("/api/research/plan", json={"question": "研究 $AAPL", "mode": "B"})
            assert resolved.status_code == 200
            assert resolved.json()["securities"][0]["symbol"] == "AAPL"
            invalid = await client.post("/api/research/plan", json={"question": "比较 $AAPL", "mode": "D"})
            assert invalid.status_code == 400 and "至少需要2个" in invalid.json()["error"]


@pytest.mark.asyncio
async def test_material_capacity_and_save_request_contract(configured):
    app, _ = configured
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://127.0.0.1:3001") as client:
            permits = app.state.material_reads._value
            for _ in range(permits):
                await app.state.material_reads.acquire()
            try:
                busy = await client.post("/api/materials/read", content=b"document")
            finally:
                for _ in range(permits):
                    app.state.material_reads.release()
            assert busy.status_code == 429
            missing_body = await client.post("/api/jobs/unknown/save")
            assert missing_body.status_code == 422
