# V4.8.3 — Migrate research/review/followup calls

Release: `V4.8`
Implementation Status: CURRENT — research/review/followup migration and scoped acceptance are complete, including the authorized deployment regression; see [completion report](../V4_8_3-completion-report.md). Subsequent router/Vision progress is tracked separately in [V4.8.4](V4_8_4-migrate-router-and-vision-calls.md).

## 1. Why

Move text model call sites behind Gateway in legacy mode.

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
- `server/review-format.mjs`
- `server/valuation-review.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

The accepted V4.8.2 worktree supplied a standalone Gateway while Agent still owned one shared direct research/review/followup transport. V4.8.3 replaces that transport with a thin compatibility wrapper and explicit purposes. Followup assessment is an Agent callback; evidence-followup and deterministic valuation-review need no new provider implementation.

## 5. Target Behavior

Move text model call sites behind Gateway in legacy mode.

## 6. In Scope

- Research Agent call migration.
- Review call migration.
- Evidence followup migration.
- Keep thin compatibility wrappers where safer.

## 7. Out of Scope

- Vision provider change
- Policy routing

## 8. Deliverables

- Research Agent call migration.
- Review call migration.
- Evidence followup migration.
- Keep thin compatibility wrappers where safer.

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

No external API change.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No migration required.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

No checkpoint or modelState change in V4.8.3. Existing private tool/review messages and original cutoff/evidence/tool state are preserved. Additive modelState and checkpoint mapping belong to V4.8.9; this migration does not introduce them.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Keep existing source, calculation and checkpoint provenance unchanged. Gateway returns metadata in memory; durable usage/routing telemetry belongs to V4.8.7 and modelState to V4.8.9. Hidden reasoning remains only in the existing private continuation/checkpoint path and never enters public results/events. No new persistence is introduced here.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

No MODEL_ROUTING_MODE or policy flag is introduced. This migration uses fixed Legacy Profiles and has a code rollback to the accepted V4.8.2 worktree. Policy flags/mode rollout belong to later subreleases.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Call-site regression.
- Architecture static test: no business direct endpoint for migrated paths.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.3-AC01:** Migrated business modules contain no direct provider endpoint calls.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

Text-call integration retains legacy model selection and business validation. Acceptance uses the six-mode pinned legacy request/delivery/event/checkpoint baseline and affected regressions. Later policy rollout remains legacy → dry-run → policy/internal → partial production → default only after its own benchmark gate; this subrelease does not activate policy.

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

- Vision provider change
- Policy routing

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
