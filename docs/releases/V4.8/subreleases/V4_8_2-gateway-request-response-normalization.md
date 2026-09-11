# V4.8.2 — Gateway request/response normalization

Release: `V4.8`
Implementation Status: CURRENT — standalone Gateway normalization implemented; see [completion report](../V4_8_2-completion-report.md). Business-call migration remains FUTURE.

## 1. Why

Create canonical Model Gateway client and adapter boundary.

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

V4.8.1 was accepted and committed at `de56872c3718371e086454a291d385f6992bcd24`. Catalog metadata existed; four production transports still owned requests. V4.8.2 adds a standalone adapter/facade and opt-in parser metadata/validation without migrating those callers.

## 5. Target Behavior

Create canonical Model Gateway client and adapter boundary.

## 6. In Scope

- modelGateway.complete(request).
- Canonical response/usage/performance/billing.
- Provider error taxonomy.
- Reuse current model-stream safety behavior.

## 7. Out of Scope

- Migrating all call sites yet

## 8. Deliverables

- modelGateway.complete(request).
- Canonical response/usage/performance/billing.
- Provider error taxonomy.
- Reuse current model-stream safety behavior.

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

Add internal Model Gateway complete() contract.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No migration required.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

No checkpoint or resume schema changes in V4.8.2. Private continuation is an explicit in-memory, same-Gateway accessor and does not pin or migrate jobs. Additive modelState and old-checkpoint mapping belong to V4.8.9.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Return profile/model/tier, safe usage/performance/billing metadata and a public message without hidden reasoning. No metadata persistence, policy decision or public history is introduced here; durable telemetry belongs to V4.8.7 and modelState to V4.8.9.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

No routing-mode feature flag is added in V4.8.2. The API is standalone and existing business callers remain active; MODEL_ROUTING_MODE rollout belongs to later subreleases.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Non-stream/stream/tool call/abort/timeout/429/5xx/malformed/truncated/refusal.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.2-AC01:** Gateway can reproduce current provider call semantics without public reasoning leakage.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Model-routing benchmark must preserve delivery/citation quality and introduce no critical fact regression versus the pinned legacy baseline.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

Standalone API acceptance first. Business integration occurs only in V4.8.3/V4.8.4. Future policy rollout remains legacy → dry-run → policy/internal → partial production → default only after benchmark gates.

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

- Migrating all call sites yet

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
