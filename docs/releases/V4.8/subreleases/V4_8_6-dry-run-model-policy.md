# V4.8.6 — Dry-run Model Policy

Release: `V4.8`
Implementation Status: CURRENT — accepted V4.8.6 shadow policy only. See [completion report](../V4_8_6-completion-report.md). Executable policy and later subreleases remain FUTURE.

## 1. Why

Compute candidate Main/Pro/reasoning decisions without changing actual execution model.

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

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

The accepted V4.8.5 worktree has one Gateway adapter, three legacy Catalog profiles and an isolated 0–100 complexity evaluator. No policy, MAIN/PRO profile bindings, MODEL_ROUTING_MODE or RoutingDecision logger existed.

## 5. Target Behavior

Compute candidate Main/Pro/reasoning decisions without changing actual execution model.

Runtime uses the same prepared legacy request/profile. Opt-in dry-run records a candidate slot/effort to server logs, not public history or checkpoints. Agent provides mode and plan historyYears only; all other signals remain unknown. The Gateway observer is best effort and does not await logging.

## 6. In Scope

- Policy thresholds.
- RoutingDecision.
- Legacy executionProfile distinct from selected candidate in dry-run.

## 7. Out of Scope

- Production policy routing

## 8. Deliverables

- Policy thresholds.
- RoutingDecision.
- Legacy executionProfile distinct from selected candidate in dry-run.

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

Add an in-memory/log RoutingDecision v1 only. No storage is used; ModelCall persistence belongs to V4.8.7.

All persistent changes are additive-first. Unknown historical values remain unknown.

## 14. API

No external API change.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No migration required.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

No modelState or checkpoint fields are added in V4.8.6; compatibility/pinning belongs to V4.8.9. Existing resume/recovery and original research cutoff/evidence/tool state remain unchanged.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Record only safe prepared-attempt policy metadata in server logs; never hidden reasoning, prompts, source text, credentials or URLs. No durable usage/policy persistence or correlation ID is added. A log is not proof of dispatch/success.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

MODEL_ROUTING_MODE=legacy is the default; dry-run enables observation only. Empty/unknown/unsupported policy values fall back to legacy. Restore legacy to disable observation; no production policy mode exists.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- 0–3 Main/low, 4–7 Main/high, 8–10 Pro/high, >=11 Pro/max.
- Mode A cap is MAIN/low, per release acceptance MG-004.
- Missing data no escalation.

Thresholds apply directly to the unchanged V4.8.5 0–100 score, without rescaling. No conversion was specified; B=8 and B plus five planned years=12 illustrate early saturation. This mismatch is recorded as uncalibrated policy debt, not resolved by changing accepted weights or implementing production routing. All-scoring-unknown inputs yield no candidate.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.6-AC01:** Dry-run logs candidate while actual calls remain legacy.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Six existing pinned research wire/delivery/event/checkpoint comparisons must remain identical with dry-run enabled. Existing router/Vision and strict transport regressions remain. No live-provider quality certification or production rollout is claimed.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

legacy → dry-run → policy/internal → partial production → default only after benchmark gate.

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

- Production policy routing, executable MAIN/PRO bindings and live quality calibration.
- Durable usage telemetry (V4.8.7), health (V4.8.8), modelState (V4.8.9), escalation/rollout (V4.8.10/.11).
- Complete job-to-signal collection and reliable reasoning-failure classification.

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
