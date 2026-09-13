# V5.3 — Knowledge Engineering

Implementation Status: CURRENT. V5.3.0–V5.3.11 are implemented and accepted through repository-pinned offline validation. No live model call is required by this release.

Post-acceptance Knowledge cutover is governed by [ADR-016](../../adr/ADR-016-k-series-active-knowledge.md): K1.0.0 is the only active Knowledge version; V4.x is read-only history.

The user-approved version clarification is governed by [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md): platform V and Knowledge K are the two release lines. Execution uses internal compatibility counters; M1.x remains an engineering milestone record delivered with the platform.

The subsequent frontend copy, saved-version display and recovery-action alignment is recorded in the [frontend version sync report](frontend-version-sync-report.md).

The user-authorized platform-wide frontend follow-up covers everyday navigation, copy, visual hierarchy, handbook search and history filters. See the [platform experience report](platform-experience-report.md).

The subsequent user-authorized full offline regression, UI fixes and isolated Docker deployment/rollback evidence are recorded in the [full regression report](full-regression-report.md). Real-model acceptance remains excluded.

## Goal

Evolve existing Knowledge/snapshot modules into a versioned, testable, scoped and eventually executable knowledge system without rewriting all content at once.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V5.3.0 — Knowledge inventory:** Assign module/section IDs and hashes; map current snapshots.
- **V5.3.1 — Rule IDs/metadata:** Structure 20–50 highest-impact rules first.
- **V5.3.2 — Constitution/Ontology extraction:** Separate stable principles and canonical concepts without mass methodology rewrite.
- **V5.3.3 — Knowledge Resolver:** Resolve minimal pack by mode/archetype/claim/method.
- **V5.3.4 — Linter/regression:** Duplicate/conflict/orphan/undefined-term/scope/test checks.
- **V5.3.5 — K-Series snapshot:** Start K1.0.0, pin per research job.
- **V5.3.6 — Knowledge Change Proposal:** Root-cause gate, KCP and Knowledge Debt.
- **V5.3.7 — Promote-to-runtime workflow:** Track rules that should become validators/engines.
- **V5.3.8 — K-Series snapshot:** Start K1.0.0 and pin it per research job.
- **V5.3.9 — Knowledge Change Proposal:** Root-cause gate, KCP and Knowledge Debt.
- **V5.3.10 — Promote-to-runtime workflow:** Bind a small deterministic validation surface.
- **V5.3.11 — Impact/decay metadata:** Affected benchmark/state map, lastValidatedAt/needs_review.

## Scope lock

Only the items described by this release and its subreleases are in scope.

Future release concepts may be referenced for compatibility, but may not be implemented opportunistically.

## Required read-before-code

- `AGENTS.md`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- relevant contracts
- relevant invariants
- relevant ADRs
- current repository implementation/tests
