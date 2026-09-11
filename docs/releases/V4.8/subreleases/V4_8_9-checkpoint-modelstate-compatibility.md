# V4.8.9 — Checkpoint modelState compatibility

Release: `V4.8`
Implementation Status: CURRENT — additive modelState compatibility accepted. See [completion report](../V4_8_9-completion-report.md).

## 1. Why

Persist model policy/profile state for new jobs without breaking old resume.

## 2. Preconditions

- V4.8 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/model-routing.mjs`
- `server/model-catalog.mjs`
- `server/model-gateway.mjs`
- `server/index.mjs`
- `server/research-create.mjs`
- `server/research-retry.mjs`
- `server/job-stream.mjs`
- `server/storage.mjs`
- `server/model-stream.mjs`
- `server/agent.mjs`
- `server/agent-execution.mjs`
- `server/research-path.mjs`
- `server/vision-model.mjs`
- `server/evidence-followup.mjs`
- `.env.example`
- `tests/`
- `server/job-checkpoints.mjs`
- `server/research-resume.mjs`
- `server/calculation-recovery.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Gateway snapshots configuration per call, but does not pin it across a job or process restart. Agent stores private checkpoint v1 conversations/tool/evidence state. research-resume validates framework/Knowledge/scope; research-retry preserves compatible progress but rebuilds execution inputs and reacquires data when no usable checkpoint remains. No modelState compatibility check exists. Stable legacy profile IDs resolve current environment values, so an ID alone cannot prove an unchanged configured model/connection. Job-stream removes checkpoints from public output; storage separately creates a job summary, and both owners must be checked before adding private job metadata.

## 5. Target Behavior

Persist model policy/profile state for new jobs without breaking old resume.

## 6. In Scope

- modelState fields.
- Legacy checkpoint mapping.
- Pinned profile/reasoning/escalation history.

## 7. Out of Scope

- Cross-provider escalation itself

## 8. Deliverables

- modelState fields.
- Legacy checkpoint mapping.
- Pinned profile/reasoning/escalation history.

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

Add modelState to checkpoint/job metadata.

All persistent changes are additive-first. Unknown historical values remain unknown.

## 14. API

No external API change.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No rewrite of old checkpoints; absence means legacy behavior.

Old records do not prove a historical connection/profile pin that was never saved. Preserve the defined legacy reader without inventing past model state; distinguish that limitation from new pinned records. Persist no credential or hidden reasoning in modelState. Explicitly define which model/connection/effort/policy changes invalidate a new pin, and test credential rotation separately from a model/connection change.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

New checkpoints may add modelState additively; old checkpoints map to Legacy Profile and preserve original research cutoff/evidence/tool state.

For new pinned records, incompatibility must fail safely before dispatch or retry acquisition. Do not implement pin mismatch by merely returning null from research-resume: the existing research-retry fallback would restart acquisition and lose the promised continuation/cutoff behavior. Pending tool calls must remain on their original compatible context. Private modelState must not leak into job list/detail/public events merely because it is added to a stored job.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Persist profile/policy/routing decision/usage metadata, never hidden reasoning.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

Use MODEL_ROUTING_MODE and release-specific flags/config; legacy remains an immediate fallback until acceptance.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Old checkpoint resume.
- New checkpoint resume.
- Pending tool call checkpoint.
- Changed model/connection/policy/effort rejects new pinned resume before provider/tool/acquisition work, without changing cutoff.
- Legacy records preserve existing reads without fabricated historical identity; corrupt new state cannot downgrade to legacy absence.
- Compatible process restart and credential rotation; private state excluded from public detail/list/events.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.9-AC01:** Resume never silently changes profile or market cutoff.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

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

- Cross-provider escalation itself

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
