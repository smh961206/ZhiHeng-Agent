from __future__ import annotations

import hashlib
import json
import re
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

MODES = {
    "A": {"name": "快速筛选", "depth": "Quick", "years": 5, "actions": ["淘汰", "观察池", "深度研究"]},
    "B": {"name": "深度研究", "depth": "Standard", "years": 5, "actions": ["淘汰", "观察", "深度研究", "建仓候选", "持有候选", "减仓候选", "退出候选"]},
    "C": {"name": "财报更新", "depth": "Standard", "years": 5, "actions": ["升级", "维持", "降级", "剔除"]},
    "D": {"name": "多公司比较", "depth": "Standard", "years": 5, "actions": ["淘汰", "观察", "深度研究", "建仓候选", "持有候选", "减仓候选", "退出候选"]},
    "E": {"name": "组合分析", "depth": "Standard", "years": 5, "actions": ["观察", "持有候选", "减仓候选", "退出候选"]},
    "F": {"name": "股东回报", "depth": "Standard", "years": 8, "actions": ["淘汰", "观察", "深度研究", "建仓候选", "持有候选", "减仓候选", "退出候选"]},
}
RESEARCH_STAGES = [
    {"id": "task", "label": "明确问题", "engines": ["Router"], "description": "确定主任务、辅助模块与交付范围。"},
    {"id": "evidence", "label": "采集证据", "engines": ["Data Layer"], "description": "取得行情、正式披露及用户材料，并保留缺口。"},
    {"id": "research", "label": "分析查证", "engines": ["Fundamental", "Financial"], "description": "按任务检视业务、财务与现金回报。"},
    {"id": "calculation", "label": "工具计算", "engines": ["Valuation"], "description": "以可复现程序执行适用的确定性计算。"},
    {"id": "review", "label": "复核交付", "engines": ["Audit"], "description": "复核引用、缺口、判断与证伪条件。"},
]


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def resolve_mode(question: str, requested: str = "auto") -> str:
    if requested in MODES:
        return requested
    if re.search(r"我的持仓|持仓分析|组合|加仓|减仓", question):
        return "E"
    if re.search(r"财报更新|最新财报|更新.*判断|与上次", question):
        return "C"
    if re.search(r"初筛|快速|值不值得研究|股票池", question):
        return "A"
    if re.search(r"对比|比较|选哪|\bvs\.?\b", question, re.I):
        return "D"
    if re.search(r"股息|分红|股东回报|收益率", question):
        return "F"
    return "B"


