# V5.3 Benchmark

The original V5.3 Knowledge benchmark results are retained in `validation-results.json`; its Node runner was removed with the backend cutover and is no longer an executable repository command.

Current executable command: `python -m benchmark.runner`. It uses frozen fixtures, makes zero model/network calls, and checks point-in-time exclusion, missing-value preservation, calculation lineage, visual-review boundaries and the absence of Node backend entrypoints. Knowledge catalog, pointer and immutable-snapshot integrity are additionally enforced by `python -m pytest python_tests/test_knowledge.py`.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
