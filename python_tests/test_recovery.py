from python_backend.application.recovery import calculation_recovery, make_checkpoint, research_resume


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
