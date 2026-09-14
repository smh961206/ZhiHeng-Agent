from __future__ import annotations

import math
from statistics import median
from typing import Any, cast

from .calculations import dcf


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def quick_screen(periods: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for period in periods:
        revenue, profit, equity, ocf, capex = (period.get(key) for key in ("revenue", "netIncome", "equity", "ocf", "capex"))
        rows.append(
            {
                **period,
                "netMargin": cast(float, profit) / cast(float, revenue) if _finite(profit) and _finite(revenue) and cast(float, revenue) > 0 else None,
                "roe": cast(float, profit) / cast(float, equity) if _finite(profit) and _finite(equity) and cast(float, equity) > 0 else None,
                "quickFcf": cast(float, ocf) - cast(float, capex) if _finite(ocf) and _finite(capex) else None,
            }
        )
    annual_roe = [row["roe"] for row in rows if row.get("kind") == "annual" and row["roe"] is not None]
    return {
        "financial": rows,
        "trend": {"roe": {"count": len(annual_roe), "median": median(annual_roe) if annual_roe else None}},
        "limitations": ["Quick FCF 不是 FCFE；缺值保持 null。"],
    }


def dcf_sensitivity(base: dict[str, Any], growth_rates: list[float], discount_rates: list[float]) -> dict[str, Any]:
    if not 1 <= len(growth_rates) <= 5 or not 1 <= len(discount_rates) <= 5:
        raise ValueError("敏感性参数数量无效")
    matrix = []
    for discount in discount_rates:
        values = []
        for growth in growth_rates:
            try:
                values.append(dcf({**base, "growth": growth, "discount": discount})["perShare"])
            except ValueError:
                values.append(None)
        matrix.append({"discount": discount, "values": values})
    return {"growthRates": growth_rates, "discountRates": discount_rates, "matrix": matrix, "notice": "敏感性只复算声明参数，不升级为预测事实。"}


def valuation_percentiles(rows: list[dict[str, Any]]) -> dict[str, Any]:
    clean = [row for row in rows if _finite(row.get("value")) and row["value"] > 0]
    values = sorted(row["value"] for row in clean)
    if not values:
        return {"count": 0, "min": None, "median": None, "max": None}
    return {"count": len(values), "min": values[0], "median": median(values), "max": values[-1]}


def review_valuation_models(models: list[dict[str, Any]]) -> dict[str, Any]:
    if not 2 <= len(models) <= 6 or sum(item.get("role") == "primary" for item in models) != 1:
        raise ValueError("估值复核须有且仅有一个主模型，并至少包含一个交叉检查")
    if any(not str(item.get("toolCallId", "")).strip() or not str(item.get("limitation", "")).strip() for item in models):
        raise ValueError("每个估值模型必须保留调用凭证与局限")
    return {"status": "reviewed-needs-evidence", "models": models, "notice": "模型一致不等于结论正确；基础数据和假设仍须独立核对。"}


def shareholder_return(dividends: Any, buybacks: Any, issuance: Any, market_cap: Any) -> dict[str, Any]:
    if not all(value is None or _finite(value) and value >= 0 for value in (dividends, buybacks, issuance, market_cap)):
        raise ValueError("股东回报输入无效；缺失必须使用 null")
    net = dividends + buybacks - issuance if all(_finite(value) for value in (dividends, buybacks, issuance)) else None
    return {
        "netReturn": net,
        "yield": net / market_cap if net is not None and _finite(market_cap) and market_cap > 0 else None,
        "notice": "回购须扣除同期发行稀释；缺失数据不补零。",
    }
