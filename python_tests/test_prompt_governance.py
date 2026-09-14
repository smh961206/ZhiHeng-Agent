import ast
import json
from pathlib import Path

import pytest

from python_backend.application.prompt_governance import (
    assert_prompt_compatible,
    build_prompt_plan,
    inventory,
    prompt_state,
    repair_messages,
)

ROOT = Path(__file__).resolve().parents[1]


def test_executable_prompt_inventory_matches_release_artifact():
    expected = json.loads((ROOT / "docs/releases/V5.3/prompt-inventory.json").read_text(encoding="utf-8"))
    assert inventory() == expected
    assert {row["purpose"] for row in expected} == {
        "input", "vision", "researcher", "writer", "evidenceVerifier", "auditor", "criticalReviewer", "judge"
    }
    assert all(row["lifecycle"] == "active" and row["risk_class"] in {"P0", "P1", "P2", "P3", "P4"} for row in expected)
    assert all((ROOT / "python_backend" / path).is_file() for row in expected for path in row["call_sites"])


def test_every_registered_application_call_passes_prompt_context():
    paths = {path for row in inventory() for path in row["call_sites"]}
    for relative in paths:
        tree = ast.parse((ROOT / "python_backend" / relative).read_text(encoding="utf-8"))
        calls = [
            node
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "complete"
        ]
        assert calls, relative
        assert all(any(keyword.arg == "prompt_context" for keyword in call.keywords) for call in calls), relative


def test_prompt_plan_exposes_only_safe_metadata_and_copies_messages():
    messages = [{"role": "system", "content": "policy"}, {"role": "user", "content": "private evidence"}]
    plan = build_prompt_plan(
        "report-writer", messages, context_version=2, required_complete=True, stats={"evidenceBlocks": 3}
    )
    messages[1]["content"] = "changed"
    encoded = json.dumps(plan.telemetry, ensure_ascii=False)
    assert plan.messages[1]["content"] == "private evidence"
    assert "private evidence" not in encoded and "policy" not in encoded
    assert plan.telemetry["requiredComplete"] is True and plan.telemetry["evidenceBlocks"] == 3
    same_policy = build_prompt_plan(
        "report-writer",
        [{"role": "system", "content": "policy"}, {"role": "user", "content": "different private evidence"}],
    )
    changed_policy = build_prompt_plan(
        "report-writer",
        [{"role": "system", "content": "changed policy"}, {"role": "user", "content": "private evidence"}],
    )
    assert plan.telemetry["manifestFingerprint"] == same_policy.telemetry["manifestFingerprint"]
    assert plan.telemetry["manifestFingerprint"] != changed_policy.telemetry["manifestFingerprint"]


def test_prompt_plan_rejects_unknown_prompt_and_unsafe_statistics():
    with pytest.raises(ValueError, match="未登记"):
        build_prompt_plan("unknown", [{"role": "user", "content": "x"}])
    with pytest.raises(ValueError, match="非负整数"):
        build_prompt_plan("report-writer", [{"role": "user", "content": "x"}], stats={"evidenceBlocks": -1})


def test_repair_history_keeps_only_latest_candidate():
    base = [{"role": "system", "content": "policy"}, {"role": "user", "content": "evidence"}]
    first = repair_messages(base, "bad-1", "fix-1")
    second = repair_messages(base, "bad-2", "fix-2")
    assert len(first) == len(second) == 4
    assert "bad-1" not in json.dumps(second) and second[-2]["content"] == "bad-2"


def test_prompt_state_pins_inventory_for_resume_without_exposing_bodies():
    state = prompt_state()
    assert_prompt_compatible(state)
    assert "policy" not in json.dumps(state) and "content" not in json.dumps(state)
    with pytest.raises(ValueError, match="不能静默续跑"):
        assert_prompt_compatible({**state, "inventoryFingerprint": "0" * 64})
