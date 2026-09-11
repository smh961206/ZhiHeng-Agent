# V5.0 — Model Benchmark / Challenger

Implementation Status: PARTIAL. All fourteen normalized engineering steps are implemented with passing local regression. Real full-research baseline/challenger quality, operator acceptance and production promotion remain unaccepted. See [completion report](completion-report.md), [execution log](execution-log.md) and [operations runbook](runbook.md).

2026-09-11 用户决定：暂停本轮真实验收。工程实现与已有验证证据保留；真实模型对照、付费测试和生产候选启用不继续执行，等待用户明确恢复。暂停不代表质量验收通过，CURRENT 仍为 V5.0。

## Goal

Make model selection evidence-based using ZhiHeng-specific benchmarks and task champions.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

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
