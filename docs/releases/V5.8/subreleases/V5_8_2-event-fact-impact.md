# V5.8.2 — Event→Fact Impact

Release: `V5.8`
Implementation Status: FUTURE at the H0 baseline. Activation under `docs/releases/CURRENT` authorizes scoped work only; status changes require implementation and acceptance evidence.

## 1. Why

Identify facts requiring refresh without creating facts from events.

## 2. Preconditions

- V5.8 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/web-evidence.mjs`
- `server/web-research.mjs`
- `server/research-workflow.mjs`
- `server/research-create.mjs`
- `server/storage.mjs`
- `tests/`
- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-resume.mjs`
- `server/storage.mjs`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.8.2, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Identify facts requiring refresh without creating facts from events.

## 6. In Scope

- Affected metric candidates

## 7. Out of Scope

- Claim impact

## 8. Deliverables

- Affected metric candidates

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

- `docs/contracts/event.contract.md`
- `docs/contracts/research-state.contract.md`
- `docs/contracts/claim.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/point-in-time.invariants.md`
- `docs/invariants/claim-belief.invariants.md`
- `docs/invariants/research.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-004-point-in-time.md`
- `docs/adr/ADR-005-report-not-system-of-record.md`

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

Continuous jobs are idempotent and checkpointed; a failed update cannot corrupt the previous validated state.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

EventTime/PublishedAt/EffectiveAt/RetrievedAt are distinct and determine whether an event is eligible for a state cutoff.

No future-information contamination is allowed.

## 18. Provenance

Every delta links previous/new state plus triggering event/evidence and affected dependency nodes.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_EVENT_INTELLIGENCE / FEATURE_CONTINUOUS_RESEARCH; scheduler is last and off by default.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Event→Fact Impact tests
- Event/delta/resume/point-in-time tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.8.2-AC01:** Identify facts requiring refresh without creating facts from events. without mutating validated state before revalidation.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Frozen event sequences test event dedup, materiality, affected-claim recall, delta correctness and savings versus full rerun.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

event records → classifier → fact impact → materiality → delta → selective revalidation → monitoring → priorities → manual continuous → scheduler.

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

- Claim impact

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
