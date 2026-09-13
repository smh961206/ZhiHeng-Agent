# V5.3 Schema

`knowledge/modules.json` schema v3 uses `knowledgeVersion` as its sole release identity and rejects the old generic `version` field. Governance contains `rules`, ordered `constitution`, `ontology`, and `regressions`. Each KnowledgeRule keeps its historical module/section owner, scope, severity, rationale, test IDs, enforcement type, ontology/dependency/conflict references, effective interval, jurisdiction, validation time, review status and impact map. `knowledge/current.json` schema v1 atomically selects one active K version and snapshot ID.

New research plans require `knowledgeVersion`, `knowledgeFingerprint`, immutable `knowledgeSnapshot` and manifest. Checkpoint scope includes those values. Plans without a valid K-Series pin cannot resume and are rebuilt on the active K release. V4.x files remain read-only historical evidence outside the active loader.

KCP and KnowledgeDebt are validated domain values in V5.3; no new database collection or automatic write path is introduced.

## Execution compatibility clarification

New plans use `executionCompatibilityVersion: 1` with `contractVersion: 7` instead of `plan.version`. New checkpoint scopes bind both counters, route events expose the execution counter, and `result.framework` retains its existing container with the new counter. Historical baseline projections copy the saved counter for new tasks or the historical version for old tasks, never manufacture one. Exact `version: '4.7'`/contract-7 K-pinned plans remain readable without mutation; absent, mixed, malformed or incompatible counters reject continuation. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
