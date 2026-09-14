from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from python_backend.infrastructure.data_archive import DataArchive


class MemoryCache:
    def __init__(self) -> None:
        self.rows: dict[str, dict] = {}

    async def save_cached_report(self, key: str, source: dict, *, retain_seconds: int) -> None:
        self.rows[key] = deepcopy(source)

    async def get_cached_report(self, key: str) -> dict | None:
        return deepcopy(self.rows.get(key))


@pytest.mark.asyncio
async def test_data_archive_round_trip_age_and_integrity() -> None:
    current = datetime(2026, 1, 1, tzinfo=timezone.utc)
    storage = MemoryCache()
    archive = DataArchive(storage, lambda: current)
    await archive.put("public-source", {"missing": None, "value": 3})
    assert await archive.get("public-source", max_age_seconds=60) == {"missing": None, "value": 3}

    expired = DataArchive(storage, lambda: current + timedelta(seconds=61))
    assert await expired.get("public-source", max_age_seconds=60) is None

    row = next(iter(storage.rows.values()))
    row["text"] = '{"value":4}'
    corrupted = DataArchive(storage, lambda: current)
    with pytest.raises(ValueError, match="完整性"):
        await corrupted.get("public-source", max_age_seconds=60)
