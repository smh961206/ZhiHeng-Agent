# H0.1 — Harness control-plane validation

Release: `H0`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Validate AGENTS, Architecture, Contracts, Invariants, ADR and Release navigation against the real repository.

## 2. Preconditions

- H0 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `AGENTS.md`
- `docs/architecture/`
- `docs/contracts/`
- `docs/invariants/`
- `docs/adr/`
- `docs/releases/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before H0.1, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Validate AGENTS, Architecture, Contracts, Invariants, ADR and Release navigation against the real repository.

## 6. In Scope

- Correct stale paths/status labels.
- Ensure CURRENT points to H0 during bootstrap.
- Ensure future contracts are marked FUTURE.

## 7. Out of Scope

- V4.8 Model Gateway implementation

## 8. Deliverables

- Correct stale paths/status labels.
- Ensure CURRENT points to H0 during bootstrap.
- Ensure future contracts are marked FUTURE.

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

- Link/path validation.
- No contradictory CURRENT/FUTURE status checks.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **H0.1-AC01:** Codex can navigate from AGENTS→CURRENT→release→contracts/invariants/ADRs.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

All existing repository tests must remain unchanged and pass; runtime behavior delta must be zero.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

Install Harness files, validate against real checkout, run tests, then set CURRENT=V4.8 only after H0 acceptance.

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

- V4.8 Model Gateway implementation

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
