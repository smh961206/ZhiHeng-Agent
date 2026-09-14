from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator
from urllib.parse import unquote

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse

from ..application.knowledge import KnowledgeSession, KnowledgeStore
from ..application.ports import ModelGatewayPort, StoragePort
from ..application.research_pipeline import ResearchPipeline
from ..application.research_service import ResearchService
from ..config import Settings
from ..domain.contracts import MODES, RESEARCH_STAGES, ApiError, now, public_job
from ..domain.research_budget import load_configuration
from ..domain.research_budget import summary as budget_summary
from ..domain.securities import resolve_securities
from ..infrastructure.company_logos import CompanyLogos
from ..infrastructure.data_archive import DataArchive
from ..infrastructure.data_providers import LongportProvider, TushareFinancials
from ..infrastructure.documents import read_document_with_vision
from ..infrastructure.market import MarketData, lookup_sec_exchanges
from ..infrastructure.model_gateway import ModelGateway
from ..infrastructure.mongo_storage import MongoStorage
from ..infrastructure.official_evidence import OfficialEvidenceCollector
from ..infrastructure.web_research import WebResearchCollector
from ..observability import Metrics, configure_logging
from .events import EventHub
from .middleware import AccessPolicyMiddleware, RequestContextMiddleware
from .schemas import ExchangeRequest, QuestionRequest, QuotesRequest, RetryRequest, SaveRequest
from .security import RateLimitMiddleware, RequestBodyLimitMiddleware, RequestTimeoutMiddleware


