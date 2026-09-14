from __future__ import annotations

import asyncio
import json
import math
import re
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx

from .data_providers import LongportProvider


def _number(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) else None


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


def _fetched() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_eastmoney(data: dict, security: dict, fetched_at: str | None = None) -> dict:
    row = data.get("data")
    if not isinstance(row, dict) or row.get("f57") != security["symbol"] or not isinstance(row.get("f59"), int) or not 0 <= row["f59"] <= 5:
        raise ValueError("行情代码或价格精度校验失败")
    divisor = 10 ** row["f59"]
    price = _number(row.get("f43"))
    timestamp = _number(row.get("f86"))
    if price is None or price <= 0 or timestamp is None or timestamp < 946684800:
        raise ValueError("行情缺少有效价格/行情时间")

    def scaled(key: str, positive: bool = False) -> float | None:
        value = _number(row.get(key))
        return None if value is None or positive and value <= 0 else value / divisor

    market = security["market"]
    secid = f"{'116' if market == 'HK' else '1' if security['symbol'].startswith('6') else '0'}.{security['symbol']}"
    change_percent = _number(row.get("f170"))
    return {
        "market": market,
        "symbol": security["symbol"],
        "name": row.get("f58"),
        "currency": "HKD" if market == "HK" else "CNY",
        "price": price / divisor,
        "open": scaled("f46", True),
        "high": scaled("f44", True),
        "low": scaled("f45", True),
        "turnover": _number(row.get("f48")),
        "previousClose": scaled("f60"),
        "changePercent": None if change_percent is None else change_percent / 100,
        "marketCap": _number(row.get("f116")),
        "pb": None if _number(row.get("f167")) is None or row["f167"] <= 0 else row["f167"] / 100,
        "asOf": _iso(timestamp),
        "fetchedAt": fetched_at or _fetched(),
        "provider": "东方财富公开行情",
        "official": False,
        "url": f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}",
        "notice": "最新可得行情快照；来源可能延迟，非交易所直连。行情币种不代表财报币种。",
    }


def parse_yahoo(data: dict, security: dict, fetched_at: str | None = None) -> dict:
    try:
        row = data["chart"]["result"][0]["meta"]
    except (KeyError, IndexError, TypeError) as error:
        raise ValueError("美股行情格式无效") from error
    expected = security["symbol"].replace(".", "-")
    if str(row.get("symbol", "")).upper() != expected:
        raise ValueError("美股行情代码校验失败")
    price, timestamp = _number(row.get("regularMarketPrice")), _number(row.get("regularMarketTime"))
    if price is None or price <= 0 or timestamp is None or timestamp < 946684800 or not row.get("currency"):
        raise ValueError("美股行情缺少价格、时间或币种")
    return {
        "market": "US",
        "symbol": security["symbol"],
        "name": row.get("longName") or row.get("shortName") or row["symbol"],
        "currency": row["currency"],
        "price": price,
        "high": _number(row.get("regularMarketDayHigh")),
        "low": _number(row.get("regularMarketDayLow")),
        "volume": _number(row.get("regularMarketVolume")),
        "previousClose": _number(row.get("chartPreviousClose")),
        "changePercent": _number(row.get("regularMarketChangePercent")),
        "asOf": _iso(timestamp),
        "fetchedAt": fetched_at or _fetched(),
        "provider": "Yahoo Finance 公开行情",
        "official": False,
        "url": f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(expected)}?interval=1d&range=1d",
        "notice": "最近常规交易时段行情，可能延迟；不混入盘前盘后价格。非交易所直连。",
    }


def freshness(snapshot: dict, reference_ms: float | None = None) -> str:
    then = datetime.fromisoformat(snapshot["asOf"].replace("Z", "+00:00")).timestamp() * 1000
    age = (reference_ms or time.time() * 1000) - then
    if age < 0:
        return "行情时间晚于本机时间，请核对时钟"
    if age > 7 * 86400000:
        return "市场数据可能过时（超过7个自然日；未使用交易日历）"
    return "显示来源行情时间；休市时保留最近交易行情，延迟未获保证"


