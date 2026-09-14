from python_backend.domain.web_evidence import normalize_web_evidence, within_cutoff


def test_point_in_time_web_evidence_requires_publication_date():
    assert within_cutoff("2025-01-01T00:00:00Z", "2025-01-02T00:00:00Z") is True
    assert within_cutoff(None, "2025-01-02T00:00:00Z") is False
    row = normalize_web_evidence(
        {"id": "S1", "title": "10-K", "url": "https://www.sec.gov/report", "publishedAt": "2025-01-01T00:00:00Z", "text": "filing"},
        cutoff="2025-01-02T00:00:00Z",
        authority_verified=True,
    )
    assert row["official"] is True and row["pointInTimeEligible"] is True
