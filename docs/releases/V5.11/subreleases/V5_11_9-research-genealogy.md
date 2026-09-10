# V5.11.9 — Research Genealogy

Release: `V5.11`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Link state versions as initial/update/revision branches.

## 2. Preconditions

- V5.11 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-resume.mjs`
- `server/storage.mjs`
- `tests/`
- `benchmark/`
- `docs/`
- `server/storage.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.11.9, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Link state versions as initial/update/revision branches.

## 6. In Scope

- Parent/version graph

## 7. Out of Scope

- Merge

## 8. Deliverables

- Parent/version graph

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

- `docs/contracts/outcome.contract.md`
- `docs/contracts/failure.contract.md`
- `docs/contracts/audit-ledger.contract.md`
- `docs/contracts/research-state.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/point-in-time.invariants.md`
- `docs/invariants/claim-belief.invariants.md`
- `docs/invariants/knowledge.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-004-point-in-time.md`
- `docs/adr/ADR-011-offline-learning-only.md`
- `docs/adr/ADR-015-human-override-provenance.md`

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

Replay is a new job derived from immutable snapshot; it never mutates the original job/state.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

This release enforces full historical cutoff discipline across Evidence, Fact, Knowledge, policy, market and formula versions where available.

No future-information contamination is allowed.

## 18. Provenance

Research Provenance ID and snapshot manifest make behaviorally relevant inputs identifiable; unknown legacy fields stay unknown.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_RESEARCH_REPLAY / FEATURE_LEARNING_ANALYTICS; learning remains offline/governed.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Research Genealogy tests
- Historical leakage/provenance tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.11.9-AC01:** Link state versions as initial/update/revision branches. with no hindsight mutation of original research or decision.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Replay leakage, attribution, calibration, failure-regression and semantic diff tests must pass. Legacy replay coverage is disclosed honestly.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

snapshot → replay → provenance → failure registry → journal/outcome → attribution → calibration → genealogy/diff → institutional memory → proposal learning.

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

- Merge

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
