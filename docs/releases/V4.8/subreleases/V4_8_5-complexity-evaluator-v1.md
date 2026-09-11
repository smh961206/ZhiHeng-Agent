# V4.8.5 — Complexity Evaluator V1

Release: `V4.8`
Implementation Status: CURRENT — pure evaluator and scoped acceptance complete; see [completion report](../V4_8_5-completion-report.md). At V4.8.5 acceptance it was isolated; subsequently accepted [V4.8.6](V4_8_6-dry-run-model-policy.md) adds only shadow-policy consumption. Boundaries below describe V4.8.5's original scope.

## 1. Why

Add pure, testable research complexity scoring.

## 2. Preconditions

- V4.8 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/model-routing.mjs`
- `server/model-stream.mjs`
- `server/agent.mjs`
- `server/agent-execution.mjs`
- `server/research-path.mjs`
- `server/vision-model.mjs`
- `server/evidence-followup.mjs`
- `.env.example`
- `tests/`
- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `shared/research-framework.mjs`
- `server/research-complexity.mjs` (new pure owner after confirming no existing evaluator)

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

V4.8.4 completed Gateway migration. Mode/depth/history plans, execution budgets/status and review attempts already exist, but no standalone complexity scoring or weights exist. These remain separate business owners; do not change their behavior or treat all retry/validation errors as reasoning failure.

## 5. Target Behavior

Add pure, testable research complexity scoring.

## 6. In Scope

- Score mode/company count/markets/currencies/history/materials/valuation/evidence/runtime/review signals.
- Return score/level/reasons/signals.

## 7. Out of Scope

- Changing actual model yet
- Production scoring integration, job-to-signal extraction, RoutingDecision and policy thresholds (V4.8.6).
- Durable usage/modelState, new feature flags and changes to existing execution/review budgets.

## 8. Deliverables

- Score mode/company count/markets/currencies/history/materials/valuation/evidence/runtime/review signals.
- Return score/level/reasons/signals.

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

- `docs/contracts/model-gateway.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/model.invariants.md`
- `docs/invariants/research.invariants.md`
- `docs/invariants/evidence.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-002-model-gateway.md`
- `docs/adr/ADR-014-quality-before-cost.md`
- `docs/adr/ADR-012-additive-migrations.md`

If implementation requires reversing an accepted ADR, stop and create a superseding ADR rather than silently changing the architecture.

## 13. Schema

No persistent schema change.

All persistent changes are additive-first. Unknown historical values remain unknown.

## 14. API

Internal evaluateResearchComplexity().

Input/output fields, fixed V1 weights, descriptive levels, unknown handling and non-scoring failure categories are defined in the [Gateway contract](../../../contracts/model-gateway.contract.md). This is an isolated heuristic utility, not calibrated predictive model selection.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No migration required.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

No checkpoint/modelState or resume-path change in V4.8.5. The evaluator is not called by production execution. Original cutoff, evidence, tool state and private continuation remain unchanged; modelState belongs to V4.8.9.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Return only normalized structured signals, fixed contribution codes and unknown paths in memory. No persistence, raw question/evidence/financial text or hidden reasoning. A future caller must establish distinct workload counts and classify failures; the evaluator does not verify facts. Durable usage belongs to V4.8.7.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

None. An executable isolation test prevents production integration. Existing fixed legacy execution remains unchanged; restoring this utility's files is the rollback. MODEL_ROUTING_MODE belongs to later policy rollout.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Mode A/B/D.
- Cross-currency.
- Evidence conflict.
- Data missing does not masquerade as model failure.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.5-AC01:** Same structured inputs produce deterministic score/reasons.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

V4.8.5 supplies a tested pure utility without production callers. Its six explicit fixtures and boundary tests validate determinism and invariants; existing research and Router/Vision golden suites retain the executable baseline. Live quality calibration and legacy → dry-run → policy rollout remain later work; scoring levels do not activate that rollout.

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

- Changing actual model yet

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
