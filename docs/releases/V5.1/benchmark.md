# V5.1 Benchmark

Compare effective task cost, delivery pass and critical-quality metrics on fixed cases.

The executable frozen gate is scripts/cost-benchmark.mjs with tests/fixtures/cost-budget-v51.json. It records fixture/code hashes and formula version, makes zero model requests and tests six cost/quality cases. Lower known cost passes only with preserved delivery and zero critical errors; unknown fees, uncertain retry costs and mixed currencies do not establish savings. These simulated arithmetic cases do not replace V5.0 full-research quality acceptance or claim measured production savings. The existing unified text/Vision runner remains the model-comparison owner.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
