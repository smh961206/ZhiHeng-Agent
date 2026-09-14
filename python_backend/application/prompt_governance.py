"""Provider-neutral prompt inventory, plans and safe execution metadata."""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class PromptDefinition:
    prompt_id: str
    purpose: str
    version: int
    owner: str
    input_trust: str
    output_contract: str
    lifecycle: str
    risk_class: str
    dependencies: tuple[str, ...]
    call_sites: tuple[str, ...]


DEFINITIONS = {
    item.prompt_id: item
    for item in (
        PromptDefinition("path-classifier", "input", 1, "research-intake", "untrusted-user", "research-path-json", "active", "P1", ("research-state",), ("application/path_resolver.py",)),
        PromptDefinition("vision-page-transcriber", "vision", 1, "evidence", "untrusted-document", "page-transcript", "active", "P3", ("evidence", "model-gateway"), ("infrastructure/documents.py",)),
        PromptDefinition("research-plan", "researcher", 1, "research", "mixed-evidence", "analysis-plan-json", "active", "P3", ("calculation", "evidence"), ("application/research_service.py",)),
        PromptDefinition("evidence-gap-verifier", "evidenceVerifier", 1, "evidence", "verified-blocks", "evidence-checks-json", "active", "P3", ("evidence",), ("application/research_service.py",)),
        PromptDefinition("report-writer", "writer", 1, "research", "mixed-evidence", "research-report", "active", "P4", ("evidence", "research-state"), ("application/research_service.py",)),
        PromptDefinition("delivery-auditor", "auditor", 1, "review", "mixed-evidence", "review-json", "active", "P4", ("evidence", "research-state"), ("application/research_service.py",)),
        PromptDefinition("final-delivery-auditor", "auditor", 1, "review", "mixed-evidence", "review-json", "active", "P4", ("evidence", "research-state"), ("application/research_service.py",)),
        PromptDefinition("critical-reviewer", "criticalReviewer", 1, "review", "complete-point-in-time", "review-json", "active", "P4", ("evidence", "research-state", "model-gateway"), ("application/independent_review.py", "application/research_service.py")),
        PromptDefinition("evidence-judge", "judge", 1, "review", "complete-point-in-time", "judge-json", "active", "P4", ("evidence", "calculation", "research-state", "model-gateway"), ("application/independent_review.py", "application/research_service.py")),
    )
}


def inventory() -> list[dict[str, Any]]:
    return json.loads(json.dumps([asdict(DEFINITIONS[key]) for key in sorted(DEFINITIONS)]))


def _policy_projection(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    projection: list[dict[str, Any]] = []
    for message in messages:
        if message["role"] == "system":
            projection.append({"role": "system", "content": message["content"]})
            continue
        content = message.get("content")
        if isinstance(content, list) and any(isinstance(item, dict) and item.get("type") == "image_url" for item in content):
            projection.append(
                {
                    "role": message["role"],
                    "content": [
                        {"type": item.get("type"), **({"text": item.get("text")} if item.get("type") == "text" else {})}
                        for item in content
                        if isinstance(item, dict)
                    ],
                }
            )
    return projection


def manifest_fingerprint(definition: PromptDefinition, messages: list[dict[str, Any]]) -> str:
    encoded = json.dumps(
        {"definition": asdict(definition), "policy": _policy_projection(messages)},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    return hashlib.sha256(encoded).hexdigest()


def prompt_state() -> dict[str, Any]:
    rows = inventory()
    encoded = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return {
        "version": 1,
        "inventoryFingerprint": hashlib.sha256(encoded).hexdigest(),
        "definitions": [{"promptId": row["prompt_id"], "version": row["version"]} for row in rows],
    }


def assert_prompt_compatible(state: object) -> None:
    if state != prompt_state():
        raise ValueError("任务固定的 Prompt 清单已变化，不能静默续跑")


@dataclass(frozen=True)
class PromptPlan:
    definition: PromptDefinition
    messages: list[dict[str, Any]]
    context_version: int | None
    required_complete: bool | None
    stats: dict[str, int]

    @property
    def telemetry(self) -> dict[str, Any]:
        return {
            "promptId": self.definition.prompt_id,
            "purpose": self.definition.purpose,
            "promptVersion": self.definition.version,
            "manifestFingerprint": manifest_fingerprint(self.definition, self.messages),
            "contextVersion": self.context_version,
            "requiredComplete": self.required_complete,
            "messageCount": len(self.messages),
            "serializedCharacters": len(json.dumps(self.messages, ensure_ascii=False, separators=(",", ":"), default=str)),
            **self.stats,
        }


def build_prompt_plan(
    prompt_id: str,
    messages: list[dict[str, Any]],
    *,
    context_version: int | None = None,
    required_complete: bool | None = None,
    stats: dict[str, int] | None = None,
) -> PromptPlan:
    definition = DEFINITIONS.get(prompt_id)
    if definition is None:
        raise ValueError(f"未登记的 Prompt：{prompt_id}")
    if definition.lifecycle != "active":
        raise ValueError(f"Prompt 不可用于新任务：{prompt_id}")
    if not messages or not all(
        isinstance(item, dict) and item.get("role") in {"system", "user", "assistant", "tool"} and "content" in item
        for item in messages
    ):
        raise ValueError("Prompt 消息结构无效")
    safe_stats = stats or {}
    if any(not isinstance(value, int) or isinstance(value, bool) or value < 0 for value in safe_stats.values()):
        raise ValueError("Prompt 统计必须是非负整数")
    return PromptPlan(definition, deepcopy(messages), context_version, required_complete, dict(safe_stats))


def repair_messages(base: list[dict[str, Any]], candidate: str, instruction: str) -> list[dict[str, Any]]:
    """Keep the immutable request plus only the latest rejected candidate."""
    return [*deepcopy(base), {"role": "assistant", "content": candidate}, {"role": "user", "content": instruction}]


__all__ = [
    "DEFINITIONS", "PromptDefinition", "PromptPlan", "assert_prompt_compatible", "build_prompt_plan", "inventory",
    "prompt_state", "repair_messages",
]
