# V5.3 Benchmark

Knowledge rule compliance, false trigger, missed trigger, ontology mapping, domain regressions.

Executable command: `npm run benchmark:knowledge`. It uses only the repository-pinned K1.0.0 catalog and immutable snapshot, makes zero model/network calls, and fails on linter errors, any A–F hard-rule omission, bank-FCF missed trigger, commodity bank-rule false trigger, ontology mapping loss or unstable compiler fingerprint.

## Benchmark principles
- Prefer frozen fixtures.
- Separate data-source instability from model/system quality.
- Compare against a pinned baseline.
- Critical quality gates cannot be compensated by lower cost.
- Persist benchmark version and configuration for reproducibility.
