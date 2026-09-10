# V5.7.11 — State Renderer

Release: `V5.7`
Status: `FUTURE` unless this release/subrelease is explicitly active under `docs/releases/CURRENT`.

## 1. Why

Render report from Research State behind flag.

## 2. Preconditions

- V5.7 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-resume.mjs`
- `server/storage.mjs`
- `tests/`
- `server/calculations.mjs`
- `server/cashflow-bridge.mjs`
- `server/normalized-earnings.mjs`
- `server/reinvestment.mjs`
- `server/research-sensitivity.mjs`
- `server/valuation-snapshot.mjs`
- `server/valuation-history.mjs`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.7.11, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Render report from Research State behind flag.

## 6. In Scope

- State→Markdown renderer
- Legacy parity

## 7. Out of Scope

- Workbench

## 8. Deliverables

- State→Markdown renderer
- Legacy parity

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

- `docs/contracts/hypothesis.contract.md`
- `docs/contracts/belief.contract.md`
- `docs/contracts/forecast.contract.md`
- `docs/contracts/research-state.contract.md`
- `docs/contracts/research-ir.contract.md`
- `docs/contracts/claim.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/claim-belief.invariants.md`
- `docs/invariants/fact-calculation.invariants.md`
- `docs/invariants/point-in-time.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-009-epistemic-typing.md`
- `docs/adr/ADR-005-report-not-system-of-record.md`
- `docs/adr/ADR-011-offline-learning-only.md`

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

Research State/IR versions and belief/forecast IDs are checkpointed; old jobs continue legacy plan/report path.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Forecasts are explicitly future; Research State pins asOf and all behavior/version references.

No future-information contamination is allowed.

## 18. Provenance

Belief updates, forecasts and scenarios reference owning claims/facts/assumptions and versions.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_BELIEF_ENGINE / FEATURE_FORECAST_ENGINE / FEATURE_RESEARCH_STATE; state renderer behind separate flag.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- State Renderer tests
- Research State/forecast/review compatibility tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.7.11-AC01:** Render report from Research State behind flag. while Fact/Forecast/Assumption epistemic states remain distinct.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Hypothesis discrimination, forecast reproducibility, scenario coherence, reverse valuation and state/report equivalence must pass; probabilities begin calibration capture.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

hypotheses → beliefs/uncertainty → forecasts → scenarios → reverse valuation → Research State dual-write → renderer → IR → calibration capture.

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

- Workbench

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
