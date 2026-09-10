# V5.5.11 — Restatement / Revision Engine

Release: `V5.5`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Preserve originally_reported/restated/current_best simultaneously.

## 2. Preconditions

- V5.5 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/security-resolver.mjs`
- `server/security-intent.mjs`
- `server/security-exchanges.mjs`
- `server/financial-observations.mjs`
- `server/financial-input-verification.mjs`
- `server/data-basis.mjs`
- `server/storage.mjs`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.5.11, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Preserve originally_reported/restated/current_best simultaneously.

## 6. In Scope

- Revision links
- Point-in-time selector

## 7. Out of Scope

- Replay full engine

## 8. Deliverables

- Revision links
- Point-in-time selector

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

- `docs/contracts/security-master.contract.md`
- `docs/contracts/fact.contract.md`
- `docs/contracts/source.contract.md`
- `docs/contracts/evidence.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/fact-calculation.invariants.md`
- `docs/invariants/financial.invariants.md`
- `docs/invariants/point-in-time.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-004-point-in-time.md`
- `docs/adr/ADR-009-epistemic-typing.md`
- `docs/adr/ADR-013-stable-entity-identities.md`
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

Checkpoint/job references to legacy observations remain readable; new structured facts are pinned by ID/version.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Fact system explicitly separates effective/published/retrieved/valid times and retains originally reported values.

No future-information contamination is allowed.

## 18. Provenance

Verified Fact requires source/evidence lineage; conversions/revisions retain original labels, tags and source IDs.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_SECURITY_MASTER / FEATURE_FACT_ENGINE; dual-read old/new until proven.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Restatement / Revision Engine tests
- Legacy resolver/financial observation tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.5.11-AC01:** Preserve originally_reported/restated/current_best simultaneously. with additive migration and no historical overwrite.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Fact accuracy, entity resolution, period/currency/scope/share-basis, restatement and lineage must pass frozen cases before canonical facts drive formal valuation.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

identity mapping → additive entities → resolver bridge → corporate actions → fact sidecar → ontology/engines → verification/conflict/restatement → lineage API.

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

- Replay full engine

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
