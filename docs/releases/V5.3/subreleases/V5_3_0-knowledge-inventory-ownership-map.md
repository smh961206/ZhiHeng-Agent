# V5.3.0 — Knowledge inventory & ownership map

Release: `V5.3`
Implementation Status: FUTURE at the H0 baseline. Activation under `docs/releases/CURRENT` authorizes scoped work only; status changes require implementation and acceptance evidence.

## 1. Why

Build machine-readable inventory of current Knowledge without changing research behavior.

## 2. Preconditions

- Owning release prerequisites are accepted.
- Current repository baseline has been inspected.

## 3. Current Code Inspection

Codex must inspect the real checkout before editing:

- `server/knowledge.mjs`
- `server/knowledge-excerpt.mjs`
- `server/knowledge-snapshots.mjs`
- `server/research-context.mjs`
- `knowledge/`
- `tests/`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V5.3.0, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Build machine-readable inventory of current Knowledge without changing research behavior.

## 6. In Scope

- Canonical module/section inventory
- Candidate layer classification
- Overlap map

## 7. Out of Scope

- Moving/re-writing content

## 8. Deliverables

- Canonical module/section inventory
- Candidate layer classification
- Overlap map

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

- `docs/contracts/source.contract.md`
- `docs/contracts/fact.contract.md`
- `docs/contracts/security-master.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/knowledge.invariants.md`
- `docs/invariants/research.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-008-knowledge-not-company-opinion.md`
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

Every running research job pins its Knowledge snapshot/pack; resume uses the pinned version.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Knowledge versions have effective time; historical replay must eventually use historical K snapshot, not current rules.

No future-information contamination is allowed.

## 18. Provenance

Rule IDs, origin/KCP, hashes, tests and snapshot fingerprints are persisted/versioned.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_KNOWLEDGE_RESOLVER / FEATURE_KNOWLEDGE_COMPILER; legacy Knowledge path remains until K-Series acceptance.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Knowledge inventory & ownership map tests
- Existing Knowledge snapshot/regression tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V5.3.0-AC01:** Build machine-readable inventory of current Knowledge without changing research behavior. while preserving pinned legacy Knowledge behavior.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Knowledge regression must measure rule compliance, false/missed triggers and domain non-regression before a K snapshot is published.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

inventory → metadata → Constitution/Ontology → dry-run resolver → compiler → linter/regression → K snapshot → governed change workflow.

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

- Moving/re-writing content

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
