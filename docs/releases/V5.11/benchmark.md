# V5.11 Benchmark

Replay leakage tests, failure regression, calibration metrics, attribution sanity, structured diff correctness.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
