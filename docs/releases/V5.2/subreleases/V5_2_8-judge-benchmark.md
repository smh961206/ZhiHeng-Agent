# V5.2.8 — Judge benchmark

Release: `V5.2`
Implementation Status: FUTURE at the H0 baseline. Activation under `docs/releases/CURRENT` authorizes scoped work only; status changes require implementation and acceptance evidence.

## 1. Why

Evaluate hard conflict cases against baseline.

## 2. Preconditions

- V5.2 previous accepted subrelease(s) completed.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/model-gateway/`
- `server/agent-execution.mjs`
- `server/research-context.mjs`
- `server/valuation-review.mjs`
- `benchmark/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.2.8, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Evaluate hard conflict cases against baseline.

## 6. In Scope

- Conflict fixtures
- Correctness/cost

## 7. Out of Scope

- Routine benchmark

## 8. Deliverables

- Conflict fixtures
- Correctness/cost

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
- `docs/contracts/claim.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/model.invariants.md`
- `docs/invariants/research.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-014-quality-before-cost.md`
- `docs/adr/ADR-011-offline-learning-only.md`

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

Judge/reviewer session is independent of research session; resume reconstructs normalized evidence/tool context, not hidden provider state.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Judge receives only evidence available to the owning research cutoff.

No future-information contamination is allowed.

## 18. Provenance

Persist judge inputs by references, model profiles, outcome and conflict reason; never hidden reasoning.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_FLAGSHIP_REVIEW / FEATURE_JUDGE default false or rare-path only.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Judge benchmark tests
- Data-missing/provider-failure negative cases

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.2.8-AC01:** Evaluate hard conflict cases against baseline. without making flagship/Judge a default path.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Judge/flagship must improve correctness on hard conflict cases enough to justify cost; routine research must remain mostly Main/Pro without swarm behavior.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

flagship catalog → review escalation → conflict detection → judge offline benchmark → rare-path production.

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

- Routine benchmark

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
