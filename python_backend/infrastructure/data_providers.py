from __future__ import annotations

import asyncio
import json
import math
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import httpx

from ..domain.research_budget import account as account_budget


def longport_symbol(security: dict[str, Any]) -> str:
    market, symbol = security.get("market"), str(security.get("symbol", "")).upper()
    if market == "HK" and re.fullmatch(r"\d{5}", symbol):
        return f"{int(symbol)}.HK"
    if market == "US" and re.fullmatch(r"[A-Z][A-Z0-9.-]{0,11}", symbol):
        return f"{symbol.replace('-', '.')}.US"
    if market == "CN" and re.fullmatch(r"[036]\d{5}", symbol):
        return f"{symbol}.{'SH' if symbol.startswith('6') else 'SZ'}"
    raise ValueError("长桥当前适配沪深A股、港股和美股")


def tushare_symbol(security: dict[str, Any]) -> str:
    market, symbol = security.get("market"), str(security.get("symbol", "")).upper()
    if market == "CN" and re.fullmatch(r"[036489]\d{5}", symbol):
        suffix = "SH" if symbol.startswith("6") else "BJ" if symbol.startswith(("4", "8", "9")) else "SZ"
        return f"{symbol}.{suffix}"
    if market == "HK" and re.fullmatch(r"\d{5}", symbol):
        return f"{symbol}.HK"
    if market == "US" and re.fullmatch(r"[A-Z][A-Z0-9.-]{0,11}", symbol):
        return symbol
    raise ValueError("Tushare证券代码无效")


def parse_tushare_table(payload: dict[str, Any], security: dict[str, Any]) -> tuple[list[str], list[dict[str, Any]], bool]:
    if payload.get("code") != 0:
        raise ValueError("Tushare接口返回失败")
    data = payload.get("data")
    data_object = data if isinstance(data, dict) else {}
    fields, items = data_object.get("fields"), data_object.get("items")
    if (
        not isinstance(fields, list)
        or not fields
        or any(not isinstance(field, str) for field in fields)
        or len(set(fields)) != len(fields)
        or not isinstance(items, list)
        or "ts_code" not in fields
        or "end_date" not in fields
    ):
        raise ValueError("Tushare财务数据格式变化")
    expected = tushare_symbol(security).replace("-", ".")
    rows: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, list) or len(item) != len(fields):
            raise ValueError("Tushare财务字段与数值数量不一致")
        row = dict(zip(fields, item, strict=True))
        if str(row["ts_code"]).replace("-", ".") != expected or not re.fullmatch(r"\d{8}", str(row["end_date"])):
            raise ValueError("Tushare财务数据证券或报告期不匹配")
        rows.append(row)
    return fields, rows, bool(data_object.get("has_more") or len(items) >= 10_000)


