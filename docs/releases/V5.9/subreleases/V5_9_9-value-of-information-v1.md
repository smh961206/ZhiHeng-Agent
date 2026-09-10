# V5.9.9 — Value of Information V1

Release: `V5.9`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Prioritize missing info by decision sensitivity × uncertainty × cost/retrievability.

## 2. Preconditions

- V5.9 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-resume.mjs`
- `server/storage.mjs`
- `tests/`
- `server/storage.mjs`
- `src/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.9.9, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Prioritize missing info by decision sensitivity × uncertainty × cost/retrievability.

## 6. In Scope

- VOI heuristic

## 7. Out of Scope

- Full Bayesian VOI

## 8. Deliverables

- VOI heuristic

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

- `docs/contracts/mandate.contract.md`
- `docs/contracts/decision.contract.md`
- `docs/contracts/research-state.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/decision-portfolio.invariants.md`
- `docs/invariants/claim-belief.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-010-research-decision-separation.md`
- `docs/adr/ADR-009-epistemic-typing.md`

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

Decision uses pinned Research State + Mandate + policy version; resume does not silently swap updated portfolio/market context.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Decision stores asOf and market/Research State versions used; hindsight data cannot rewrite original recommendation.

No future-information contamination is allowed.

## 18. Provenance

Decision references mandate, state, opportunities, calculations, policy version and unresolved gaps.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_DECISION_ENGINE=false initially; advisory only, no trade execution.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Value of Information V1 tests
- Mandate/decision point-in-time tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.9.9-AC01:** Prioritize missing info by decision sensitivity × uncertainty × cost/retrievability. without allowing prose to override hard mandate constraints.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Frozen mandates/opportunity sets test no-action correctness, constraint adherence, expected-return arithmetic and robustness.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

mandate → readiness → expected return → opportunity set → decision policy → robustness/loss risk → VOI/sufficiency → audit renderer.

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

- Full Bayesian VOI

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
