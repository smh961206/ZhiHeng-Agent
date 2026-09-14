"""Structured, secret-safe process telemetry without external infrastructure."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

PROTECTED_KEYS = {"authorization", "api_key", "apikey", "secret", "prompt", "messages", "content", "text"}


def _safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: "[redacted]" if key.lower() in PROTECTED_KEYS else _safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "event": record.getMessage(),
        }
        for key in ("request_id", "method", "path", "status", "duration_ms", "job_id", "phase", "error_category"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(_safe(payload), ensure_ascii=False, separators=(",", ":"))


def configure_logging(level: str = "INFO") -> None:
    logger = logging.getLogger("zhiheng")
    logger.setLevel(level.upper())
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.propagate = False


@dataclass
class Metrics:
    _counts: dict[str, float] = field(default_factory=dict)
    _durations: dict[str, float] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock)

    def increment(self, name: str, amount: int = 1) -> None:
        with self._lock:
            self._counts[name] = self._counts.get(name, 0) + amount

    def observe_ms(self, name: str, value: float) -> None:
        with self._lock:
            count_key = name + ".count"
            duration_key = name + ".total_ms"
            self._counts[count_key] = self._counts.get(count_key, 0) + 1
            self._durations[duration_key] = self._durations.get(duration_key, 0) + round(value, 3)

    def snapshot(self) -> dict[str, int | float]:
        with self._lock:
            return dict(sorted({**self._counts, **self._durations}.items()))
