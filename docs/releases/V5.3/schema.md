# V5.3 Schema

`knowledge/modules.json` schema v3 uses `knowledgeVersion` as its sole release identity and rejects the old generic `version` field. Governance contains `rules`, ordered `constitution`, `ontology`, and `regressions`. Each KnowledgeRule keeps its historical module/section owner, scope, severity, rationale, test IDs, enforcement type, ontology/dependency/conflict references, effective interval, jurisdiction, validation time, review status and impact map. `knowledge/current.json` schema v1 atomically selects one active K version and snapshot ID.

New research plans require `knowledgeVersion`, `knowledgeFingerprint`, immutable `knowledgeSnapshot` and manifest. Checkpoint scope includes those values. Plans without a valid retained K-Series pin cannot resume and require a new task on the active K release. K1.0.0 is the first retained Knowledge version.

KCP and KnowledgeDebt are validated domain values in V5.3; no new database collection or automatic write path is introduced.

## Execution compatibility clarification

New plans use `executionCompatibilityVersion: 1` with `contractVersion: 7` instead of `plan.version`. New checkpoint scopes bind both counters, route events expose the execution counter, and `result.framework` retains its existing container with the new counter. Historical baseline projections copy the saved counter for new tasks or the historical version for old tasks, never manufacture one. Exact `version: '4.7'`/contract-7 K-pinned plans remain readable without mutation; absent, mixed, malformed or incompatible counters reject continuation. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.

## Optional model-review and research-budget state

New jobs may add `budgetState` version 1. It contains immutable limits, mode, start time, durable resource receipts and limit decisions. Resource receipts are reserved before dispatch and completed afterward. An unfinished reservation is an uncertain external side effect and blocks automatic replay. Absence remains the compatible disabled state; historical jobs are not backfilled.

Jobs that enter Critical Reviewer or Judge may add private `flagshipState` version 2. It binds job ID, research cutoff, complete model-state hash, sanitized input packet, fixed optional-stage assignment and validated outcome hash. Only completed sessions can resume. Judge output remains advisory and cannot become a Fact, replace a human override or rewrite an original conclusion.

## Prompt and context governance additions

New model-call records may add `promptContext` containing only Prompt ID/version, manifest fingerprint, context version/completeness and nonnegative size/count statistics. It never stores messages, source text, user questions or model output. Historical model calls are not backfilled.

New jobs add private `promptState` version 1 with the release Inventory fingerprint and ordered Prompt ID/version pairs. It participates in checkpoint scope and is removed from public job projections. Historical jobs without this field continue through the historical compatibility path; it is never synthesized during resume.

New research context receipts write version 2 and add `requiredEvidenceBlocks` plus `requiredComplete`. The compiler rejects dispatch when a deterministic calculation references a missing or omitted evidence block. Version-1 receipts remain readable; missing fields mean unavailable, not complete.

Vision document blocks may add `imageSha256` and `instructionVersion`. These fields support exact in-request page deduplication and do not change the block's unverified status.

## Legacy cutoff provenance

When a pre-Python task is explicitly retried or recovered and lacks `input.researchCutoff`, its input may add `researchCutoffSource: legacy-createdAt`. In that case `input.researchCutoff` and an absent `plan.researchCutoff` receive the task's immutable UTC-normalized `createdAt`. Absence of both a cutoff and valid creation time remains an error; the system does not infer a replacement from the current time or later evidence.
