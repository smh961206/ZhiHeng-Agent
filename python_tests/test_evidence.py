from python_backend.domain.evidence import search_evidence, verify_financial_inputs


def official():
    return {
        "id": "S1",
        "title": "年报",
        "type": "official-report",
        "official": True,
        "text": "营业收入 1,000 百万元",
        "documentBlocks": [{"id": "p1-b1", "page": 1, "kind": "paragraphs", "method": "native", "needsReview": False, "text": "营业收入 1,000 百万元"}],
    }


def test_search_returns_stable_source_and_block_ids():
    result = search_evidence([official()], "收入")
    assert result[0]["id"] == "S1" and result[0]["blockId"] == "p1-b1"


def test_verification_preserves_scale_and_review_status():
    item = {
        "key": "revenue",
        "sourceId": "S1",
        "blockId": "p1-b1",
        "quote": "营业收入 1,000 百万元",
        "label": "营业收入",
        "period": "2025",
        "unit": "元",
        "value": 1_000_000_000,
        "scale": 1_000_000,
    }
    result = verify_financial_inputs([item], [official()])
    assert result["matched"] == 1 and result["checks"][0]["status"] == "matched-needs-review"
