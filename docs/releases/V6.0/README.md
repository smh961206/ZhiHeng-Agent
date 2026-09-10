# V6.0 — Investment Intelligence OS Platform

Status: FUTURE until CURRENT is changed to this release

## Goal

Turn the single-user research system into governed multi-user/workspace infrastructure and a structured Research Workbench without compromising domain semantics.

## Subrelease sequence

- **V6.0.0 — Workspace/Tenant foundation:** workspaceId/tenantId boundaries.
- **V6.0.1 — RBAC:** Owner/Researcher/Reviewer/Viewer.
- **V6.0.2 — Audit Ledger:** Append-oriented critical domain events.
- **V6.0.3 — Data classification/provider governance:** PUBLIC/PRIVATE/CONFIDENTIAL/RESTRICTED and routing rights.
- **V6.0.4 — Human research workflow:** Approve/reject/pin/override/recheck/comment.
- **V6.0.5 — Research Workbench:** Thesis/Claims/Beliefs/Facts/Assumptions/Valuation/Evidence/Delta UI.
- **V6.0.6 — Machine-verifiable Research Package:** Manifest + structured objects + report + provenance.
- **V6.0.7 — ZRP v1:** Research interchange protocol.
- **V6.0.8 — API/MCP:** Controlled external research interfaces.
- **V6.0.9 — Worker/Queue:** Only when real continuous/multi-instance load requires it.
- **V6.0.10 — Tenant-safe continuous research:** Scheduling and event processing per workspace.
- **V6.0.11 — Team Knowledge/governance:** Workspace-scoped approvals while preserving global contracts.
- **V6.0.12 — Institutional deployment hardening:** Retention, backup, disaster recovery, observability, permissions.

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
