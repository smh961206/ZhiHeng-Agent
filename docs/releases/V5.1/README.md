# V5.1 — Cost / Cache / Research Budget

Implementation Status: CURRENT. All V5.1.0–.14 engineering steps and their offline acceptance are complete. The user authorized this release on 2026-09-12. See the [completion report](completion-report.md), [validation results](validation-results.json), [execution evidence](execution-log.md) and [operations](runbook.md). Real-model quality acceptance from V5.0 remains paused; no measured production savings or candidate promotion is asserted.

## Goal

Optimize effective task cost only after capability/quality/health gates and introduce bounded research budgets.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V5.1.0 — Pricing registry:** Effective-dated pricing; unknown price=null.
- **V5.1.1 — Effective task cost:** Aggregate retries/review/tool-loop effects, not API sticker price only.
- **V5.1.2 — Cache analytics:** Prefix fingerprint hashes and observed cache ratios.
- **V5.1.3 — Cost router:** Eligible models only after quality/health gates.
- **V5.1.4 — Research budget:** Max model cost/tool rounds/web requests/vision pages/duration.
- **V5.1.5 — Information-priority integration:** When budget tight, preserve critical claims and cut low-value retrieval first.

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