def create_app(settings: Settings | None = None, *, storage: StoragePort | None = None, gateway: ModelGatewayPort | None = None) -> FastAPI:
    active = settings or Settings.from_env()
    configure_logging(active.log_level)
    hub = EventHub()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        current_storage = storage or MongoStorage(active.mongodb_uri, active.mongodb_database)
        current_gateway = gateway or ModelGateway(
            active.root,
            config_file=active.model_config_file,
            pricing_file=active.model_pricing_file,
            idle_timeout_ms=active.llm_timeout_ms,
            timeout_ms=active.llm_max_duration_ms,
        )
        current_knowledge = KnowledgeStore(active.root)
        if active.initialize_services:
            await current_storage.initialize()
            current_knowledge.current()
        app.state.storage = current_storage
        app.state.metrics = Metrics()
        app.state.material_reads = asyncio.Semaphore(active.max_concurrent_material_reads)
        set_recorder = getattr(current_gateway, "set_recorder", None)
        record_model_call = getattr(current_storage, "record_model_call", None)
        if active.model_telemetry_enabled and callable(set_recorder) and callable(record_model_call):
            async def record_model_metric(record: dict) -> None:
                app.state.metrics.increment("model.calls")
                app.state.metrics.increment(f"model.status.{record.get('status', 'unknown')}")
                await record_model_call(record)

            set_recorder(record_model_metric)
        app.state.gateway = current_gateway
        app.state.longport = LongportProvider(active.longbridge_app_key, active.longbridge_app_secret, active.longbridge_access_token)
        app.state.financials = TushareFinancials(active.tushare_token)
        app.state.web_research = WebResearchCollector(
            enabled=active.web_search_enabled,
            tavily_key=active.tavily_api_key,
            brave_key=active.brave_search_api_key,
            issuer_domains=active.web_research_issuer_domains,
            archive=DataArchive(current_storage),
        )
        app.state.market = MarketData(app.state.longport)
        app.state.logos = CompanyLogos()
        app.state.knowledge = current_knowledge
        app.state.research = ResearchService(
            current_storage,
            current_gateway,
            hub.publish,
            active.max_concurrent_research,
            current_knowledge,
            ResearchPipeline(
                app.state.market,
                OfficialEvidenceCollector(active.sec_user_agent),
                (app.state.financials, app.state.longport, app.state.web_research),
            ),
            active.task_lease_seconds,
            budget_configuration=load_configuration(
                (active.root / active.research_budget_file).resolve() if active.research_budget_file else None,
                active.research_budget_mode,
            ),
        )
        await app.state.research.start()
        try:
            yield
        finally:
            await app.state.research.shutdown()
            await app.state.market.close()
            await app.state.financials.close()
            await app.state.web_research.close()
            await app.state.logos.close()
            if active.initialize_services:
                await current_storage.close()

    app = FastAPI(title="ZhiHeng Agent API", version="V5.3", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.add_middleware(AccessPolicyMiddleware, origins=active.public_origins)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(RequestTimeoutMiddleware, timeout_seconds=active.api_timeout_seconds)
    app.add_middleware(RateLimitMiddleware, requests=active.api_rate_limit_per_minute)
    app.add_middleware(RequestBodyLimitMiddleware, max_bytes=active.max_request_bytes)

    @app.exception_handler(ApiError)
    async def api_error(_: Request, error: ApiError) -> JSONResponse:
        return JSONResponse({"error": str(error)}, status_code=error.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
        first = error.errors()[0] if error.errors() else {}
        message = str(first.get("msg", "请求格式无效")).removeprefix("Value error, ")
        return JSONResponse({"error": message}, status_code=422)

    @app.get("/api/health")
    async def health() -> JSONResponse:
        try:
            await app.state.storage.ping()
            return JSONResponse({"ok": True, "storage": "mongodb"})
        except Exception:
            return JSONResponse({"ok": False, "storage": "mongodb"}, status_code=503)

    @app.get("/api/config")
    async def config() -> dict:
        return {
            **app.state.gateway.status(),
            "modelSelection": app.state.gateway.public_selection(),
            "modes": MODES,
            "knowledgeVersion": "K1.0.0",
            "knowledgeSnapshotId": "K1.0.0",
            "researchStages": RESEARCH_STAGES,
            "researchBudget": {
                "configured": app.state.research.budget_configuration is not None,
                "mode": active.research_budget_mode,
            },
            "dataProvider": "Python 统一采集与证据处理；缺失资料保持缺失",
            "dataProviders": {
                "tushare": {"configured": app.state.financials.configured},
                "longbridge": {"configured": app.state.longport.configured},
                "publicMarketFallback": {"configured": True},
            },
            "webSearch": {
                "enabled": active.web_search_enabled,
                "configured": app.state.web_research.configured,
                "providers": [
                    *(["Tavily"] if active.tavily_api_key else []),
                    *(["Brave"] if active.brave_search_api_key else []),
                ],
                "policy": "只读取监管机构或显式绑定的发行人域名正文；搜索摘要不进入证据",
            },
            "markets": ["CN", "HK", "US"],
            "secUserAgentConfigured": bool(active.sec_user_agent),
        }

    @app.get("/api/metrics")
    async def metrics() -> dict:
        return {"version": 1, "metrics": app.state.metrics.snapshot()}

    @app.post("/api/research/path")
    async def research_path(body: QuestionRequest) -> dict:
        decision = await app.state.research.path_resolver.recommend(body.question)
        return {**decision, "name": MODES[decision["mode"]]["name"]}

    @app.post("/api/research/plan")
    async def research_plan(request: Request) -> dict:
        return await app.state.research.plan(await request.json())

    @app.post("/api/securities/resolve")
    async def securities_resolve(body: QuestionRequest) -> dict:
        return await resolve_securities(body.question)

    @app.post("/api/securities/exchanges")
    async def exchanges(body: ExchangeRequest) -> list:
        return await lookup_sec_exchanges(list(dict.fromkeys(body.symbols)), user_agent=active.sec_user_agent)

    @app.get("/api/securities/{market}/{symbol}/logo")
    async def company_logo(market: str, symbol: str) -> Response:
        logo = await app.state.logos.get(market, symbol)
        if logo is None:
            return Response(status_code=404, headers={"Cache-Control": "public, max-age=60"})
        return Response(logo.content, media_type=logo.media_type, headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            "Link": f'<{logo.source}>; rel="describedby"',
        })

    @app.post("/api/quotes")
    async def quotes(body: QuotesRequest) -> list:
        securities = [item.model_dump(exclude_none=True) for item in body.securities]
        results = await asyncio.gather(*(app.state.market.quote(item) for item in securities), return_exceptions=True)
        return [
            {"security": item, "quote": value} if not isinstance(value, Exception) else {"security": item, "error": str(value)}
            for item, value in zip(securities, results, strict=True)
        ]

    @app.get("/api/materials/capabilities")
    async def material_capabilities() -> dict:
        return {"enabled": True, "documentPipeline": True, "model": app.state.gateway.public_selection().get("visionModel")}

    @app.post("/api/materials/read")
    async def material_read(request: Request) -> dict:
        if app.state.material_reads.locked():
            raise ApiError(429, "原件读取繁忙，请稍后重试")
        name = unquote(request.headers.get("x-document-name", "document.pdf"))
        if not name or len(name) > 200 or "\x00" in name:
            raise ApiError(400, "文件名无效或过长")
        async with app.state.material_reads:
            try:
                return await asyncio.wait_for(
                    read_document_with_vision(await request.body(), name, app.state.gateway),
                    timeout=active.material_timeout_seconds,
                )
            except TimeoutError as error:
                raise ApiError(504, "原件读取超时，请缩小文件后重试") from error

    @app.get("/api/jobs")
    async def list_jobs() -> list:
        return await app.state.storage.list_jobs()

    @app.post("/api/jobs")
    async def create_job(request: Request) -> JSONResponse:
        job, replayed = await app.state.research.create(await request.json(), request.headers.get("idempotency-key"))
        return JSONResponse(public_job(job), status_code=200 if replayed else 201)

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: str) -> dict:
        job = await app.state.research.get(job_id)
        if not job:
            raise ApiError(404, "任务不存在")
        return public_job(job)

    @app.delete("/api/jobs/{job_id}")
    async def delete_job(job_id: str) -> dict:
        if job_id in app.state.research.tasks:
            raise ApiError(409, "研究正在运行或处理中，请等待结束后再删除")
        await app.state.storage.delete_job(job_id)
        return {"ok": True}

    @app.post("/api/jobs/{job_id}/cancel")
    async def cancel_job(job_id: str) -> dict:
        if not await app.state.research.get(job_id):
            raise ApiError(404, "任务不存在")
        await app.state.research.cancel(job_id)
        return {"ok": True}

    @app.post("/api/jobs/{job_id}/retry")
    async def retry_job(job_id: str, body: RetryRequest) -> dict:
        return public_job(await app.state.research.retry(job_id, body.expectedRetryCount))

    @app.post("/api/jobs/{job_id}/save")
    async def save_job(job_id: str, body: SaveRequest) -> dict:
        return public_job(await app.state.research.retry_delivery(job_id, body.expectedRetryCount))

    @app.get("/api/jobs/{job_id}/cost")
    async def job_cost(job_id: str) -> dict:
        job = await app.state.research.get(job_id)
        if not job:
            raise ApiError(404, "任务不存在")
        result = await app.state.storage.model_cost_summary(job_id)
        if job.get("budgetState") is not None:
            result["budget"] = budget_summary(job["budgetState"], at=now())
        return result

    @app.get("/api/jobs/{job_id}/rules")
    async def job_rules(job_id: str, record: str = "") -> dict:
        job = await app.state.research.get(job_id)
        if not job:
            raise ApiError(404, "任务不存在")
        reference = job.get("plan", {}).get("knowledgeSnapshot")
        usage = job.get("knowledgeUsage", {})
        if not record or not isinstance(reference, dict):
            raise ApiError(404, "此任务未保存对应规则的读取记录")
        try:
            snapshot = app.state.knowledge.open(reference["version"], reference["id"])
            return KnowledgeSession(snapshot, usage.get("records", [])).excerpt(record)
        except KeyError as error:
            raise ApiError(404, str(error).strip("'")) from error
        except (OSError, ValueError) as error:
            raise ApiError(409, "原规则快照暂不可读取，已保留读取记录，请检查归档后重试") from error

    @app.get("/api/jobs/{job_id}/stream")
    async def job_stream(job_id: str) -> StreamingResponse:
        job = await app.state.research.get(job_id)
        if not job:
            raise ApiError(404, "任务不存在")
        return StreamingResponse(
            hub.stream(job_id, job, app.state.research.get),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff"},
        )

    @app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    async def spa(path: str) -> Response:
        dist = (active.root / "dist").resolve()
        candidate = (dist / path).resolve()
        if candidate != dist and dist not in candidate.parents:
            raise ApiError(403, "路径无效")
        if candidate.is_file():
            return FileResponse(candidate)
        if Path(path).suffix:
            raise ApiError(404, "文件不存在")
        index = dist / "index.html"
        if index.is_file():
            return FileResponse(index)
        raise ApiError(404, "请先运行 pnpm build，或用 pnpm dev 启动开发模式")

    return app


app = create_app()
