from __future__ import annotations

import math
from datetime import date
from typing import Any, cast


def _finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _date(value: Any) -> date:
    if not isinstance(value, str):
        raise ValueError("期间必须是 YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("期间必须是有效日期") from error


def _source_ids(row: dict, basis: dict, sources: list[dict], allowed_types: set[str]) -> None:
    ids = row.get("sourceIds")
    basis_ids = set(basis.get("sourceIds", []))
    actual = {item.get("id") for item in sources if item.get("type") in allowed_types}
    if not isinstance(ids, list) or not ids or any(item not in basis_ids or item not in actual for item in ids):
        raise ValueError("输入须关联本次实际财务来源及计算 basis")


def _same_comparative_period(current: dict, previous: dict) -> None:
    starts = (_date(current.get("start")), _date(previous.get("start")))
    ends = (_date(current.get("end")), _date(previous.get("end")))
    if starts[0].year - starts[1].year != 1 or ends[0].year - ends[1].year != 1:
        raise ValueError("仅比较相邻年度同期")
    if (starts[0].month, starts[0].day, ends[0].month, ends[0].day) != (
        starts[1].month,
        starts[1].day,
        ends[1].month,
        ends[1].day,
    ):
        raise ValueError("仅比较相同起止月日的相邻年度同期，不混用全年与半年")


def cashflow_bridge(values: dict, *, sources: list[dict]) -> dict:
    current, previous, basis = values.get("current"), values.get("previous"), values.get("basis", {})
    if not isinstance(current, dict) or not isinstance(previous, dict):
        raise ValueError("须提供两期现金流")
    if not str(values.get("amountUnit", "")).strip() or not str(values.get("scope", "")).strip():
        raise ValueError("须说明统一金额单位与合并/调整范围")
    for row in (current, previous):
        start, end = _date(row.get("start")), _date(row.get("end"))
        if start > end or (end - start).days > 379:
            raise ValueError("现金流期间无效或超过一个会计年度")
        _source_ids(row, basis, sources, {"official-report", "official-xbrl", "web-evidence"})
        if row.get("ocf") is not None and not _finite(row.get("ocf")):
            raise ValueError("金额须为有限数字或显式 null，不能补零")
        adjustments = row.get("adjustments")
        if not isinstance(adjustments, list) or not 1 <= len(adjustments) <= 12:
            raise ValueError("须提供1至12项待解释资金流")
        keys: set[str] = set()
        for item in adjustments:
            key = item.get("key") if isinstance(item, dict) else None
            if not isinstance(key, str) or not key.strip() or key in keys or not str(item.get("label", "")).strip():
                raise ValueError("调整项标识或说明无效、重复")
            keys.add(key)
            if item.get("contribution") is not None and not _finite(item.get("contribution")):
                raise ValueError("金额须为有限数字或显式 null，不能补零")
            _source_ids(item, basis, sources, {"official-report", "official-xbrl", "web-evidence"})
    _same_comparative_period(current, previous)
    old = {item["key"]: item for item in previous["adjustments"]}
    if len(old) != len(current["adjustments"]) or any(item["key"] not in old for item in current["adjustments"]):
        raise ValueError("两期必须采用同一组调整项目；缺值请显式提供 null")

    def subtract(a: Any, b: Any) -> float | None:
        return None if a is None or b is None else a - b

    def adjusted(row: dict) -> float | None:
        if row["ocf"] is None or any(item["contribution"] is None for item in row["adjustments"]):
            return None
        return row["ocf"] - sum(item["contribution"] for item in row["adjustments"])

    items = [
        {
            "key": item["key"],
            "label": item["label"],
            "current": item["contribution"],
            "previous": old[item["key"]]["contribution"],
            "change": subtract(item["contribution"], old[item["key"]]["contribution"]),
            "sourceIds": list(dict.fromkeys(item["sourceIds"] + old[item["key"]]["sourceIds"])),
        }
        for item in current["adjustments"]
    ]
    ocf_change = subtract(current["ocf"], previous["ocf"])
    explained = None if any(item["change"] is None for item in items) else sum(item["change"] for item in items)
    adjusted_current, adjusted_previous = adjusted(current), adjusted(previous)
    return {
        "amountUnit": values["amountUnit"],
        "currency": basis.get("currency"),
        "scope": values["scope"],
        "current": current,
        "previous": previous,
        "items": items,
        "ocfChange": ocf_change,
        "explainedChange": explained,
        "unexplainedChange": subtract(ocf_change, explained),
        "explainedShare": None if ocf_change in {None, 0} or explained is None else explained / ocf_change,
        "adjustedCurrent": adjusted_current,
        "adjustedPrevious": adjusted_previous,
        "adjustedChange": subtract(adjusted_current, adjusted_previous),
        "adjustedGrowth": (adjusted_current - adjusted_previous) / adjusted_previous
        if adjusted_current is not None and adjusted_previous is not None and adjusted_previous > 0
        else None,
        "formula": "诊断余额 = 合并OCF − 所列项目对OCF的带符号贡献之和；解释占比 = 所列贡献同比变化之和 ÷ OCF同比变化。",
        "status": "incomplete" if adjusted_current is None or adjusted_previous is None else "calculated-needs-review",
        "limitations": [
            "仅解释列出的项目，不是主营现金流、正常化FCF或股东可分配现金。",
            "符号、经济含义、合并范围和原始金额仍需核实；工具不能证明因果关系。",
            "解释占比可能为负或超过100%，不裁剪；OCF变化为0时不计算占比。",
            "诊断余额同比仅在上期余额为正时计算；缺值不补零。",
        ],
    }


def reinvestment_diagnostics(values: dict, *, sources: list[dict]) -> dict:
    current, previous, basis = values.get("current"), values.get("previous"), values.get("basis", {})
    keys = ("revenue", "profit", "ocf", "capex", "rdTotal", "rdExpensed", "rdCapitalized")
    if not isinstance(current, dict) or not isinstance(previous, dict):
        raise ValueError("再投资核算需要两期数据")
    for row in (current, previous):
        start, end = _date(row.get("start")), _date(row.get("end"))
        if start > end or (end - start).days > 366:
            raise ValueError("再投资核算需要有效年度/累计/单季期间")
        _source_ids(row, basis, sources, {"official-report", "official-xbrl"})
        for key in keys:
            value = row.get(key)
            if value is not None and (not _finite(value) or key not in {"profit", "ocf"} and value < 0):
                raise ValueError("金额须为声明币种；缺失填 null，研发和 Capex 不得为负")
        research = [row.get("rdTotal"), row.get("rdExpensed"), row.get("rdCapitalized")]
        if all(_finite(item) for item in research):
            total, expensed, capitalized = (float(cast(int | float, item)) for item in research)
            if abs(total - expensed - capitalized) > max(0.01, abs(total) * 1e-12):
                raise ValueError("研发总投入不等于费用化加资本化支出；先核对口径")
    _same_comparative_period(current, previous)

    def ratio(a: Any, b: Any) -> float | None:
        return a / b if _finite(a) and _finite(b) and b > 0 else None

    def subtract(a: Any, b: Any) -> float | None:
        return a - b if _finite(a) and _finite(b) else None

    def summarize(row: dict) -> dict:
        return {
            "rdCapitalization": ratio(row["rdCapitalized"], row["rdTotal"]),
            "rdIntensity": ratio(row["rdTotal"], row["revenue"]),
            "quickFCF": subtract(row["ocf"], row["capex"]),
            "capexIntensity": ratio(row["capex"], row["revenue"]),
            "netMargin": ratio(row["profit"], row["revenue"]),
        }

    present, prior = summarize(current), summarize(previous)
    hypothetical = current["rdTotal"] * prior["rdCapitalization"] if _finite(current["rdTotal"]) and prior["rdCapitalization"] is not None else None
    return {
        "status": "incomplete" if any(current.get(key) is None or previous.get(key) is None for key in keys) else "calculated-needs-review",
        "amountUnit": "元",
        "currency": basis.get("currency"),
        "current": {**current, "metrics": present},
        "previous": {**previous, "metrics": prior},
        "changes": {
            "rdCapitalizationPercentagePoints": 100 * (present["rdCapitalization"] - prior["rdCapitalization"])
            if present["rdCapitalization"] is not None and prior["rdCapitalization"] is not None
            else None,
            "quickFCF": subtract(present["quickFCF"], prior["quickFCF"]),
        },
        "sameRateSensitivity": {
            "hypotheticalCapitalized": hypothetical,
            "extraCapitalized": subtract(current["rdCapitalized"], hypothetical),
            "formula": "本期资本化研发 − 本期研发总投入 × 上期资本化率",
        },
        "limitations": [
            "研发同口径敏感性是税前确认节奏比较，不是虚增利润或应扣归母净利润。",
            "Quick FCF = 合并OCF − 现金购建长期资产，不是FCFE；不重复扣除资本化研发。",
            "缺少 ROIC、维护性 Capex 和可分配现金依据时保留缺口。",
        ],
    }
