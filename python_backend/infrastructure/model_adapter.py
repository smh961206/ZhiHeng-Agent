"""Provider wire protocol adapters. Business code must never import this module."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, AsyncIterator, Callable
from urllib.parse import urlsplit

import httpx

PUBLIC_MESSAGES = {
    "authentication": "模型服务认证失败，请检查服务端配置",
    "rate_limit": "模型服务当前繁忙，请稍后重试",
    "provider_unavailable": "模型服务暂不可用，请稍后重试",
    "provider_request": "模型服务拒绝了当前请求",
    "network": "模型服务网络连接失败",
    "timeout": "模型服务响应超时",
    "malformed_response": "模型服务返回格式无效",
    "truncated": "模型服务返回内容不完整",
    "refusal": "模型服务未完成当前请求",
    "response_too_large": "模型服务返回内容超过安全上限",
}


class ModelGatewayError(RuntimeError):
    def __init__(self, category: str, *, status: int | None = None):
        super().__init__(PUBLIC_MESSAGES.get(category, PUBLIC_MESSAGES["malformed_response"]))
        self.category = category if category in PUBLIC_MESSAGES else "malformed_response"
        self.status = status
        self.retryable = self.category in {"rate_limit", "provider_unavailable", "network", "timeout"}


def validate_base_url(value: str) -> str:
    parsed = urlsplit(value)
    local = parsed.hostname in {"127.0.0.1", "localhost", "::1"}
    if (
        parsed.scheme not in ({"http", "https"} if local else {"https"})
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("模型地址必须是无凭据、无查询参数的 HTTPS 地址；仅本机允许 HTTP")
    return value.rstrip("/")


def classify_http(status: int) -> str:
    if status in {401, 403}:
        return "authentication"
    if status == 429:
        return "rate_limit"
    if status >= 500:
        return "provider_unavailable"
    return "provider_request"


@dataclass(frozen=True)
class AdapterResponse:
    content: str
    usage: dict[str, int | None]
    finish_reason: str


class OpenAICompatibleAdapter:
    def __init__(self, *, transport: httpx.AsyncBaseTransport | None = None, max_response_bytes: int = 8_000_000):
        self.transport = transport
        self.max_response_bytes = max_response_bytes

    @staticmethod
    def _usage(value: object) -> dict[str, int | None]:
        raw = value if isinstance(value, dict) else {}
        result: dict[str, int | None] = {}
        for target, source in (("inputTokens", "prompt_tokens"), ("outputTokens", "completion_tokens"), ("totalTokens", "total_tokens"), ("cachedInputTokens", "prompt_cache_hit_tokens")):
            item = raw.get(source)
            result[target] = item if isinstance(item, int) and not isinstance(item, bool) and item >= 0 else None
        if result["totalTokens"] is not None and result["inputTokens"] is not None and result["outputTokens"] is not None:
            if result["totalTokens"] != result["inputTokens"] + result["outputTokens"]:
                result["totalTokens"] = None
        if result["cachedInputTokens"] is not None and result["inputTokens"] is not None and result["cachedInputTokens"] > result["inputTokens"]:
            result["cachedInputTokens"] = None
        return result

    async def complete(self, *, base_url: str, secret: str, payload: dict[str, Any], timeout_seconds: float) -> AdapterResponse:
        timeout = httpx.Timeout(timeout_seconds, connect=min(15, timeout_seconds))
        try:
            async with httpx.AsyncClient(timeout=timeout, transport=self.transport) as client:
                response = await client.post(base_url + "/chat/completions", headers={"Authorization": f"Bearer {secret}"}, json=payload)
                if not response.is_success:
                    raise ModelGatewayError(classify_http(response.status_code), status=response.status_code)
                body = await response.aread()
        except ModelGatewayError:
            raise
        except httpx.TimeoutException as error:
            raise ModelGatewayError("timeout") from error
        except (httpx.NetworkError, httpx.RemoteProtocolError) as error:
            raise ModelGatewayError("network") from error
        if len(body) > self.max_response_bytes:
            raise ModelGatewayError("response_too_large")
        try:
            data = json.loads(body)
            choice = data["choices"][0]
            message = choice["message"]
            content = message.get("content")
            finish = choice.get("finish_reason")
        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise ModelGatewayError("malformed_response") from error
        if message.get("refusal") or finish == "content_filter":
            raise ModelGatewayError("refusal")
        if finish == "length":
            raise ModelGatewayError("truncated")
        if not isinstance(content, str) or not content.strip() or finish not in {"stop", "tool_calls"}:
            raise ModelGatewayError("malformed_response")
        return AdapterResponse(content=content, usage=self._usage(data.get("usage")), finish_reason=finish)

    async def stream(
        self,
        *,
        base_url: str,
        secret: str,
        payload: dict[str, Any],
        timeout_seconds: float,
        on_usage: Callable[[dict[str, int | None]], None] | None = None,
    ) -> AsyncIterator[str]:
        timeout = httpx.Timeout(timeout_seconds, connect=min(15, timeout_seconds))
        total = 0
        finished = False
        try:
            async with httpx.AsyncClient(timeout=timeout, transport=self.transport) as client:
                async with client.stream("POST", base_url + "/chat/completions", headers={"Authorization": f"Bearer {secret}"}, json=payload) as response:
                    if not response.is_success:
                        raise ModelGatewayError(classify_http(response.status_code), status=response.status_code)
                    async for line in response.aiter_lines():
                        total += len(line.encode("utf-8"))
                        if total > self.max_response_bytes:
                            raise ModelGatewayError("response_too_large")
                        if not line.startswith("data: "):
                            continue
                        if line == "data: [DONE]":
                            break
                        try:
                            frame = json.loads(line[6:])
                            if not isinstance(frame, dict):
                                raise TypeError
                            raw_usage = frame.get("usage")
                            if isinstance(raw_usage, dict) and on_usage:
                                on_usage(self._usage(raw_usage))
                            choices = frame.get("choices")
                            if not isinstance(choices, list):
                                raise TypeError
                            if not choices and isinstance(raw_usage, dict):
                                continue
                            choice = choices[0]
                            if not isinstance(choice, dict):
                                raise TypeError
                            delta = choice.get("delta", {})
                        except (KeyError, IndexError, TypeError, ValueError) as error:
                            raise ModelGatewayError("malformed_response") from error
                        if delta.get("refusal") or choice.get("finish_reason") == "content_filter":
                            raise ModelGatewayError("refusal")
                        if choice.get("finish_reason") == "length":
                            raise ModelGatewayError("truncated")
                        if choice.get("finish_reason") == "stop":
                            finished = True
                        content = delta.get("content")
                        if content is not None and not isinstance(content, str):
                            raise ModelGatewayError("malformed_response")
                        if content:
                            yield content
        except asyncio.CancelledError:
            raise
        except ModelGatewayError:
            raise
        except httpx.TimeoutException as error:
            raise ModelGatewayError("timeout") from error
        except (httpx.NetworkError, httpx.RemoteProtocolError) as error:
            raise ModelGatewayError("network") from error
        if not finished:
            raise ModelGatewayError("truncated")
