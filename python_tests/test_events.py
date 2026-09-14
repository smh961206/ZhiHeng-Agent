from __future__ import annotations

import json

import pytest

from python_backend.api.events import EventHub


def _decode(value: bytes) -> tuple[str, dict]:
    lines = value.decode().strip().splitlines()
    event = lines[0].removeprefix("event: ")
    return event, json.loads(lines[1].removeprefix("data: "))


@pytest.mark.asyncio
async def test_event_stream_observes_terminal_state_saved_by_another_process():
    initial = {"id": "job-1", "status": "running", "updatedAt": "2026-01-01T00:00:00Z", "events": []}
    terminal = {**initial, "status": "completed", "updatedAt": "2026-01-01T00:00:01Z", "result": {"report": "done"}}
    hub = EventHub(heartbeat_seconds=0.001)

    async def load(_job_id: str):
        return terminal

    stream = hub.stream("job-1", initial, load)
    first_event, first = _decode(await anext(stream))
    final_event, final = _decode(await anext(stream))
    assert first_event == "snapshot" and first["status"] == "running"
    assert final_event == "done" and final["status"] == "completed"
    with pytest.raises(StopAsyncIteration):
        await anext(stream)


@pytest.mark.asyncio
async def test_event_stream_keeps_connection_alive_when_remote_read_fails():
    initial = {"id": "job-2", "status": "running", "updatedAt": "2026-01-01T00:00:00Z", "events": []}
    hub = EventHub(heartbeat_seconds=0.001)

    async def load(_job_id: str):
        raise RuntimeError("storage unavailable")

    stream = hub.stream("job-2", initial, load)
    await anext(stream)
    assert await anext(stream) == b": heartbeat\n\n"
    await stream.aclose()
