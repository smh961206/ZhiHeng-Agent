from __future__ import annotations

import math
from typing import Any, TypeGuard


def _finite(value: Any) -> TypeGuard[int | float]:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _positive(value: Any) -> TypeGuard[int | float]:
    return _finite(value) and value > 0


def dcf(values: dict[str, Any]) -> dict[str, Any]:
    cash_flow, growth, discount = values.get("cashFlow"), values.get("growth"), values.get("discount")
    terminal_growth, years, shares = values.get("terminalGrowth"), values.get("years", 5), values.get("shares")
    kind, sector = values.get("kind"), values.get("sector", "industrial")
    if kind not in {"FCFF", "FCFE"}:
        raise ValueError("必须选择FCFF或FCFE")
    if sector in {"bank", "insurance"}:
        raise ValueError("金融企业须使用适配模型，不支持本工业企业DCF工具")
    if (
        not _positive(cash_flow)
        or not _positive(shares)
        or not _finite(growth)
        or growth <= -1
        or not _positive(discount)
        or not _finite(terminal_growth)
        or terminal_growth <= -1
        or discount <= terminal_growth
        or not isinstance(years, int)
        or not 1 <= years <= 20
    ):
        raise ValueError("DCF参数无效：折现率须大于永续增长率，现金流和稀释股本须为正")
    if kind == "FCFF" and any(not _finite(values.get(key)) or values[key] < 0 for key in ("debt", "cash", "minority", "investments")):
        raise ValueError("FCFF必须明确债务、现金、少数股东权益、非经营投资（不适用须显式0）")
    present = 0.0
    projected = float(cash_flow)
    for year in range(1, years + 1):
        projected *= 1 + growth
        present += projected / (1 + discount) ** year
    terminal = projected * (1 + terminal_growth) / (discount - terminal_growth) / (1 + discount) ** years
    total = present + terminal
    equity = total - values["debt"] - values["minority"] + values["cash"] + values["investments"] if kind == "FCFF" else total
    per_share = equity / shares
    price = values.get("price")
    return {
        "kind": kind,
        "value": total,
        "equity": equity,
        "perShare": per_share,
        "terminalShare": terminal / total,
        "margin": 1 - price / per_share if _positive(price) and equity > 0 else None,
    }


def dividend(dps: float, yields: list[float] | None = None) -> dict[str, Any]:
    rates = yields or [0.03, 0.04, 0.05, 0.06, 0.07]
    if not _finite(dps) or dps < 0 or not rates or len(rates) > 20 or not all(_positive(rate) for rate in rates):
        raise ValueError("DPS和目标收益率无效")
    return {"notice": "收益率锚 ≠ 内在价值；DPS须为可持续口径", "anchors": [{"yield": rate, "price": dps / rate} for rate in rates]}


def normalized_earnings(values: dict[str, Any]) -> dict[str, Any]:
    keys = ("equity", "shares", "roeLow", "roeHigh", "peLow", "peHigh")
    if (
        not all(_positive(values.get(key)) for key in keys)
        or values["roeHigh"] > 1
        or values["roeLow"] > values["roeHigh"]
        or values["peLow"] > values["peHigh"]
    ):
        raise ValueError("正常化估值参数无效")
    profit = [values["equity"] * values["roeLow"], values["equity"] * values["roeHigh"]]
    eps = [item / values["shares"] for item in profit]
    result = [eps[0] * values["peLow"], eps[1] * values["peHigh"]]
    price = values.get("price")
    margin = [1 - price / item for item in result] if _positive(price) else None
    return {
        "status": "Conditional",
        "profit": profit,
        "eps": eps,
        "value": result,
        "margin": margin,
        "formula": "正常化利润 = 普通股权益 × 正常化ROE；EPS = 利润 / 同权益股本；每股价值 = EPS × PE",
        "notice": "结果取决于声明的正常化假设，不能将历史均值自动作为预测。",
    }
