# V4.8.0 — LLM call inventory

Release: `V4.8`
Implementation Status: CURRENT — inventory accepted; see [completion report](../V4_8_0-completion-report.md). Runtime behavior is unchanged. Later Gateway/Profile capabilities remain FUTURE.

## 1. Why

Find every real model invocation and classify its purpose before abstraction.

## 2. Preconditions

- Owning release prerequisites are accepted.
- Current repository baseline has been inspected.

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
- `server/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V4.8.0, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Find every real model invocation and classify its purpose before abstraction.

## 6. In Scope

- Create model-call inventory: router/research/review/followup/vision/other.
- Record direct endpoint/provider-specific parameters and streaming path.

## 7. Out of Scope

- Changing model behavior
- Adding new provider

## 8. Deliverables

- Create model-call inventory: router/research/review/followup/vision/other.
- Record direct endpoint/provider-specific parameters and streaming path.

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

V4.8.0 does not change checkpoints or resume. Inventory current private state and configuration coupling. Additive modelState and old-checkpoint Legacy Profile mapping belong to V4.8.9, not this inventory subrelease.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Record source owners/anchors and baseline hashes in the inventory, never keys or hidden reasoning. Runtime profile/policy/routing/usage persistence belongs to later subreleases.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

No feature flag or config is added in V4.8.0. MODEL_ROUTING_MODE and Legacy Profiles remain future subrelease work; this inventory cannot be rolled back using an unimplemented switch.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Static search baseline for direct LLM endpoints.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.0-AC01:** Inventory accounts for every production LLM call discovered in repository.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

Publish the verified inventory and static search baseline without runtime rollout. The later release rollout remains legacy → dry-run → policy/internal → partial production → default only after benchmark gate.

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

- Changing model behavior
- Adding new provider

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
