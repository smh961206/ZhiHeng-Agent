# V4.8.8 — Health routing V1

Release: `V4.8`
Implementation Status: CURRENT — internal health routing accepted; production remains legacy. See [completion report](../V4_8_8-completion-report.md).

## 1. Why

Separate provider availability from intelligence escalation.

## 2. Preconditions

- V4.8 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/model-routing.mjs`
- `server/model-catalog.mjs`
- `server/model-gateway.mjs`
- `server/model-adapter.mjs`
- `server/model-gateway-result.mjs`
- `server/model-request.mjs`
- `server/model-telemetry.mjs`
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

All mapped model callers use one Gateway/adapter. Existing model-request retries bounded pre-response transport failures; router/Vision retain one attempt. Gateway errors already distinguish rate_limit, provider_unavailable, network, timeout and aborted. V4.8.7 stores safe per-call outcomes, but no recent-error health window, cooldown or same-tier fallback selector exists. Catalog currently permits legacy tiers only; MAIN/PRO labels are unbound dry-run candidates. Existing retry counts are not a health policy or reasoning-failure classifier.

## 5. Target Behavior

Separate provider availability from intelligence escalation.

## 6. In Scope

- Recent provider error tracking.
- Temporary cooldown.
- Same-tier fallback selection.

## 7. Out of Scope

- Complex distributed circuit breaker

## 8. Deliverables

- Recent provider error tracking.
- Temporary cooldown.
- Same-tier fallback selection.

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

No checkpoint modelState change belongs in V4.8.8; that is V4.8.9. Health selection must respect explicit profile choices and existing assistant/tool continuations. Do not replay a completed or partially streamed call through another provider, or transfer private reasoning to a fallback. An unavailable safe candidate is an availability outcome, never permission to upgrade intelligence tier or restart research acquisition.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Model routing must never refresh or alter the research/data cutoff.

No future-information contamination is allowed.

## 18. Provenance

Reuse V4.8.7 ModelCall metadata where available; do not add a second telemetry store or persistent health schema. An absent best-effort telemetry record is not a successful call. Provider-health observations must retain their own failure category and must not populate complexity reasoningFailureCount. Never store hidden reasoning or credentials in health keys/logs.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

Use MODEL_ROUTING_MODE and release-specific flags/config; legacy remains an immediate fallback until acceptance.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- 429/503/timeout cooldown.
- Successful recovery.
- No Pro escalation for transport failure.
- Explicit profile and pending tool/private-history safety; no replay after partial output.
- Same-tier candidate capability/quality eligibility before health, with missing configuration failing closed.
- Expiring/bounded health state, isolated connection identities and out-of-order concurrent outcomes.

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.8.8-AC01:** Provider outage cannot be recorded as model-reasoning failure.

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

- Complex distributed circuit breaker

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
