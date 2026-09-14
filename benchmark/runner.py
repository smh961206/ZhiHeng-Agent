"""Offline, deterministic migration acceptance benchmark."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, cast

from python_backend.application.research_pipeline import ResearchPipeline
from python_backend.domain.analytics import quick_screen
from python_backend.infrastructure.official_evidence import OfficialEvidenceCollector

ROOT = Path(__file__).resolve().parent.parent


def _post_cutoff() -> bool:
    payload = {
        "cik": 1,
        "facts": {
            "us-gaap": {
                "Revenues": {
                    "label": "Revenue",
                    "units": {
                        "USD": [
                            {"val": 1, "start": "2024-01-01", "end": "2024-12-31", "filed": "2025-02-01", "form": "10-K", "accn": "old"},
                            {"val": 2, "start": "2025-01-01", "end": "2025-12-31", "filed": "2026-02-01", "form": "10-K", "accn": "future"},
                        ]
                    },
                }
            }
        },
    }
    source = OfficialEvidenceCollector._company_facts(
        {"market": "US", "symbol": "T"}, "0000000001", payload, datetime(2025, 12, 31, tzinfo=timezone.utc)
    )
    return bool(source and [item["accession"] for item in source["financialFacts"]] == ["old"])


def _missing() -> bool:
    row = quick_screen([{"kind": "annual", "revenue": 100, "netIncome": None, "equity": 20, "ocf": None, "capex": 3}])["financial"][0]
    return row["netMargin"] is None and row["quickFcf"] is None


def _calculation_lineage() -> bool:
    sources = [
        {
            "id": "SEC-XBRL-1",
            "type": "official-xbrl",
            "financialFacts": [
                {
                    "metric": "revenue",
                    "value": 100,
                    "unit": "USD",
                    "start": "2024-01-01",
                    "end": "2024-12-31",
                    "filed": "2025-02-01",
                    "form": "10-K",
                    "accession": "a",
                }
            ],
        }
    ]
    calculations, _ = ResearchPipeline._financial_screen(sources)
    refs = cast(dict[str, Any], cast(list[dict[str, Any]], calculations[0]["inputs"])[0]["factReferences"])
    return refs["revenue"] == {"sourceId": "SEC-XBRL-1", "blockId": "fact1"}


def _vision_boundary() -> bool:
    source: dict[str, Any] = {
        "type": "official-report",
        "official": True,
        "documentBlocks": [{"id": "b1", "method": "vision", "needsReview": True, "text": "Revenue 100"}],
    }
    from python_backend.domain.evidence import usable_evidence

    return usable_evidence(source, source["documentBlocks"][0]) is False


def _runtime_boundary() -> bool:
    package = (ROOT / "package.json").read_text(encoding="utf-8")
    return not (ROOT / "server").exists() and "server/index" not in package and '"start": "python -m uvicorn' in package


CHECKS: dict[str, Callable[[], bool]] = {
    "PIT-001": _post_cutoff,
    "MISS-001": _missing,
    "CALC-001": _calculation_lineage,
    "VISION-001": _vision_boundary,
    "RUNTIME-001": _runtime_boundary,
}


def run() -> dict:
    cases = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))
    results = [{**case, "passed": bool(CHECKS[case["id"]]())} for case in cases]
    return {"schemaVersion": 1, "suite": "python-backend-migration", "passed": all(item["passed"] for item in results), "results": results}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = run()
    value = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(value + "\n", encoding="utf-8")
    print(value)
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