def validate_payload(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ApiError(400, "请求必须为对象")
    question = value.get("question")
    if not isinstance(question, str) or not question.strip() or len(question) > 10_000:
        raise ApiError(400, "研究问题不能为空，最多10000字")
    requested_mode = value.get("mode", "auto")
    if requested_mode not in {"auto", *MODES}:
        raise ApiError(400, "研究模式无效")
    depth = value.get("depth") or "Standard"
    if depth not in {"Quick", "Standard", "Deep"}:
        raise ApiError(400, "报告深度无效")
    securities = value.get("securities", [])
    if not isinstance(securities, list) or len(securities) > 3:
        raise ApiError(400, "研究标的最多3个")
    normalized = []
    for item in securities:
        if not isinstance(item, dict) or item.get("market") not in {"CN", "HK", "US"}:
            raise ApiError(400, "证券市场无效")
        symbol = str(item.get("symbol", "")).strip().upper()
        if not re.fullmatch(r"[A-Z0-9.-]{1,16}", symbol):
            raise ApiError(400, "证券代码无效")
        normalized.append({**item, "symbol": symbol})
    if value.get("referenceMaterials") is not None and value.get("sources"):
        raise ApiError(400, "请统一使用补充资料字段，避免重复提交")
    materials = value.get("referenceMaterials", value.get("sources", []))
    if not isinstance(materials, list) or len(materials) > 6:
        raise ApiError(400, "补充资料最多6份")
    clean_materials = []
    total = 0
    for index, item in enumerate(materials):
        if not isinstance(item, dict):
            raise ApiError(400, "补充资料格式无效")
        text = item.get("text", "")
        if not isinstance(text, str) or len(text) > 20_000:
            raise ApiError(400, "每份资料正文最多20000字")
        total += len(text)
        clean_materials.append(
            {
                "id": f"M{index + 1}",
                "title": str(item.get("title", f"补充资料 {index + 1}"))[:200],
                "text": text,
                "type": "user-reference",
                "official": False,
                "verified": False,
            }
        )
    if total > 60_000:
        raise ApiError(400, "补充资料正文合计最多60000字")
    mode = resolve_mode(question, requested_mode)
    if mode == "D" and len(normalized) < 2:
        raise ApiError(400, "多公司比较至少需要2个不同标的，请补充比较对象")
    history_years = value.get("historyYears")
    if history_years is not None and (not isinstance(history_years, int) or history_years not in {3, 5, 8}):
        raise ApiError(400, "历史范围须为3、5或8年")
    if history_years is None:
        configured_years = MODES[mode]["years"]
        history_years = configured_years if isinstance(configured_years, int) else 5
    portfolio = value.get("portfolio", "")
    previous_research = value.get("previousResearch", "")
    portfolio_context = value.get("portfolioContext", {})
    baseline_job_id = value.get("baselineJobId")
    if not isinstance(portfolio, str) or len(portfolio) > 20_000:
        raise ApiError(400, "组合上下文无效")
    if not isinstance(previous_research, str) or len(previous_research) > 30_000:
        raise ApiError(400, "上次研究结论最多30000字")
    if not isinstance(portfolio_context, dict):
        raise ApiError(400, "组合信息无效")
    if any(not isinstance(item, str) or len(item) > 4_000 for item in portfolio_context.values()):
        raise ApiError(400, "组合信息每项最多4000字")
    if baseline_job_id not in {None, ""} and (
        not isinstance(baseline_job_id, str)
        or not re.fullmatch(r"[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}", baseline_job_id, re.I)
    ):
        raise ApiError(400, "对照研究编号无效")
    cutoff_value = value.get("researchCutoff") or now()
    if not isinstance(cutoff_value, str):
        raise ApiError(400, "研究截止时间格式无效")
    try:
        cutoff = datetime.fromisoformat(cutoff_value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ApiError(400, "研究截止时间格式无效") from error
    if cutoff.tzinfo is None:
        cutoff = cutoff.replace(tzinfo=timezone.utc)
    current = datetime.now(timezone.utc)
    if cutoff > current:
        raise ApiError(400, "研究截止时间不能晚于当前时间")
    research_cutoff = cutoff.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return {
        "question": question.strip(),
        "mode": requested_mode,
        "depth": depth if requested_mode != "auto" else value.get("depth") or MODES[mode]["depth"],
        "historyYears": history_years,
        "securities": normalized,
        "sources": clean_materials,
        "referenceMaterials": clean_materials,
        "portfolio": portfolio,
        "portfolioContext": {key: item.strip() for key, item in portfolio_context.items() if item.strip()},
        "previousResearch": previous_research.strip(),
        "baselineJobId": baseline_job_id or None,
        "researchCutoff": research_cutoff,
    }


def make_plan(input_data: dict[str, Any], mode: str | None = None) -> dict[str, Any]:
    selected = mode or resolve_mode(input_data["question"], input_data.get("mode", "auto"))
    profile = MODES[selected]
    depth = "Quick" if selected == "A" else input_data.get("depth", profile["depth"])
    return {
        "executionCompatibilityVersion": 1,
        "contractVersion": 7,
        "contextVersion": 1,
        "mode": selected,
        "name": profile["name"],
        "goal": "以可追溯证据回答研究问题，保留缺失数据与反证。",
        "depth": depth,
        "historyYears": 8 if selected == "F" else 5 if selected == "A" else input_data.get("historyYears", 5),
        "researchCutoff": input_data["researchCutoff"],
        "securities": deepcopy(input_data.get("securities", [])),
        "stages": deepcopy(RESEARCH_STAGES),
        "modules": ["证据采集", "财务核对", "估值适配", "反证与审计"],
        "secondaryModules": [],
        "requiredData": ["行情与估值截止时点", "官方披露与报告期", "币种、股类与股本口径"],
        "deliverables": ["研究思路", "研究报告", "审计记录", "证据来源", "执行轨迹"],
        "constraints": ["证据先于结论", "缺失数据保持缺失", "预测、假设与事实分开", "派生值必须可复现", "正式判断至少包含三条证伪条件"],
        "output": {
            "schema": {"A": "Quick", "C": "Update", "D": "Comparison", "E": "Portfolio", "F": "Dividend"}.get(selected, depth),
            "sections": [],
            "actions": deepcopy(profile["actions"]),
            "minFalsifiers": 3,
            "confidenceLevels": ["高", "中高", "中", "中低", "低"],
        },
        "knowledgeVersion": "K1.0.0",
        "knowledgeSnapshotId": "K1.0.0",
    }


def submission_identity(payload: dict[str, Any], key: str | None) -> tuple[str, str]:
    if key is not None and not re.fullmatch(r"[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}", key, re.I):
        raise ApiError(400, "提交标识无效，请重新打开研究工作台")
    canonical = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
    if not key:
        return str(uuid.uuid4()), fingerprint
    digest = hashlib.sha256(("zhiheng-submission:" + key.lower()).encode()).hexdigest()
    return f"{digest[:8]}-{digest[8:12]}-4{digest[13:16]}-a{digest[17:20]}-{digest[20:32]}", fingerprint


def public_job(job: dict[str, Any]) -> dict[str, Any]:
    hidden = {"submission", "checkpoint", "modelState", "promptState", "budgetState", "flagshipState", "draft"}
    visible = {key: deepcopy(value) for key, value in job.items() if key not in hidden}
    sources = []
    for source in visible.get("input", {}).get("sources", []):
        text = source.get("text", "")
        sources.append({**source, "text": text[:12_000], "previewTruncated": len(text) > 12_000})
    if "input" in visible:
        visible["input"]["sources"] = sources
    visible["resume"] = {"available": bool(job.get("checkpoint")), "reason": ""}
    return visible
