from python_backend.application.recovery import calculation_recovery, make_checkpoint, research_resume, restore_legacy_research_cutoff


def test_legacy_research_cutoff_uses_original_creation_time_without_refreshing_it():
    job = {
        "createdAt": "2026-09-09T16:33:14.409Z",
        "input": {"question": "研究AAPL"},
        "plan": {},
    }
    assert restore_legacy_research_cutoff(job) is True
    assert job["input"]["researchCutoff"] == "2026-09-09T16:33:14.409000Z"
    assert job["input"]["researchCutoffSource"] == "legacy-createdAt"
    assert job["plan"]["researchCutoff"] == job["input"]["researchCutoff"]
    assert restore_legacy_research_cutoff(job) is False


def test_legacy_research_cutoff_rejects_missing_original_time():
    job = {"input": {"question": "研究AAPL"}, "plan": {}}
    try:
        restore_legacy_research_cutoff(job)
    except ValueError as error:
        assert "无法安全重试" in str(error)
    else:
        raise AssertionError("missing original time must not be replaced with the current time")


def test_checkpoint_is_bound_to_execution_input_and_snapshot():
    job = {
        "mode": "B",
        "input": {"question": "研究AAPL", "securities": [{"market": "US", "symbol": "AAPL"}]},
        "plan": {"knowledgeSnapshot": {"version": "K1.0.0", "id": "a" * 64}},
    }
    checkpoint = make_checkpoint(job, "research", tool_records=[], evidence=[])
    job["checkpoint"] = checkpoint
    assert research_resume(job) == checkpoint
    job["input"]["question"] = "研究MSFT"
    assert research_resume(job) is None


def test_calculation_recovery_never_invents_evidence():
    source = {
        "id": "S1",
        "type": "official-report",
        "official": True,
        "documentBlocks": [{"id": "b1", "method": "native", "text": "营业收入 100", "needsReview": False}],
    }
    seen = [{"id": "S1", "blockId": "b1", "text": "营业收入 100"}]
    result = calculation_recovery({"code": "calculation_evidence", "sourceIds": ["S1"]}, [source], seen)
    assert result["candidates"][0]["blockId"] == "b1"
    assert calculation_recovery({"code": "other"}, [source], seen) is None
