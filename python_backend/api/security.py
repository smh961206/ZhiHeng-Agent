"""Bounded request processing for the single-instance FastAPI service."""

from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from time import monotonic

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers", []))
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            declared = self.max_bytes + 1
        if declared > self.max_bytes:
            await JSONResponse({"error": "请求内容超过允许上限"}, status_code=413)(scope, receive, send)
            return
        parts: list[bytes] = []
        consumed = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                continue
            body = message.get("body", b"")
            consumed += len(body)
            if consumed > self.max_bytes:
                await JSONResponse({"error": "请求内容超过允许上限"}, status_code=413)(scope, receive, send)
                return
            parts.append(body)
            if not message.get("more_body", False):
                break
        replayed = False

        async def bounded_receive() -> Message:
            nonlocal replayed
            if replayed:
                return await receive()
            replayed = True
            return {"type": "http.request", "body": b"".join(parts), "more_body": False}

        await self.app(scope, bounded_receive, send)


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp, requests: int, window_seconds: int = 60) -> None:
        self.app = app
        self.requests = requests
        self.window_seconds = window_seconds
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = asyncio.Lock()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") in {"GET", "HEAD", "OPTIONS"}:
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        key = client[0] if client else "unknown"
        current = monotonic()
        async with self.lock:
            values = self.hits[key]
            while values and values[0] <= current - self.window_seconds:
                values.popleft()
            if len(values) >= self.requests:
                await JSONResponse({"error": "当前请求较多，请稍后重试"}, status_code=429, headers={"Retry-After": str(self.window_seconds)})(scope, receive, send)
                return
            values.append(current)
        await self.app(scope, receive, send)


class RequestTimeoutMiddleware:
    def __init__(self, app: ASGIApp, timeout_seconds: float, excluded_paths: tuple[str, ...] = ("/api/materials/read",)) -> None:
        self.app = app
        self.timeout_seconds = timeout_seconds
        self.excluded_paths = excluded_paths

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = str(scope.get("path", ""))
        stream = path.endswith("/stream")
        if scope["type"] != "http" or stream or path in self.excluded_paths:
            await self.app(scope, receive, send)
            return
        try:
            async with asyncio.timeout(self.timeout_seconds):
                await self.app(scope, receive, send)
        except TimeoutError:
            await JSONResponse({"error": "请求处理超时，请稍后重试"}, status_code=504)(scope, receive, send)
