from __future__ import annotations

import logging
import time
import uuid
from urllib.parse import urlparse

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from starlette.types import ASGIApp

log = logging.getLogger("zhiheng.http")
DEFAULT_ORIGINS = {"http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:5173", "http://127.0.0.1:5173"}


class AccessPolicyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, origins: tuple[str, ...] = ()) -> None:
        super().__init__(app)
        self.origins = DEFAULT_ORIGINS | set(origins)
        if any(urlparse(value).scheme not in {"http", "https"} or value.endswith("/") or not urlparse(value).hostname for value in self.origins):
            raise ValueError("PUBLIC_ORIGINS 必须为完整 origin，例如 https://research.example.com")
        self.hosts = {"localhost", "127.0.0.1", *(urlparse(origin).hostname for origin in self.origins)}

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        origin = request.headers.get("origin")
        if request.url.hostname not in self.hosts or request.method not in {"GET", "HEAD", "OPTIONS"} and origin and origin not in self.origins:
            return JSONResponse({"error": "访问地址或请求来源未获允许"}, status_code=403)
        return await call_next(request)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metrics = getattr(request.app.state, "metrics", None)
        if metrics:
            metrics.increment(f"http.status.{response.status_code}")
            metrics.observe_ms("http.duration", duration_ms)
        log.info(
            "request_complete",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
