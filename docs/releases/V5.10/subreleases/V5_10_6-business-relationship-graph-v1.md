# V5.10.6 — Business Relationship Graph V1

Release: `V5.10`
Implementation Status: FUTURE at the H0 baseline. Activation under `docs/releases/CURRENT` authorizes scoped work only; status changes require implementation and acceptance evidence.

## 1. Why

Represent source-traceable supplier/customer/competitor/subsidiary relations.

## 2. Preconditions

- V5.10 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/storage.mjs`
- `server/schema-migrations.mjs`
- `server/research-workflow.mjs`
- `src/`
- `shared/`
- `tests/`
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

Before V5.10.6, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Represent source-traceable supplier/customer/competitor/subsidiary relations.

## 6. In Scope

- BusinessRelation

## 7. Out of Scope

- Full knowledge graph

## 8. Deliverables

- BusinessRelation

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

- `docs/contracts/portfolio.contract.md`
- `docs/contracts/decision.contract.md`
- `docs/contracts/security-master.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/decision-portfolio.invariants.md`
- `docs/invariants/point-in-time.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-010-research-decision-separation.md`
- `docs/adr/ADR-013-stable-entity-identities.md`

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

Portfolio analysis pins holdings/market snapshot; it does not silently mutate actual holdings or execute transactions.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Historical portfolio analysis uses holdings and prices known at the requested cutoff.

No future-information contamination is allowed.

## 18. Provenance

Allocation recommendation references portfolio snapshot, decision/state IDs, mandate/risk budget and optimization/heuristic version.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_PORTFOLIO_ENGINE=false initially; recommendations only.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Business Relationship Graph V1 tests
- Portfolio reconciliation/constraint/point-in-time tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.10.6-AC01:** Represent source-traceable supplier/customer/competitor/subsidiary relations. with advisory-only behavior and no automatic holdings mutation.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Portfolio fixtures verify exposure reconciliation, liquidity constraints, thesis concentration, hidden exposures and hard allocation constraints.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

portfolio domain → explicit exposures → factors/liquidity/correlation → thesis/business/macro graph → hidden exposure → risk budget → allocation → counterfactual.

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

- Full knowledge graph

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
