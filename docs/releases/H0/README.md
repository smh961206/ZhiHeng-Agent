# H0 — Harness Bootstrap

Status: CURRENT

## Goal

Install and validate the Codex engineering control plane with zero investment-research runtime behavior change.

## Subrelease sequence

- **H0.0 — Repository inventory:** Scan current server/src/shared/tests/docs/knowledge/package/env structure and update current implementation map.
- **H0.1 — Control-plane install:** Install/validate AGENTS, architecture, ADR, contracts, invariants, roadmap and release folders.
- **H0.2 — Baseline alignment:** Mark every future concept CURRENT/PARTIAL/FUTURE; identify overlaps and stale docs.
- **H0.3 — Test baseline:** Run full existing suite and record baseline; no production behavior changes.

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
