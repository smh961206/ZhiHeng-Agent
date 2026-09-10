# V5.6.8 — Runtime System Invariants

Release: `V5.6`
Implementation Status: FUTURE at the H0 baseline. Activation under `docs/releases/CURRENT` authorizes scoped work only; status changes require implementation and acceptance evidence.

## 1. Why

Enforce selected Fact/Calc/Claim hard contracts.

## 2. Preconditions

- V5.6 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/calculations.mjs`
- `server/cashflow-bridge.mjs`
- `server/normalized-earnings.mjs`
- `server/reinvestment.mjs`
- `server/research-sensitivity.mjs`
- `server/valuation-snapshot.mjs`
- `server/valuation-history.mjs`
- `tests/`
- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-resume.mjs`
- `server/storage.mjs`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.6.8, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Enforce selected Fact/Calc/Claim hard contracts.

## 6. In Scope

- Publication blockers
- Transition exceptions

## 7. Out of Scope

- All rules

## 8. Deliverables

- Publication blockers
- Transition exceptions

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

- `docs/contracts/fact.contract.md`
- `docs/contracts/calculation.contract.md`
- `docs/contracts/assumption.contract.md`
- `docs/contracts/claim.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/fact-calculation.invariants.md`
- `docs/invariants/claim-belief.invariants.md`
- `docs/invariants/financial.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-007-deterministic-financial-math.md`
- `docs/adr/ADR-009-epistemic-typing.md`
- `docs/adr/ADR-001-evidence-first.md`

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

Calculation/claim IDs and dependency status must survive resume without duplicate computation or lost evidence.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Calculations and claims inherit the source Fact cutoff; stale/revised upstream facts invalidate downstream trust.

No future-information contamination is allowed.

## 18. Provenance

Calculations expose formula/version/input lineage; Claims expose evidence/fact/calculation/assumption references.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_STRUCTURED_CALCULATIONS / FEATURE_CLAIM_GRAPH; report path remains compatible.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Runtime System Invariants tests
- Existing calculation/valuation/report tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.6.8-AC01:** Enforce selected Fact/Calc/Claim hard contracts. with no silent formula semantics change.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Calculation reproduction and claim-support/counter-evidence correctness must match or improve legacy report quality with no formula regression.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

inventory → formula IDs → calc wrapper → assumptions → claims → counter-evidence → dependencies → stale propagation → invariants → renderer sidecar.

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

- All rules

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
