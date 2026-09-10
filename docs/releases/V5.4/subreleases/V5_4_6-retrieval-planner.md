# V5.4.6 — Retrieval Planner

Release: `V5.4`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Classify fact/exact/semantic/hybrid/page/table query.

## 2. Preconditions

- V5.4 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/evidence-search.mjs`
- `server/evidence-followup.mjs`
- `server/agent-page-reader.mjs`
- `server/web-evidence.mjs`
- `server/research-context.mjs`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.4.6, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Classify fact/exact/semantic/hybrid/page/table query.

## 6. In Scope

- Planner
- Strategy filters
- Trace

## 7. Out of Scope

- Fact Engine

## 8. Deliverables

- Planner
- Strategy filters
- Trace

Also update:
- tests for the new behavior;
- current implementation map if ownership changed;
- release schema/migration/rollback docs if reality differs from this specification.

## 9. Suggested Code Ownership

- Prefer modifying/expanding the inspected current modules that already own this responsibility.
- New modules are allowed only when responsibility is genuinely new or existing ownership would create an incoherent dependency.
- If a new module supersedes an old path, document dual-read/dual-run/cutover ownership; do not leave unexplained parallel systems.

## 10. Contract Changes

Read and update only when this subrelease materially changes the contract:

- `docs/contracts/source.contract.md`
- `docs/contracts/evidence.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/evidence.invariants.md`
- `docs/invariants/point-in-time.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-001-evidence-first.md`
- `docs/adr/ADR-003-hybrid-not-vector-only.md`
- `docs/adr/ADR-012-additive-migrations.md`

If implementation requires reversing an accepted ADR, stop and create a superseding ADR rather than silently changing the architecture.

## 13. Schema

No persistent schema change.

All persistent changes are additive-first. Unknown historical values remain unknown.

## 14. API

No external API change.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No migration required.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

Retrieval indexes are derived/rebuildable; resumed job keeps source/evidence snapshot and does not silently add newer documents.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Source/evidence carry published/effective/retrieved times; historical retrieval filters by research cutoff.

No future-information contamination is allowed.

## 18. Provenance

Every candidate retains retrieval channel, evidenceId/sourceId and ranking/reranker metadata.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_HYBRID_RETRIEVAL=false initially; current evidence search is fallback.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Retrieval Planner tests
- Existing evidence/citation tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.4.6-AC01:** Classify fact/exact/semantic/hybrid/page/table query. without degrading exact financial evidence retrieval.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Exact financial retrieval may not regress while qualitative recall improves; retrieval metrics include Recall@K, MRR, page and citation accuracy.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

canonical adapters → BM25 → semantic offline → fusion → reranker → planner → evidence pack → benchmark → enable.

Codex must not skip directly to default-on if the release specifies dry-run/dual-run/benchmark stages.

## 24. Rollback

Disable/revert only this subrelease path while preserving additive data; fall back to the previous accepted subrelease.

Rollback must not require deleting evidence, historical research, verified facts, audit/provenance data, or user work.

## 25. Stop Condition

Stop this subrelease when all are true:

- intended scope is implemented;
- all affected existing tests pass;
- new tests pass;
- benchmark gate is satisfied or explicitly not yet applicable;
- migration/rollback is documented;
- no enforced invariant is weakened;
- current implementation map is updated when ownership changed;
- deferred work is not implemented.

## 26. Deferred Work

- Fact Engine

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
