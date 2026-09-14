from __future__ import annotations

import asyncio
import json
from copy import deepcopy
from typing import Any, AsyncIterator, Awaitable, Callable

from ..domain.contracts import public_job


class EventHub:
    def __init__(self, *, queue_limit: int = 256, heartbeat_seconds: float = 15) -> None:
        self.clients: dict[str, set[asyncio.Queue]] = {}
        self.queue_limit = queue_limit
        self.heartbeat_seconds = heartbeat_seconds

    async def publish(self, job_id: str, event: str, data: Any) -> None:
        for queue in tuple(self.clients.get(job_id, ())):
            if queue.qsize() < self.queue_limit:
                queue.put_nowait((event, deepcopy(data)))

    async def stream(
        self,
        job_id: str,
        initial: dict,
        loader: Callable[[str], Awaitable[dict[str, Any] | None]] | None = None,
    ) -> AsyncIterator[bytes]:
        if initial.get("status") not in {"queued", "running"}:
            yield self.encode("done", public_job(initial))
            return
        queue: asyncio.Queue = asyncio.Queue(maxsize=self.queue_limit)
        self.clients.setdefault(job_id, set()).add(queue)
        current = public_job(initial)
        try:
            yield self.encode("snapshot", current)
            while True:
                try:
                    event, data = await asyncio.wait_for(queue.get(), self.heartbeat_seconds)
                except asyncio.TimeoutError:
                    if loader:
                        try:
                            loaded = await loader(job_id)
                        except Exception:
                            loaded = None
                        if loaded:
                            snapshot = public_job(loaded)
                            marker = (snapshot.get("updatedAt"), snapshot.get("status"), len(snapshot.get("events", [])))
                            previous = (current.get("updatedAt"), current.get("status"), len(current.get("events", [])))
                            if marker != previous:
                                current = snapshot
                                if snapshot.get("status") not in {"queued", "running"}:
                                    yield self.encode("done", snapshot)
                                    return
                                yield self.encode("snapshot", snapshot)
                    yield b": heartbeat\n\n"
                    continue
                if event in {"snapshot", "done"} and isinstance(data, dict):
                    current = data
                yield self.encode(event, data)
                if event == "done":
                    return
        finally:
            group = self.clients.get(job_id, set())
            group.discard(queue)
            if not group:
                self.clients.pop(job_id, None)

    @staticmethod
    def encode(event: str, data: Any) -> bytes:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, separators=(',', ':'))}\n\n".encode()
