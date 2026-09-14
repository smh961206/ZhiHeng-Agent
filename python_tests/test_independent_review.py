import json
from copy import deepcopy

import pytest

from python_backend.application.independent_review import IndependentReviewService, IndependentStateError, assert_independent_recovery
from python_backend.domain.independent_review import clean_context, eligible, independent_packet


def source(identity: str, block: str, text: str) -> dict:
    return {
        "id": identity,
        "type": "official-report",
        "official": True,
        "publishedAt": "2026-09-01T00:00:00Z",
        "documentBlocks": [{"id": block, "kind": "paragraphs", "method": "native", "text": text}],
    }


def test_packet_is_point_in_time_complete_and_private_fields_are_removed():
    sources = [source("S1", "b1", "原始证据一")]
    packet = independent_packet(
        "2026-09-02T00:00:00Z",
        sources,
        [{"sourceId": "S1", "blockId": "b1", "text": "原始证据一", "reasoning_content": "secret"}],
        [],
        ["待复核结论"],
    )
    assert packet["evidence"][0]["text"] == "原始证据一"
    assert "secret" not in json.dumps(packet, ensure_ascii=False)
    assert clean_context({"prompt": "x", "value": 1}) == {"value": 1}
    bad = deepcopy(sources)
    bad[0]["publishedAt"] = "2026-09-03T00:00:00Z"
    with pytest.raises(ValueError):
        independent_packet("2026-09-02T00:00:00Z", bad, [{"sourceId": "S1", "blockId": "b1", "text": "原始证据一"}], [], ["结论"])


def test_exceptional_admission_is_closed_for_gaps_and_routine_mode():
    evidence = [{"sourceId": "S1", "blockId": "b1"}]
    assert eligible("criticalReviewer", "B", gaps=[], evidence=evidence, failures=["format", "semantic"])
    assert not eligible("criticalReviewer", "B", gaps=["missing"], evidence=evidence, failures=["format", "semantic"])
    assert not eligible("criticalReviewer", "A", gaps=[], evidence=evidence, failures=["format", "semantic"])
    assert eligible("judge", "B", gaps=[], evidence=evidence, conflict={"material": True, "completed": True})


class Storage:
    def __init__(self):
        self.saved = []

    async def save_job(self, job):
        self.saved.append(deepcopy(job))


class Gateway:
    def __init__(self):
        self.calls = 0

    def optional_profile(self, purpose):
        return {
            "configurationFingerprint": "config",
            "assignment": {"key": purpose, "model": "fixture", "connectionIdentity": "identity"},
        }

    def job_scope(self, _job_id):
        from contextlib import nullcontext

        return nullcontext()

    async def complete(self, _purpose, _messages, **_options):
        self.calls += 1
        return json.dumps({"answer": "accepted", "reasoning_content": "private"})


@pytest.mark.asyncio
async def test_session_is_reserved_before_dispatch_and_reused_after_completion():
    storage, gateway = Storage(), Gateway()
    assignment = {"key": "criticalReviewer", "model": "fixture", "connectionIdentity": "identity"}
    job = {
        "id": "job-1",
        "input": {"researchCutoff": "2026-09-02T00:00:00Z"},
        "modelState": {"configurationFingerprint": "config", "assignments": {"criticalReviewer": [assignment], "judge": []}},
    }
    service = IndependentReviewService(storage, gateway)
    packet = {"cutoff": "2026-09-02T00:00:00Z", "evidence": []}
    first = await service.run(job, "criticalReviewer", packet, "review", lambda raw: json.loads(raw))
    second = await service.run(job, "criticalReviewer", packet, "review", lambda raw: json.loads(raw))
    assert first == second == {"answer": "accepted"}
    assert gateway.calls == 1
    assert [item["flagshipState"]["sessions"]["criticalReviewer"]["status"] for item in storage.saved] == ["reserved", "completed"]
    assert_independent_recovery(job)
    broken = deepcopy(job)
    broken["flagshipState"]["sessions"]["criticalReviewer"]["outcome"]["answer"] = "changed"
    with pytest.raises(IndependentStateError):
        assert_independent_recovery(broken)
