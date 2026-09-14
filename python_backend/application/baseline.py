from __future__ import annotations

from copy import deepcopy
from typing import Any, Awaitable, Callable

from ..domain.contracts import ApiError

LoadJob = Callable[[str], Awaitable[dict[str, Any] | None]]


def _historical_references(value: object) -> object:
    if isinstance(value, str):
        import re

        return re.sub(r"\[(S\d+)\]", r"[历史:\1]", value)
    if isinstance(value, list):
        return [_historical_references(item) for item in value]
    if isinstance(value, dict):
        return {key: _historical_references(item) for key, item in value.items()}
    return value


async def attach_research_baseline(input_data: dict[str, Any], mode: str, load_job: LoadJob) -> dict[str, Any]:
    baseline_id = input_data.get("baselineJobId")
    if mode != "C" or not baseline_id:
        return input_data
    prior = await load_job(baseline_id)
    report = prior.get("result", {}).get("report") if prior else None
    if not prior or prior.get("status") != "completed" or not isinstance(report, str) or not report.strip():
        raise ApiError(400, "对照研究不存在或尚未完成，请重新选择")
    prior_securities = prior.get("input", {}).get("securities") or prior.get("plan", {}).get("securities") or []
    identities = {f"{item.get('market')}:{str(item.get('symbol', '')).upper()}" for item in prior_securities}
    if any(f"{item.get('market')}:{str(item.get('symbol', '')).upper()}" not in identities for item in input_data.get("securities", [])):
        raise ApiError(400, "对照研究未覆盖当前标的，请选择相同标的的旧报告")
    plan = prior.get("plan", {})
    metadata = (
        {"executionCompatibilityVersion": plan.get("executionCompatibilityVersion"), "contractVersion": plan.get("contractVersion")}
        if "executionCompatibilityVersion" in plan
        else {"frameworkVersion": plan.get("version")}
    )
    result = deepcopy(input_data)
    result["baseline"] = {
        "jobId": prior["id"],
        "question": prior.get("input", {}).get("question") or prior.get("question", ""),
        "createdAt": prior.get("createdAt"),
        "report": _historical_references(report[:60_000]),
        "truncated": len(report) > 60_000,
        "decision": _historical_references(deepcopy(prior.get("result", {}).get("decision"))),
        **metadata,
        "notice": "仅作历史结论和假设对照。旧报告来源编号不属于本次来源目录，不能作为当前事实或当前行情。",
    }
    return result
