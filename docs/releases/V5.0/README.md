# V5.0 — Model Benchmark / Challenger

Status: FUTURE until CURRENT is changed to this release

## Goal

Make model selection evidence-based using ZhiHeng-specific benchmarks and task champions.

## Subrelease sequence

- **V5.0.0 — Benchmark platform:** Canonical case/fixture/grader/runner structure.
- **V5.0.1 — Main challenger offline:** Evaluate second Main candidate without production traffic.
- **V5.0.2 — Task champion computation:** Champion by task class with quality gate.
- **V5.0.3 — A/B framework:** Job-pinned experiment group; disabled by default.
- **V5.0.4 — Champion rollout:** Production routing only after statistical/quality acceptance.

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
