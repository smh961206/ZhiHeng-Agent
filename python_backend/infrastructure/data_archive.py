from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Callable


class DataArchive:
    """Integrity-checked archive for parsed public data; credentials and request bodies are forbidden."""

    def __init__(self, storage: Any, clock: Callable[[], datetime] | None = None) -> None:
        self.storage = storage
        self.clock = clock or (lambda: datetime.now(timezone.utc))

    @staticmethod
    def _key(value: str) -> str:
        return hashlib.sha256(("data-archive:v1:" + value).encode()).hexdigest()

    async def put(self, key: str, value: Any, *, retain_seconds: int = 30 * 86400) -> None:
        text = json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)
        if len(text.encode()) > 12_000_000:
            raise ValueError("持久数据超过归档大小上限")
        writer = getattr(self.storage, "save_cached_report", None)
        if not callable(writer):
            return
        source = {
            "type": "data-archive",
            "fetchedAt": self.clock().astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "text": text,
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
        }
        await writer(self._key(key), source, retain_seconds=retain_seconds)

    async def get(self, key: str, *, max_age_seconds: int) -> Any | None:
        reader = getattr(self.storage, "get_cached_report", None)
        if not callable(reader):
            return None
        source = await reader(self._key(key))
        if not source:
            return None
        fetched = datetime.fromisoformat(str(source.get("fetchedAt", "")).replace("Z", "+00:00"))
        age = (self.clock().astimezone(timezone.utc) - fetched.astimezone(timezone.utc)).total_seconds()
        if age < 0 or age > max_age_seconds:
            return None
        text = source.get("text")
        digest = hashlib.sha256(text.encode()).hexdigest() if isinstance(text, str) else ""
        if source.get("type") != "data-archive" or digest != source.get("sha256"):
            raise ValueError("归档完整性校验失败")
        return json.loads(text)
