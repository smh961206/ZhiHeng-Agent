"""Deterministic research-stage state transitions."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from ..domain.contracts import RESEARCH_STAGES, now

TERMINAL_STAGE_STATES = {"completed", "partial", "skipped", "failed", "cancelled"}


def initialize_workflow(job: dict[str, Any]) -> None:
    job["workflow"] = {"stages": [{**deepcopy(stage), "status": "pending"} for stage in RESEARCH_STAGES], "updatedAt": now()}


def update_stage(job: dict[str, Any], stage_id: str, status: str) -> dict[str, Any]:
    if "workflow" not in job:
        initialize_workflow(job)
    stage = next((item for item in job["workflow"]["stages"] if item["id"] == stage_id), None)
    if stage is None or status not in {"pending", "running", *TERMINAL_STAGE_STATES}:
        raise ValueError("未知研究阶段或状态")
    timestamp = now()
    if status == "running" and not stage.get("startedAt"):
        stage["startedAt"] = timestamp
    stage["status"] = status
    if status in TERMINAL_STAGE_STATES:
        stage["finishedAt"] = timestamp
    else:
        stage.pop("finishedAt", None)
    job["workflow"]["updatedAt"] = timestamp
    return deepcopy(job["workflow"])


def interrupt_workflow(job: dict[str, Any], status: str) -> None:
    if status not in {"failed", "cancelled"}:
        raise ValueError("中断状态无效")
    for stage in job.get("workflow", {}).get("stages", []):
        if stage.get("status") == "running":
            stage.update(status=status, finishedAt=now())
