import json
from pathlib import Path

import httpx
import pytest

from python_backend.infrastructure import model_gateway as gateway_module
from python_backend.infrastructure.model_adapter import ModelGatewayError
from python_backend.infrastructure.model_gateway import ModelConfigurationError, ModelGateway


def config_file(tmp_path: Path, *, base_url: str = "https://model.example/v1", candidates: bool = False) -> Path:
    models = {
        "primary": {"model": "fixture-primary", "baseUrl": base_url, "apiKeyEnv": "MODEL_KEY", "quality": 0.9},
    }
    researcher: str | list[str] = "primary"
    if candidates:
        models["fallback"] = {"model": "fixture-fallback", "baseUrl": base_url, "apiKeyEnv": "MODEL_KEY", "quality": 0.8}
        researcher = ["primary", "fallback"]
    value = {
        "schemaVersion": 2,
        "models": models,
        "pipeline": {
            "input": "primary",
            "vision": "primary",
            "researcher": researcher,
            "writer": "primary",
            "evidenceVerifier": "primary",
            "auditor": "primary",
            "criticalReviewer": [],
            "judge": [],
        },
    }
    path = tmp_path / "models.json"
    path.write_text(json.dumps(value), encoding="utf-8")
    return path


@pytest.mark.asyncio
async def test_gateway_classifies_errors_retries_network_and_records_without_prompts(tmp_path, monkeypatch):
    path = config_file(tmp_path)
    calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls < 3:
            raise httpx.ConnectError("private endpoint detail", request=request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "answer"}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 2, "completion_tokens": 1, "total_tokens": 3}})

    async def no_wait(_: float) -> None:
        return None

    monkeypatch.setattr(gateway_module.asyncio, "sleep", no_wait)
    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    records = []

    async def record(value):
        records.append(value)

    gateway.set_recorder(record)
    with gateway.job_scope("job-1"):
        assert await gateway.complete(
            "auditor",
            [{"role": "user", "content": "private prompt"}],
            prompt_context={
                "promptId": "delivery-auditor",
                "purpose": "auditor",
                "promptVersion": 1,
                "manifestFingerprint": "a" * 64,
                "contextVersion": 2,
                "requiredComplete": True,
                "messageCount": 1,
                "serializedCharacters": 50,
            },
        ) == "answer"
    assert calls == 3
    assert records[0]["jobId"] == "job-1"
    assert records[0]["promptContext"]["promptId"] == "delivery-auditor"
    assert "messages" not in records[0] and "private prompt" not in json.dumps(records[0], default=str)


@pytest.mark.asyncio
async def test_gateway_stream_requires_terminal_frame_and_never_replays_partial_output(tmp_path):
    path = config_file(tmp_path)

    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text='data: {"choices":[{"delta":{"content":"partial"},"finish_reason":null}]}\n\n', headers={"content-type": "text/event-stream"})

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    stream = await gateway.complete("researcher", [{"role": "user", "content": "x"}], stream=True)
    chunks = []
    with pytest.raises(ModelGatewayError, match="不完整"):
        async for chunk in stream:
            chunks.append(chunk)
    assert chunks == ["partial"]


@pytest.mark.asyncio
async def test_gateway_rejects_prompt_metadata_that_could_hide_private_content(tmp_path):
    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(config_file(tmp_path)))
    with pytest.raises(ModelGatewayError, match="返回格式无效"):
        await gateway.complete(
            "writer",
            [{"role": "user", "content": "x"}],
            prompt_context={
                "promptId": "private user question",
                "purpose": "writer",
                "promptVersion": 1,
                "manifestFingerprint": "a" * 64,
            },
        )


def test_gateway_rejects_unsafe_urls_and_pins_candidate_configuration(tmp_path):
    unsafe = config_file(tmp_path, base_url="https://user:secret@model.example/v1")
    with pytest.raises(ModelConfigurationError):
        ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(unsafe)).pinned_state()
    safe = config_file(tmp_path, candidates=True)
    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(safe))
    state = gateway.pinned_state()
    assert state["version"] == 2
    assert len(state["assignments"]["researcher"]) == 2
    assert "model.example" not in json.dumps(state)
    gateway.assert_compatible(gateway._state(1))
    changed = {**state, "configurationFingerprint": "changed"}
    with pytest.raises(ModelConfigurationError, match="不能静默续跑"):
        gateway.assert_compatible(changed)


def test_gateway_rejects_unassigned_models_like_the_pipeline_contract(tmp_path):
    path = config_file(tmp_path)
    config = json.loads(path.read_text(encoding="utf-8"))
    config["models"]["unused"] = {
        "model": "fixture-unused",
        "baseUrl": "https://unused.example/v1",
        "apiKeyEnv": "UNUSED_MODEL_KEY",
    }
    path.write_text(json.dumps(config), encoding="utf-8")

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path))
    assert gateway.status()["configurationError"] is True


