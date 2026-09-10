# V4.9 — Unified Multimodal Layer

Implementation Status: FUTURE at the H0 baseline. CURRENT selects the next authorized release; it does not establish implementation or acceptance.

## Goal

Make Vision a capability-routed Gateway workload; benchmark and optionally introduce primary/fallback models without changing Vision evidence trust rules.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V4.9.0 — Vision request normalization:** All Vision model requests use Model Gateway with imageInput capability.
- **V4.9.1 — Vision fixture harness:** Create frozen financial-table/screenshot/scanned-PDF benchmark.
- **V4.9.2 — Vision challenger:** Add second image-capable profile offline.
- **V4.9.3 — Primary/fallback policy:** Provider/capability failure fallback; unreadable input is not repeated blindly.
- **V4.9.4 — Rollout:** Switch primary only if benchmark passes; preserve old profile as fallback.

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
