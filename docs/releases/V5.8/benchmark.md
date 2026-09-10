# V5.8 Benchmark

Frozen event sequences; materiality classification, affected-claim recall, delta correctness, avoided unnecessary full reruns.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
