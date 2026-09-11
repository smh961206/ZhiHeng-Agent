# V4.9 Benchmark

Latest status: the user explicitly approved batch nine, with both models passing 48/48. The approved bundle passes admission against the current configuration and code. Production routing remains disabled. See [operator approval](vision-operator-approval-20260911.md); earlier paragraphs retain historical results.

## Historical validation stages

Before final approval: clarified output instructions with unchanged corpus / grader. Candidate passed 48/48 and baseline 47/48; all 96 HTTP requests returned 200. Full original review and isolated rollback checks completed; operator approval was pending at that point. See [technical review](vision-output-constraints-review-20260911.md).

2026-09-11 live result: the user-resumed Coding endpoint comparison completed all 48 originals / 96 calls. Candidate passed 46/48 and baseline 41/48 under the unchanged strict grader. Candidate footnote-marker mismatches prevent promotion; production remains legacy. See [live report](vision-live-coding-acceptance-20260911.md). Earlier no-live statements below retain the original implementation snapshot.

## Current benchmark coverage

≥40 frozen visual cases; measure numeric accuracy, unit/header/date/sign/parentheses/footnote/table relationship.

CURRENT: 48 frozen synthetic originals (16 table PNG, 16 screenshot PNG, 16 scanned PDF) plus deterministic grading of numeric/unit/date/header/sign/parentheses/footnote/relationship/missing. Each reference and original is integrity-bound. scripts/vision-benchmark.mjs runs both profiles through the existing renderer and Gateway. Simulated results validate the harness only and keep qualityAccepted=false. Actual promotion requires live measured output, exact corpus/config/code, all critical checks and artifact-bound operator review. See [runbook](vision-comparison-runbook.md). The original implementation used offline validation; subsequent real batches and formal approval are recorded above.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
