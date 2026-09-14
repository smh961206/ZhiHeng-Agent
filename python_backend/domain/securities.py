from __future__ import annotations

import re
from typing import Any, Awaitable, Callable

MARKETS = {"CN", "HK", "US"}
IGNORED = {"DCF", "ROE", "ROIC", "ETF", "SEC", "USD", "CNY", "HKD", "AI", "PDF", "FCF", "FCFE", "FCFF", "TTM"}
ALIASES = {
    "茅台": ("CN", "600519", "贵州茅台"),
    "贵州茅台": ("CN", "600519", "贵州茅台"),
    "腾讯": ("HK", "00700", "腾讯控股"),
    "腾讯控股": ("HK", "00700", "腾讯控股"),
    "苹果": ("US", "AAPL", "Apple Inc."),
    "微软": ("US", "MSFT", "Microsoft"),
    "英伟达": ("US", "NVDA", "NVIDIA"),
    "特斯拉": ("US", "TSLA", "Tesla"),
}


def parse_security_intent(content: dict[str, Any], question: str) -> dict:
    targets = content.get("targets")
    if not isinstance(targets, list) or len(targets) > 20:
        raise ValueError("股票识别格式无效")
    result = []
    for item in targets:
        mention = item.get("mention") if isinstance(item, dict) else None
        market, evidence = item.get("market"), item.get("marketEvidence", "")
        if not isinstance(mention, str) or not mention.strip() or len(mention) > 120 or mention not in question:
            raise ValueError("股票名称必须来自原文")
        if market is not None:
            patterns = {"CN": r"A股|Ａ股|沪股|深股|SH|SZ|BJ", "HK": r"港股|H股|HK", "US": r"美股|美国上市|US"}
            if market not in patterns or not isinstance(evidence, str) or evidence not in question or not re.fullmatch(patterns[market], evidence, re.I):
                raise ValueError("市场必须有原文依据")
        row = {"mention": mention, "market": market}
        if row not in result:
            result.append(row)
    return {"source": "semantic", "targets": result}


def explicit_mentions(question: str) -> list[dict]:
    found: list[dict] = []

    def add(market: str, symbol: str, mention: str, name: str | None = None) -> None:
        symbol = symbol.upper().replace(".", "-")
        key = f"{market}:{symbol}"
        if not any(item["key"] == key for item in found):
            found.append({"key": key, "market": market, "symbol": symbol, "name": name or symbol, "mention": mention})

    occupied: list[tuple[int, int]] = []
    code = re.compile(r"(?<![A-Za-z0-9])(?:(SH|SZ|BJ|HK)\s*[:：.]?\s*(\d{1,6})|(\d{1,6})\.(SH|SZ|BJ|HK)|(\d{5,6}))(?![A-Za-z0-9])", re.I)
    for match in code.finditer(question):
        prefix = (match.group(1) or match.group(4) or "").upper()
        digits = match.group(2) or match.group(3) or match.group(5)
        market = "HK" if prefix == "HK" or not prefix and len(digits) == 5 else "CN"
        if market == "CN" and len(digits) != 6:
            continue
        add(market, digits.zfill(5) if market == "HK" else digits, match.group(0))
        occupied.append(match.span())
    for alias, (market, symbol, name) in ALIASES.items():
        index = question.find(alias)
        if index >= 0 and not any(start <= index < end for start, end in occupied):
            add(market, symbol, alias, name)
    for match in re.finditer(r"(?<![A-Za-z0-9])\$?([A-Z][A-Z0-9.-]{1,11})(?![A-Za-z0-9])", question):
        ticker = match.group(1)
        if ticker not in IGNORED and not any(start <= match.start() < end for start, end in occupied):
            add("US", ticker, match.group(0))
    return found


async def resolve_securities(
    question: str,
    *,
    official_lookup: Callable[[str, str], Awaitable[list[dict]]] | None = None,
) -> dict:
    if not isinstance(question, str) or len(question) > 10_000:
        raise ValueError("问题格式无效，最多10000字")
    if not question.strip():
        return {"securities": [], "ambiguities": [], "unresolved": [], "warnings": [], "overflow": False, "source": "rules"}
    mentions = explicit_mentions(question)
    securities, ambiguities, unresolved, warnings = [], [], [], []
    for item in mentions:
        candidates = [item]
        if official_lookup:
            try:
                verified = await official_lookup(item["market"], item["symbol"])
                candidates = verified
            except Exception as error:
                warnings.append(f"{item['mention']} 官方目录查询失败：{error}")
                candidates = []
        clean = [{k: value for k, value in row.items() if k != "key"} for row in candidates]
        if len(clean) == 1:
            securities.append(clean[0])
        elif len(clean) > 1:
            ambiguities.append({"mention": item["mention"], "candidates": clean[:12]})
        else:
            unresolved.append(item["mention"])
    unique = list({f"{item['market']}:{item['symbol']}": item for item in securities}.values())
    return {
        "securities": unique[:3],
        "ambiguities": ambiguities,
        "unresolved": list(dict.fromkeys(unresolved)),
        "warnings": warnings if warnings else ([] if unique else ["未识别到明确证券代码，请补充市场与代码"]),
        "overflow": len(unique) > 3,
        "source": "rules",
    }
