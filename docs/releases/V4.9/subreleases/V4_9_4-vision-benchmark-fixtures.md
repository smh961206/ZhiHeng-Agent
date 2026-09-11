# V4.9.4 — Vision benchmark fixtures

Release: `V4.9`
Implementation Status: CURRENT implementation and offline validation. See [report](../V4_9_4-completion-report.md). Real candidate quality and production promotion remain unaccepted.

## 1. Why

Build frozen screenshot/table/scanned-PDF fixture set.

## 2. Preconditions

- V4.9 previous accepted subrelease(s) completed.

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
- `server/document-reader.mjs`
- `server/pdf-processing.mjs`
- `server/material-vision.mjs`
- `server/visual-reading.mjs`

If paths or ownership changed, update `docs/architecture/current-implementation-map.md`; do not force the repository to match stale filenames.

## 4. Current Behavior

Before V4.9.4, the owning release capability is either absent, partial, or still on the previous accepted implementation.

## 5. Target Behavior

Build frozen screenshot/table/scanned-PDF fixture set.

## 6. In Scope

- 40+ cases
- Expected numbers/units/headers/signs/footnotes

## 7. Out of Scope

- Production routing

## 8. Deliverables

- 40+ cases
- Expected numbers/units/headers/signs/footnotes

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
- `docs/contracts/evidence.contract.md`

A contract change must remain compatible with already-persisted objects or include an explicit migration/version boundary.

## 11. Invariant Changes

Relevant invariant sets:

- `docs/invariants/model.invariants.md`
- `docs/invariants/evidence.invariants.md`

Do not weaken an ENFORCED invariant. A TARGET invariant becomes ENFORCED only when its owning behavior is actually implemented and tested.

## 12. ADR Dependencies

- `docs/adr/ADR-002-model-gateway.md`
- `docs/adr/ADR-001-evidence-first.md`
- `docs/adr/ADR-014-quality-before-cost.md`

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

Visual processing retries must not duplicate completed extraction/audit records; checkpoint behavior remains compatible.

This subrelease is incomplete if interruption/retry can duplicate completed work, lose evidence, change data cutoff, or corrupt the prior validated state.

## 17. Point-in-Time

Vision model changes cannot alter document/source dates or turn future information into historical evidence.

No future-information contamination is allowed.

## 18. Provenance

Retain visual source/page/image identity, model profile and extraction method; Vision result remains unverified evidence.

Every newly introduced derived/canonical object must be able to answer “where did this come from?” at the semantic level appropriate to this release.

## 19. Feature Flag

FEATURE_VISION_ROUTING / configured vision slots; existing Vision remains fallback until benchmark acceptance.

High-risk behavior should be observable in disabled/dry-run/dual-run mode before becoming canonical where practical.

## 20. Tests

- Vision benchmark fixtures regression tests
- Existing visual/OCR tests

Also run all existing tests affected by the inspected modules.

## 21. Acceptance Cases

- **V4.9.4-AC01:** Build frozen screenshot/table/scanned-PDF fixture set. without weakening Vision unverified-evidence rules.

Acceptance is behavioral, not “code exists”.

## 22. Benchmark Gate

Frozen Vision cases must meet or beat current primary on numeric, unit, header, sign, date, footnote and table-relationship accuracy before primary switch.

If this subrelease does not itself introduce a benchmarkable behavior, it must at least preserve the owning release baseline.

## 23. Rollout

gateway-normalized legacy vision → offline challenger → fallback test → primary switch only after gate.

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

- Production routing

Do not proceed to the next subrelease unless the user explicitly authorizes continuation or explicitly asked Codex to execute the entire current core release.
