import json
from copy import deepcopy

import pytest

from python_backend.domain.judge import advisory, detect_conflict, judge_packet, validate_judge


def conclusion(identity: str, position: str) -> dict:
    return {
        "id": identity,
        "subject": "核心主张",
        "kind": "claim",
        "completed": True,
        "statement": f"结论{identity}",
        "position": position,
        "basis": {
            "entity": "issuer",
            "period": "FY2025",
            "currency": "CNY",
            "shareBasis": "ordinary",
            "accountingScope": "consolidated",
            "valuationBasis": "not_applicable",
        },
        "evidenceRefs": [{"sourceId": "S1", "blockId": "b1"}],
        "counterEvidenceRefs": [{"sourceId": "S2", "blockId": "b2"}],
        "toolCallIds": [],
    }


def inputs() -> tuple[dict, list[dict], list[dict]]:
    sources = [
        {"id": "S1", "type": "official-report", "official": True, "publishedAt": "2026-09-01T00:00:00Z",
         "documentBlocks": [{"id": "b1", "kind": "paragraphs", "method": "native", "text": "支持证据"}]},
        {"id": "S2", "type": "official-report", "official": True, "publishedAt": "2026-09-01T00:00:00Z",
         "documentBlocks": [{"id": "b2", "kind": "paragraphs", "method": "native", "text": "反对证据"}]},
    ]
    evidence = [{"sourceId": row["id"], "blockId": row["documentBlocks"][0]["id"], "text": row["documentBlocks"][0]["text"]} for row in sources]
    return {"l1": conclusion("l1", "support"), "l2": conclusion("l2", "oppose")}, sources, evidence


def test_judge_binds_both_original_conclusions_and_all_evidence():
    request, sources, evidence = inputs()
    packet = judge_packet(request, cutoff="2026-09-02T00:00:00Z", sources=sources, evidence=evidence, tools=[])
    raw = json.dumps({
        "version": 1,
        "inputHash": packet["inputHash"],
        "outcome": "accept_l1",
        "selectedId": "l1",
        "reasonCode": "evidence_consistency",
        "citations": [
            {"sourceId": "S1", "blockId": "b1", "quote": "支持证据"},
            {"sourceId": "S2", "blockId": "b2", "quote": "反对证据"},
        ],
        "reviewedToolCallIds": [],
    }, ensure_ascii=False)
    decision = validate_judge(raw, packet)
    receipt = advisory(decision, packet)
    assert receipt["status"] == "advisory-needs-review"
    assert receipt["selectedConclusion"] == packet["l1"]
    assert "facts" not in receipt
    altered = deepcopy(packet)
    altered["l1"]["statement"] = "篡改"
    with pytest.raises(ValueError):
        validate_judge(raw, altered)


def test_judge_rejects_incomparable_or_non_material_claims():
    request, _, _ = inputs()
    assert detect_conflict(request, []).get("material") is True
    request["l2"]["position"] = "support"
    with pytest.raises(ValueError):
        detect_conflict(request, [])