@pytest.mark.parametrize("change", [{"apiKey": "secret"}, {"quality": float("nan")}, {"priority": -1}, {"contextWindow": 0}, {"currency": "usd"}])
def test_gateway_rejects_unknown_secret_and_invalid_governance_metadata(tmp_path, change):
    path = config_file(tmp_path)
    config = json.loads(path.read_text(encoding="utf-8"))
    config["models"]["primary"].update(change)
    path.write_text(json.dumps(config), encoding="utf-8")
    assert ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path)).status()["configurationError"] is True


def test_gateway_loads_model_keys_from_root_env_file(tmp_path, monkeypatch):
    path = config_file(tmp_path)
    (tmp_path / ".env").write_text("MODEL_KEY=secret-from-file\n", encoding="utf-8")
    monkeypatch.delenv("MODEL_KEY", raising=False)

    gateway = ModelGateway(tmp_path, config_file=str(path))

    assert gateway.status()["configured"] is True
    assert gateway._select("researcher")[2] == "secret-from-file"


def test_gateway_skips_assigned_candidate_without_key(tmp_path):
    path = config_file(tmp_path, candidates=True)
    config = json.loads(path.read_text(encoding="utf-8"))
    config["models"]["primary"]["apiKeyEnv"] = "MISSING_PRIMARY_KEY"
    for purpose in ("input", "vision", "writer", "evidenceVerifier", "auditor"):
        config["pipeline"][purpose] = "fallback"
    path.write_text(json.dumps(config), encoding="utf-8")

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path))

    assert gateway.status()["configured"] is True
    key, _, secret = gateway._select("researcher")
    assert key == "fallback"
    assert secret == "secret"


@pytest.mark.asyncio
async def test_non_stream_gateway_fails_over_to_next_quality_candidate(tmp_path, monkeypatch):
    path = config_file(tmp_path, candidates=True)
    selected = []

    async def handler(request: httpx.Request) -> httpx.Response:
        model = json.loads(request.content)["model"]
        selected.append(model)
        if model == "fixture-primary":
            return httpx.Response(503, json={"error": "unavailable"})
        return httpx.Response(200, json={"choices": [{"message": {"content": "fallback answer"}, "finish_reason": "stop"}]})

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    monkeypatch.setattr(gateway_module.asyncio, "sleep", _no_wait)
    assert await gateway.complete("researcher", [{"role": "user", "content": "x"}]) == "fallback answer"
    assert selected == ["fixture-primary", "fixture-primary", "fixture-primary", "fixture-fallback"]


@pytest.mark.asyncio
async def test_stream_gateway_fails_over_before_first_delta(tmp_path, monkeypatch):
    path = config_file(tmp_path, candidates=True)
    selected = []

    async def handler(request: httpx.Request) -> httpx.Response:
        model = json.loads(request.content)["model"]
        selected.append(model)
        if model == "fixture-primary":
            return httpx.Response(503, json={"error": "unavailable"})
        return httpx.Response(
            200,
            text='data: {"choices":[{"delta":{"content":"complete"},"finish_reason":null}]}\n\n'
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'
            "data: [DONE]\n\n",
            headers={"content-type": "text/event-stream"},
        )

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    monkeypatch.setattr(gateway_module.asyncio, "sleep", _no_wait)
    stream = await gateway.complete("researcher", [{"role": "user", "content": "x"}], stream=True)
    assert [chunk async for chunk in stream] == ["complete"]
    assert selected == ["fixture-primary", "fixture-primary", "fixture-primary", "fixture-fallback"]


@pytest.mark.asyncio
async def test_stream_gateway_records_provider_usage_frame_for_the_job(tmp_path):
    path = config_file(tmp_path)

    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            text='data: {"choices":[{"delta":{"content":"complete"},"finish_reason":null}]}\n\n'
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'
            'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":4,"total_tokens":16,"prompt_cache_hit_tokens":8}}\n\n'
            "data: [DONE]\n\n",
            headers={"content-type": "text/event-stream"},
        )

    records = []
    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    gateway.set_recorder(records.append)
    with gateway.job_scope("job-stream"):
        stream = await gateway.complete("writer", [{"role": "user", "content": "x"}], stream=True)
        assert [chunk async for chunk in stream] == ["complete"]

    assert records[0]["jobId"] == "job-stream"
    assert records[0]["usage"]["inputTokens"] == 12
    assert records[0]["usage"]["outputTokens"] == 4
    assert records[0]["usage"]["cachedInputTokens"] == 8


@pytest.mark.asyncio
async def test_telemetry_failure_does_not_turn_model_success_into_job_failure(tmp_path):
    path = config_file(tmp_path)

    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "answer"}, "finish_reason": "stop"}]})

    async def broken_recorder(_):
        raise RuntimeError("database unavailable")

    gateway = ModelGateway(tmp_path, {"MODEL_KEY": "secret"}, config_file=str(path), transport=httpx.MockTransport(handler))
    gateway.set_recorder(broken_recorder)
    assert await gateway.complete("auditor", [{"role": "user", "content": "private"}]) == "answer"


async def _no_wait(_: float) -> None:
    return None
