# V5.0 Benchmark

Current corpus: 56 frozen component cases (8 synthetic text, 48 original Vision), two profiles and two repeats. This is 224 engineering observations, not 224 independent real quality samples. Statistical admission needs 50 independent fixtures per applicable task with paired repeats. No full-research champion quality dataset has been accepted. See [completion report](completion-report.md), [execution log](execution-log.md) and [operations runbook](runbook.md).

Expand to 100+ cases over time; quality dimensions: facts, citations, tools, rule compliance, delivery, cost, latency.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
