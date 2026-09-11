# V4.8.7 — Model usage telemetry

Release: `V4.8`
Implementation Status: CURRENT — accepted after both reviews and the successful Linux deployment gate. See [completion report](../V4_8_7-completion-report.md) and [deployment acceptance](../V4_8_7-deployment-acceptance.md). V4.8.8/.9 remain unimplemented.

## 1. Why

Capture normalized model usage/performance without prompt/reasoning content.

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
- `server/storage.mjs`
- `server/schema-migrations.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

The accepted V4.8.6 Gateway returns in-memory usage/performance and logs dry-run decisions, but has no durable ModelCall or job usage aggregation.

## 5. Target Behavior

Capture normalized model usage/performance without prompt/reasoning content.

## 6. In Scope

- ModelCall record.
- Job-level usage summary.
- Token source/provider/estimated/unknown.
- Latency/TTFT.

## 7. Out of Scope

- Cost-based routing

## 8. Deliverables

- ModelCall record.
- Job-level usage summary.
- Token source/provider/estimated/unknown.
- Latency/TTFT.

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

Add model_calls and migration 2 index. Provide on-demand internal job summary, with no public job payload changes.

All persistent changes are additive-first. Unknown historical values remain unknown.

## 14. API

No external API change.

Existing callers must remain compatible unless this subrelease explicitly introduces a versioned API boundary.

## 15. Migration

No mandatory historical backfill; old calls remain absent/unknown.

Default migration discipline:
additive → dual-read if needed → new-write → verified backfill → cutover → cleanup in a later accepted release.

## 16. Resume / Recovery

No modelState change in V4.8.7; checkpoint compatibility is V4.8.9. Job attribution uses transient async context and independent ModelCall records.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Persist safe profile/purpose/status, routing mode/policy version, usage/performance metadata; no raw decisions, prompts, outputs or hidden reasoning.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

MODEL_TELEMETRY_ENABLED=false disables production telemetry writes; legacy/dry-run selection is unchanged. Writer setup is explicit for standalone consumers.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Telemetry writes.
- Secret/prompt/reasoning redaction.
- Job aggregation.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.7-AC01:** Every new Gateway call can be attributed to profile/purpose/status.

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

- Cost-based routing

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
