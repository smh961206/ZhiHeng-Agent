# V4.8.4 — Migrate router and vision calls

Release: `V4.8`
Implementation Status: CURRENT — implementation and scoped acceptance are complete; see [completion report](../V4_8_4-completion-report.md). Subsequent complexity work is tracked separately in [V4.8.5](V4_8_5-complexity-evaluator-v1.md).

## 1. Why

Move remaining Router/Vision model calls behind Gateway while preserving behavior.

## 2. Preconditions

- V4.8 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/model-routing.mjs`
- `server/model-stream.mjs`
- `server/agent.mjs`
- `server/agent-execution.mjs`
- `server/research-path.mjs`
- `server/security-intent.mjs`
- `server/vision-model.mjs`
- `server/evidence-followup.mjs`
- `.env.example`
- `tests/`
- `server/material-vision.mjs`
- `server/visual-reading.mjs`
- `scripts/dual-model-diagnostics.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

The accepted V4.8.3 worktree routes research/review/followup through Gateway. Path classification, security intent and Vision still own direct transports; the synthetic diagnostic has one additional direct analysis call. These are the migration owners, not new subsystems.

## 5. Target Behavior

Move remaining Router/Vision model calls behind Gateway while preserving behavior.

## 6. In Scope

- Router purpose normalization.
- Vision purpose normalization.
- Capability fields replace exact model-name inference where safely possible.

## 7. Out of Scope

- Changing Vision primary
- New image model

## 8. Deliverables

- Router purpose normalization.
- Vision purpose normalization.
- Capability fields replace exact model-name inference where safely possible.

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

No checkpoint or modelState change in V4.8.4. Existing private continuation, original cutoff, evidence, tool receipts and visual archives remain unchanged. Additive modelState mapping belongs to V4.8.9.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Preserve existing source, archive, calculation and checkpoint provenance. No new metadata persistence in V4.8.4; durable usage belongs to V4.8.7 and modelState to V4.8.9. Hidden reasoning remains outside public results/events.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

No new flag or MODEL_ROUTING_MODE is introduced. Existing legacy env/capability configuration remains; code restoration to the saved accepted V4.8.3 worktree is the rollback. Policy mode rollout belongs to later subreleases.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Router fallback/cache behavior.
- Vision request limits and existing parsing behavior.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.4-AC01:** All real LLM calls route through Gateway adapters in legacy mode.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

This subrelease keeps fixed legacy selection and migrates transport only. Six saved pre-migration Router/Vision request/result comparisons, six existing research-mode golden cases, affected tests and static AC01 validate compatibility. Future policy rollout remains legacy → dry-run → policy/internal → partial production → default after its own benchmark gate; no such policy is activated here.

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

- Changing Vision primary
- New image model

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
