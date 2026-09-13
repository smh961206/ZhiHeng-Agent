# V5.2 — Flagship Pool / Judge

Implementation Status: CURRENT engineering through V5.2.10. Live quality/value and production activation remain unaccepted: the user explicitly continues pausing real-model verification. See [runbook](runbook.md), [execution evidence](execution-log.md), [acceptance](acceptance.md) and [completion report](completion-report.md).

## Goal

Use flagship models only for exceptional complexity, critical review or adjudication.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V5.2.0 — Flagship profile pool:** Flagship tier exists but is not default Main.
- **V5.2.1 — Critical reviewer:** Escalate repeated semantic/review failure.
- **V5.2.2 — Judge contract:** Judge sees evidence/tool results and completed conclusions only.
- **V5.2.3 — Conflict gate:** Judge only on material L1/L2 conflict with sufficient evidence.
- **V5.2.4 — Cost/quality monitoring:** Verify rare-use target and real value.

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
