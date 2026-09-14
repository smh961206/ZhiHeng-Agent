# V5.3 — Knowledge Engineering

Implementation Status: CURRENT. V5.3.0–V5.3.11 are implemented and accepted through repository-pinned offline validation. No live model call is required by this release.

Post-acceptance Knowledge cutover is governed by [ADR-016](../../adr/ADR-016-k-series-active-knowledge.md): K1.0.0 is the first retained and only active Knowledge version.

The user-approved version clarification is governed by [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md): platform V and Knowledge K are the two release lines. Execution and model-context compatibility use internal counters and do not create additional release lines.

The subsequent frontend copy, saved-version display and recovery-action alignment is recorded in the [frontend version sync report](frontend-version-sync-report.md).

The user-authorized platform-wide frontend follow-up covers everyday navigation, copy, visual hierarchy, handbook search and history filters. See the [platform experience report](platform-experience-report.md).

The subsequent user-authorized full offline regression, UI fixes and isolated Docker deployment/rollback evidence are recorded in the [full regression report](full-regression-report.md). Real-model acceptance remains excluded.

The repository-wide JavaScript-to-TypeScript migration and its compatibility boundary are recorded in the [TypeScript migration report](typescript-migration-report.md). The related frontend package, testing, module-boundary and state-management decisions are recorded in the [frontend engineering upgrade decision](../../architecture/frontend-engineering-upgrade.md).

The implemented frontend engineering baseline—strict TypeScript boundary, Hooks linting, OpenAPI-generated client types, component interaction tests and CI gates—is recorded in the [frontend engineering iteration report](frontend-engineering-iteration-report.md).

The later user-authorized backend cutover is recorded in the [FastAPI migration report](fastapi-backend-migration-report.md). Its final [capability matrix](node-python-capability-matrix.md), machine-checkable [113-module parity manifest](node-python-parity-manifest.json), [engineering plan](python-backend-engineering-plan.md) and [delivery checklist](python-backend-delivery-backlog.md) are complete. Python is now the sole backend runtime; `server/`, cross-runtime `shared/`, the legacy benchmark platform and their TypeScript backend tests have been removed. TypeScript remains the browser and frontend-tooling language, with client-only display rules under `src/domain/`.

The subsequent repository boundary cleanup is recorded in the [repository cleanup report](repository-cleanup-report.md). It consolidates the two public release lines and removes retired cross-runtime code without changing research data or API contracts.

The later user-authorized model-support synchronization is recorded in the [completion report](model-support-sync-completion-report.md). It restores optional Critical Reviewer, Judge, research-budget and Vision-quality contracts in Python while explicitly retiring the old automatic model-governance stack.

The user-authorized Prompt and context optimization route is implemented in the [Prompt governance completion report](prompt-governance-completion-report.md). It inventories every production model stage, compiles safe Prompt plans, enforces calculation-evidence completeness, bounds repair history, deduplicates identical vision pages and adds body-free efficiency telemetry. It does not add an external release line or implement future Research IR objects.

The subsequent full UI regression, release gates, complete offline benchmark and isolated Docker deployment/rollback validation are recorded in the [Prompt governance full validation report](prompt-governance-full-validation-report.md). Every authorized gate passed; real-model validation was explicitly excluded.

The legacy `researchCutoff` retry compatibility fix and redesigned failure presentation are recorded in the [research cutoff compatibility report](research-cutoff-compatibility-report.md). Legacy retries retain their original creation-time boundary and expose its provenance instead of refreshing the cutoff.

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
