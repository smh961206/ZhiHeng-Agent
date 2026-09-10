# V5.10 Normalized Execution

## Rule

This core release contains 14 executable subreleases.

Do not treat `V5.10` as one giant patch.

## Sequence

1. `V5.10.0` — Portfolio/Position Schema
2. `V5.10.1` — Exposure Engine V1
3. `V5.10.2` — Factor Exposure V1
4. `V5.10.3` — Liquidity Engine
5. `V5.10.4` — Price Correlation
6. `V5.10.5` — Thesis Correlation
7. `V5.10.6` — Business Relationship Graph V1
8. `V5.10.7` — Macro/Regime State V1
9. `V5.10.8` — Hidden Exposure Engine
10. `V5.10.9` — Risk Budget
11. `V5.10.10` — Capital Allocation V1
12. `V5.10.11` — Counterfactual Allocation
13. `V5.10.12` — Portfolio Thesis UI/API
14. `V5.10.13` — Portfolio Benchmark

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
