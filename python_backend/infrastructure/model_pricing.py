from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..domain.model_governance import Price


def _date(value: object) -> datetime:
    if not isinstance(value, str):
        raise ValueError("价格日期无效")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("价格日期必须包含时区")
    return parsed.astimezone(timezone.utc)


def _rate(value: object) -> float | None:
    if value is None:
        return None
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
        raise ValueError("价格必须为非负有限数字或null")
    return float(value)


class PricingRegistry:
    def __init__(self, path: Path | None) -> None:
        self.path = path
        self.error: str | None = None
        self.entries: list[dict[str, Any]] = []
        if path is None:
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) != {"schemaVersion", "entries"} or data["schemaVersion"] != 1 or not isinstance(data["entries"], list):
                raise ValueError("价格注册表格式无效")
            self.entries = [self._validate(item) for item in data["entries"]]
        except Exception as error:
            self.error = str(error) or type(error).__name__
            self.entries = []

    @staticmethod
    def _validate(item: object) -> dict[str, Any]:
        if not isinstance(item, dict):
            raise ValueError("价格记录必须为对象")
        profile = item.get("profileId")
        identity = item.get("connectionIdentity")
        pricing = item.get("pricing")
        if not isinstance(profile, str) or not re.fullmatch(r"(?:configured-)?[a-z][a-z0-9-]{0,51}", profile):
            raise ValueError("价格模型标识无效")
        if not isinstance(identity, str) or not re.fullmatch(r"[0-9a-f]{64}", identity):
            raise ValueError("价格连接标识无效")
        if not isinstance(pricing, dict) or pricing.get("schemaVersion") not in {1, 2} or pricing.get("unit") != "per-million-tokens":
            raise ValueError("价格对象格式无效")
        currency = pricing.get("currency")
        if not isinstance(currency, str) or not re.fullmatch(r"[A-Z]{3}", currency):
            raise ValueError("价格币种无效")
        start = _date(pricing.get("effectiveFrom"))
        end = _date(pricing["effectiveTo"]) if pricing.get("effectiveTo") else None
        if end and end <= start:
            raise ValueError("价格有效期无效")
        rates = {name: _rate(pricing.get(name)) for name in ("input", "output", "cacheRead")}
        tiers = pricing.get("tiers", [])
        timezone_name = pricing.get("timezone")
        if pricing["schemaVersion"] == 2:
            if not isinstance(timezone_name, str) or not isinstance(tiers, list) or not tiers:
                raise ValueError("分时价格缺少时区或时段")
            try:
                ZoneInfo(timezone_name)
            except ZoneInfoNotFoundError as error:
                raise ValueError("分时价格时区无效") from error
            normalized = []
            occupied: set[int] = set()
            for tier in tiers:
                if not isinstance(tier, dict) or not all(isinstance(tier.get(key), int) for key in ("startMinute", "endMinute")):
                    raise ValueError("分时价格时段无效")
                begin, finish = tier["startMinute"], tier["endMinute"]
                if not 0 <= begin < 1440 or not 0 <= finish < 1440 or begin == finish:
                    raise ValueError("分时价格分钟无效")
                minutes = set(range(begin, finish)) if begin < finish else set(range(begin, 1440)) | set(range(0, finish))
                if occupied & minutes:
                    raise ValueError("分时价格时段重叠")
                occupied |= minutes
                normalized.append({**tier, **{name: _rate(tier.get(name)) for name in ("input", "output", "cacheRead")}})
            tiers = normalized
        return {
            "profileId": profile.removeprefix("configured-"),
            "connectionIdentity": identity,
            "recordedAt": _date(item.get("recordedAt")),
            "start": start,
            "end": end,
            "currency": currency,
            "rates": rates,
            "timezone": timezone_name,
            "tiers": tiers,
        }

    def resolve(self, profile: str, identity: str, at: datetime) -> Price:
        candidates = [
            item
            for item in self.entries
            if item["profileId"] == profile
            and item["connectionIdentity"] == identity
            and item["recordedAt"] <= at
            and item["start"] <= at
            and (item["end"] is None or at < item["end"])
        ]
        if not candidates:
            return Price(None, None)
        item = max(candidates, key=lambda row: row["recordedAt"])
        rates = item["rates"]
        if item["tiers"]:
            local = at.astimezone(ZoneInfo(item["timezone"]))
            minute = local.hour * 60 + local.minute
            for tier in item["tiers"]:
                start, end = tier["startMinute"], tier["endMinute"]
                active = start <= minute < end if start < end else minute >= start or minute < end
                if active:
                    rates = tier
                    break
        return Price(rates["input"], rates["output"], item["currency"], rates["cacheRead"])