class TushareFinancials:
    _profiles = {
        "CN": (("income", "利润表", 33), ("balancesheet", "资产负债表", 36), ("cashflow", "现金流量表", 44)),
        "HK": (("hk_income", "利润表", 389), ("hk_balancesheet", "资产负债表", 390), ("hk_cashflow", "现金流量表", 391)),
        "US": (("us_income", "利润表", 394), ("us_balancesheet", "资产负债表", 395), ("us_cashflow", "现金流量表", 396)),
    }

    def __init__(self, token: str, *, client: httpx.AsyncClient | None = None) -> None:
        self.token = token
        self._owned = client is None
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(26, connect=8), follow_redirects=False)
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    @property
    def configured(self) -> bool:
        return bool(self.token)

    async def close(self) -> None:
        if self._owned:
            await self.client.aclose()

    async def _read(self, api: str, params: dict[str, str]) -> dict[str, Any]:
        if not self.token:
            raise RuntimeError("Tushare尚未配置")
        async with self._lock:
            loop = asyncio.get_running_loop()
            wait = 0.6 - (loop.time() - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = loop.time()
            async def request() -> httpx.Response:
                return await self.client.post(
                    "https://api.tushare.pro/",
                    json={"api_name": api, "token": self.token, "params": params, "fields": ""},
                )

            response = await account_budget("webRequest", 1, request)
            response.raise_for_status()
            if len(response.content) > 12_000_000:
                raise RuntimeError("Tushare响应超过限制")
            value = response.json()
            if not isinstance(value, dict):
                raise RuntimeError("Tushare响应格式无效")
            return value

    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
        if not self.configured:
            return [], []
        cutoff = datetime.fromisoformat(input_data["researchCutoff"].replace("Z", "+00:00"))
        end = cutoff.strftime("%Y%m%d")
        start = cutoff.replace(year=max(1970, cutoff.year - int(input_data.get("historyYears", 5)))).strftime("%Y%m%d")
        sources: list[dict[str, Any]] = []
        warnings: list[str] = []
        for security in input_data.get("securities", []):
            symbol = tushare_symbol(security)
            for api, title, doc_id in self._profiles[security["market"]]:
                try:
                    payload = await self._read(api, {"ts_code": symbol, "start_date": start, "end_date": end})
                    fields, rows, limited = parse_tushare_table(payload, security)
                    rows = [
                        row
                        for row in rows
                        if start <= str(row["end_date"]) <= end
                        and all(not row.get(field) or str(row[field]) <= end for field in ("ann_date", "f_ann_date"))
                    ]
                    if not rows:
                        raise ValueError("截止日以前没有可用记录")
                    source_id = f"TUSHARE-{security['market']}-{security['symbol']}-{api}"
                    sources.append(
                        {
                            "id": source_id,
                            "title": f"{symbol} {title} · Tushare",
                            "type": "vendor-financials",
                            "official": False,
                            "verified": False,
                            "provider": "Tushare Pro",
                            "security": f"{security['market']}:{security['symbol']}",
                            "url": f"https://tushare.pro/document/2?doc_id={doc_id}",
                            "publishedAt": None,
                            "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                            "limited": limited,
                            "text": json.dumps({"currency": None, "unit": None, "fields": fields, "rows": rows}, ensure_ascii=False)[:2_000_000],
                            "notice": "数据商结构化记录，不是官方原文；币种、单位、期间、修订和会计范围必须回到官方披露核对。",
                        }
                    )
                    if limited:
                        warnings.append(f"{symbol} {title}达到接口返回上限，历史覆盖可能不完整")
                except Exception as error:
                    warnings.append(f"{symbol} {title}获取失败：{type(error).__name__}")
        return sources, warnings


def _finite_decimal(value: object) -> float | None:
    try:
        number = float(value) if isinstance(value, (str, int, float, Decimal)) else math.nan
    except (ValueError, TypeError):
        return None
    return number if math.isfinite(number) else None


class LongportProvider:
    def __init__(self, app_key: str, app_secret: str, access_token: str) -> None:
        self.credentials = (app_key, app_secret, access_token)

    @property
    def configured(self) -> bool:
        return all(self.credentials)

    def _quote_sync(self, security: dict[str, Any]) -> dict[str, Any]:
        from longport.openapi import Config, QuoteContext

        symbol = longport_symbol(security)
        config = Config.from_apikey(*self.credentials, enable_print_quote_packages=False)
        context = QuoteContext(config)
        quotes, infos = context.quote([symbol]), context.static_info([symbol])
        if len(quotes) != 1 or len(infos) != 1 or quotes[0].symbol != symbol or infos[0].symbol != symbol:
            raise RuntimeError("长桥行情证券代码不匹配")
        quote, info = quotes[0], infos[0]
        price = _finite_decimal(quote.last_done)
        timestamp = quote.timestamp.astimezone(timezone.utc)
        if price is None or price <= 0 or timestamp.year < 2000 or not re.fullmatch(r"[A-Z]{3}", info.currency):
            raise RuntimeError("长桥行情价格、币种或时间无效")
        previous = _finite_decimal(quote.prev_close)
        return {
            "market": security["market"],
            "symbol": security["symbol"],
            "name": info.name_cn or info.name_en or info.name_hk or security["symbol"],
            "currency": info.currency,
            "price": price,
            "open": _finite_decimal(quote.open),
            "high": _finite_decimal(quote.high),
            "low": _finite_decimal(quote.low),
            "volume": quote.volume if isinstance(quote.volume, int) and quote.volume >= 0 else None,
            "turnover": _finite_decimal(quote.turnover),
            "previousClose": previous if previous and previous > 0 else None,
            "changePercent": (price / previous - 1) * 100 if previous and previous > 0 else None,
            "shareCapital": {
                "totalShares": info.total_shares if info.total_shares > 0 else None,
                "circulatingShares": info.circulating_shares if info.circulating_shares > 0 else None,
                "hkShares": info.hk_shares if info.hk_shares > 0 else None,
                "unit": "股",
                "shareBasisVerified": False,
                "notice": "证券基础信息快照；不代表稀释加权平均股本，A/H与ADR对应关系仍需核对。",
            },
            "asOf": timestamp.isoformat().replace("+00:00", "Z"),
            "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "provider": "LongPort OpenAPI",
            "official": False,
            "url": "https://open.longportapp.com/docs/quote/pull/quote",
            "notice": "账户授权行情；延迟取决于市场权限，行情币种与财报币种分别核对。",
        }

    async def quote(self, security: dict[str, Any]) -> dict[str, Any]:
        if not self.configured:
            raise RuntimeError("长桥凭证未完整配置")
        try:
            return await asyncio.wait_for(asyncio.to_thread(self._quote_sync, security), 12)
        except TimeoutError as error:
            raise RuntimeError("长桥行情请求超时") from error

    @staticmethod
    def _before_cutoff(value: object, cutoff: datetime) -> bool:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc) <= cutoff
        digits = re.sub(r"\D", "", str(value or ""))[:8]
        return bool(len(digits) == 8 and digits <= cutoff.strftime("%Y%m%d"))

    @staticmethod
    def _text(value: object) -> str | None:
        text = str(value).strip() if value is not None else ""
        return text or None

    def _fundamentals_sync(self, security: dict[str, Any], cutoff: datetime) -> tuple[dict[str, Any], list[str]]:
        from longport import openapi

        symbol = longport_symbol(security)
        config = openapi.Config.from_apikey(*self.credentials, enable_print_quote_packages=False)
        failures: list[str] = []

        if not hasattr(openapi, "FundamentalContext"):
            context = openapi.QuoteContext(config)
            indexes = [
                openapi.CalcIndex.PeTtmRatio,
                openapi.CalcIndex.PbRatio,
                openapi.CalcIndex.DividendRatioTtm,
                openapi.CalcIndex.TotalMarketValue,
            ]
            values = context.calc_indexes([symbol], indexes)
            if len(values) != 1 or values[0].symbol != symbol:
                raise RuntimeError("长桥估值指标证券代码不匹配")
            row = values[0]
            return {
                "symbol": symbol,
                "valuationHistory": {},
                "currentValuation": {
                    "peTtm": _finite_decimal(row.pe_ttm_ratio),
                    "pb": _finite_decimal(row.pb_ratio),
                    "dividendYieldTtm": _finite_decimal(row.dividend_ratio_ttm),
                    "marketValue": _finite_decimal(row.total_market_value),
                    "observedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "researchCutoff": cutoff.isoformat().replace("+00:00", "Z"),
                    "pointInTimeVerified": False,
                },
                "dividends": [],
                "buybacks": [],
                "corporateActions": [],
            }, ["历史估值、分红明细、回购和公司行动接口在当前 Linux SDK 中不可用"]

        context = openapi.FundamentalContext(config)

        def read(name: str, call: Any) -> Any | None:
            try:
                return call(symbol)
            except Exception:
                failures.append(name)
                return None

        valuation = read("valuation_history", context.valuation_history)
        dividends = read("dividend_detail", context.dividend_detail)
        buybacks = read("buyback", context.buyback)
        actions = read("corp_action", context.corp_action)

        metrics: dict[str, list[dict[str, Any]]] = {}
        for name in ("pe", "pb", "ps"):
            metric = getattr(getattr(getattr(valuation, "history", None), "metrics", None), name, None)
            if metric is None:
                continue
            points = [
                {"timestamp": point.timestamp.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"), "value": _finite_decimal(point.value)}
                for point in metric.list
                if self._before_cutoff(point.timestamp, cutoff)
            ]
            metrics[name] = [point for point in points if point["value"] is not None]

        dividend_rows = [
            {
                "id": self._text(item.id),
                "description": self._text(item.desc),
                "recordDate": self._text(item.record_date),
                "exDate": self._text(item.ex_date),
                "paymentDate": self._text(item.payment_date),
            }
            for item in getattr(dividends, "list", [])
            if self._before_cutoff(item.ex_date or item.record_date or item.payment_date, cutoff)
        ]
        buyback_rows = [
            {
                "fiscalYear": self._text(item.fiscal_year),
                "fiscalYearRange": self._text(item.fiscal_year_range),
                "netBuyback": self._text(item.net_buyback),
                "netBuybackYield": self._text(item.net_buyback_yield),
                "growthRate": self._text(item.net_buyback_growth_rate),
                "currency": self._text(item.currency),
            }
            for item in getattr(buybacks, "buyback_history", [])
            if not re.search(r"\d{4}", str(item.fiscal_year))
            or int(re.search(r"\d{4}", str(item.fiscal_year)).group()) <= cutoff.year  # type: ignore[union-attr]
        ]
        action_rows = [
            {
                "id": self._text(item.id),
                "date": self._text(item.date),
                "dateType": self._text(item.date_type),
                "type": self._text(item.act_type),
                "description": self._text(item.act_desc),
                "action": self._text(item.action),
            }
            for item in getattr(actions, "items", [])
            if self._before_cutoff(item.date, cutoff)
        ]
        return {
            "symbol": symbol,
            "valuationHistory": metrics,
            "dividends": dividend_rows,
            "buybacks": buyback_rows,
            "corporateActions": action_rows,
        }, failures

    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
        if not self.configured:
            return [], []
        cutoff = datetime.fromisoformat(input_data["researchCutoff"].replace("Z", "+00:00"))
        sources: list[dict[str, Any]] = []
        warnings: list[str] = []
        for security in input_data.get("securities", []):
            if security.get("market") not in {"HK", "US"}:
                continue
            symbol = longport_symbol(security)
            try:
                payload, failures = await asyncio.wait_for(asyncio.to_thread(self._fundamentals_sync, security, cutoff), 20)
                if not any(
                    (
                        payload["valuationHistory"],
                        payload.get("currentValuation"),
                        payload["dividends"],
                        payload["buybacks"],
                        payload["corporateActions"],
                    )
                ):
                    raise RuntimeError("长桥基本面未返回可用记录")
                sources.append(
                    {
                        "id": f"LONGPORT-{security['market']}-{security['symbol']}-fundamentals",
                        "title": f"{symbol} 估值、分红、回购和公司行动 · LongPort",
                        "type": "vendor-financials",
                        "official": False,
                        "verified": False,
                        "provider": "LongPort OpenAPI",
                        "security": f"{security['market']}:{security['symbol']}",
                        "url": "https://open.longportapp.com/docs",
                        "publishedAt": None,
                        "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        "pointInTimeVerified": False,
                        "text": json.dumps(payload, ensure_ascii=False)[:2_000_000],
                        "notice": "数据商补充材料，不是官方原文。事件日不等于公开可得日，历史截止日可用性、币种、口径和复权均须回到官方披露核对。",
                    }
                )
                if failures:
                    warnings.append(f"{symbol} 长桥部分基本面接口不可用：{'、'.join(failures)}")
            except Exception as error:
                warnings.append(f"{symbol} 长桥基本面获取失败：{type(error).__name__}")
        return sources, warnings
