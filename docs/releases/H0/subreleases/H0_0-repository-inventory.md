# H0.0 — Repository inventory

Release: `H0`
Status: H0 calibration work; active only while CURRENT=H0. Completion is recorded by acceptance evidence, not by this heading.

## 1. Why

Establish a verified map of current implementation before any runtime change.

## 2. Preconditions

- Owning release prerequisites are accepted.
- Current repository baseline has been inspected.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/`
- `src/`
- `shared/`
- `knowledge/`
- `docs/`
- `tests/`
- `package.json`
- `.env.example`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

The runtime remains framework 4.7. H0 calibrates the installed Harness against executable code/tests; no new runtime capability is introduced.

## 5. Target Behavior

Establish a verified map of current implementation before any runtime change.

## 6. In Scope

- Inventory model/research/evidence/knowledge/security/financial/calculation/storage/recovery modules.
- Update current-implementation-map with CURRENT/PARTIAL/FUTURE.
- Record overlaps and stale assumptions.

## 7. Out of Scope

- Runtime code changes
- Schema changes
- Feature implementation

## 8. Deliverables

- Inventory model/research/evidence/knowledge/security/financial/calculation/storage/recovery modules.
- Update current-implementation-map with CURRENT/PARTIAL/FUTURE.
- Record overlaps and stale assumptions.

Update documentation/static checks only. No runtime behavior, persistent schema or financial definition changes. Record compatibility and rollback as documentation-only.

## 9. Suggested Code Ownership

Only Harness documentation/static checks. Inspect existing runtime owners; do not modify them. User-approved exceptions: add shared/ to the deployment test temporary copy list, retaining all deployment assertions; align the three recorded UI scenario files to current selectors/copy/preconditions and asynchronous state updates, preserving equivalent validations.

## 10. Contract Changes

Read and update only when this subrelease materially changes the contract:

- `docs/contracts/contract-template.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/research.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

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

No runtime changes; existing checkpoint/resume behavior must remain byte/behavior compatible.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

No data semantics change. H0 must document current point-in-time guarantees accurately.

No future-information contamination is allowed.

## 18. Provenance

No new business provenance; Harness documents themselves are versioned by repository history.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

No feature flag. H0 is documentation/control-plane only.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Run complete existing test suite as baseline.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **H0.0-AC01:** Implementation map matches actual checkout.
- **H0.0-AC02:** No runtime source file is changed.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

All existing scenarios must execute and pass; runtime behavior delta must be zero. Preserve business/Evidence/financial/recovery validations. User-approved test-only repairs cover the deployment shared/ copy list and the three UI scenario files documented in ../test-failure-analysis.md. No deletion, skip, financial redefinition or validation weakening.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

Install Harness files, validate against real checkout, run tests, then set CURRENT=V4.8 only after H0 acceptance.

Codex must not skip directly to default-on if the release specifies dry-run/dual-run/benchmark stages.

## 24. Rollback

Revert only H0 documentation/static checks, the approved deployment fixture preparation change and the three authorized UI test repairs. Restore CURRENT=H0 if handoff is rolled back. No runtime/database rollback.

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

- Runtime code changes
- Schema changes
- Feature implementation

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