class MarketData:
    def __init__(self, longport: LongportProvider | None = None) -> None:
        self.cache: dict[str, tuple[float, dict]] = {}
        self.longport = longport
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(11, connect=5), follow_redirects=False, headers={"User-Agent": "ZhiHeng-Agent/1.0 market-data"})

    async def close(self) -> None:
        await self.client.aclose()

    async def _json(self, url: str) -> dict:
        last = None
        for attempt in range(2):
            try:
                response = await self.client.get(url)
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, json.JSONDecodeError) as error:
                last = error
                if attempt == 0:
                    await asyncio.sleep(0.2)
        raise RuntimeError("公开行情接口暂不可用") from last

    async def quote(self, security: dict) -> dict:
        market, symbol = security.get("market"), str(security.get("symbol", "")).upper()
        if market not in {"CN", "HK", "US"} or not re.fullmatch(r"[A-Z0-9.-]{1,16}", symbol):
            raise ValueError("证券格式无效")
        normalized = {**security, "symbol": symbol}
        key = f"{market}:{symbol}"
        saved = self.cache.get(key)
        if saved and time.time() - saved[0] < 15:
            return {**saved[1]}
        errors = []
        if self.longport and self.longport.configured:
            try:
                result = await self.longport.quote(normalized)
                result["freshness"] = freshness(result)
                self.cache[key] = (time.time(), result)
                return result
            except Exception:
                errors.append("LongPort账户行情暂不可用")
        try:
            if market == "US":
                data = await self._json(f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol.replace('.', '-'))}?interval=1d&range=1d")
                result = parse_yahoo(data, normalized)
            else:
                secid = f"{'116' if market == 'HK' else '1' if symbol.startswith('6') else '0'}.{symbol}"
                data = await self._json(
                    f"https://push2.eastmoney.com/api/qt/stock/get?secid={secid}&fields=f43,f44,f45,f46,f48,f57,f58,f59,f60,f86,f116,f167,f170"
                )
                result = parse_eastmoney(data, normalized)
            result["freshness"] = freshness(result)
            self.cache[key] = (time.time(), result)
            return result
        except Exception as error:
            errors.append(str(error))
        if saved and time.time() - saved[0] <= 900:
            return {
                **saved[1],
                "fromCache": True,
                "stale": True,
                "warning": "行情源暂不可用，显示15分钟内成功获取的旧快照；请核对行情时间。",
                "fallbackReason": "；".join(errors),
            }
        raise RuntimeError("行情源均不可用：" + "；".join(errors))


async def lookup_sec_exchanges(symbols: list[str], client: httpx.AsyncClient | None = None, *, user_agent: str = "") -> list[dict]:
    if len(symbols) > 100 or any(not re.fullmatch(r"[A-Z][A-Z0-9.-]{0,11}", value) for value in symbols):
        raise ValueError("交易所查询须提供最多100个有效美股代码")
    unique = list(dict.fromkeys(symbols))
    owned = client is None
    active = client or httpx.AsyncClient(timeout=10, headers={"User-Agent": user_agent or "ZhiHeng-Agent contact not configured"})
    try:
        response = await active.get("https://www.sec.gov/files/company_tickers_exchange.json")
        response.raise_for_status()
        data = response.json()
        ticker = data["fields"].index("ticker")
        exchange = data["fields"].index("exchange")
        mapping: dict[str, str | None] = {}
        aliases = {"Nasdaq": "NASDAQ", "NYSE": "NYSE", "NYSE Arca": "NYSE ARCA", "NYSE American": "NYSE AMERICAN", "Cboe BZX": "CBOE BZX"}
        for row in data["data"]:
            key = str(row[ticker]).upper().replace(".", "-")
            venue = aliases.get(row[exchange])
            mapping[key] = venue if key not in mapping or mapping[key] == venue else None
        fetched = _fetched()
        return [
            {
                "symbol": symbol,
                "exchange": mapping.get(symbol.replace(".", "-")),
                "source": "https://www.sec.gov/files/company_tickers_exchange.json",
                "fetchedAt": fetched,
            }
            for symbol in unique
        ]
    except Exception:
        return [{"symbol": symbol, "exchange": None, "error": "交易所信息暂不可用"} for symbol in unique]
    finally:
        if owned:
            await active.aclose()
