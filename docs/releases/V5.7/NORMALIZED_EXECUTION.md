# V5.7 Normalized Execution

## Rule

This core release contains 16 executable subreleases.

Do not treat `V5.7` as one giant patch.

## Sequence

1. `V5.7.0` — Hypothesis Schema
2. `V5.7.1` — Hypothesis Evaluation Loop
3. `V5.7.2` — Belief Schema
4. `V5.7.3` — Uncertainty Taxonomy Runtime
5. `V5.7.4` — Forecast Data Model
6. `V5.7.5` — Revenue Forecast V1
7. `V5.7.6` — Margin/FCF Forecast V1
8. `V5.7.7` — Scenario Engine V1
9. `V5.7.8` — Reverse Valuation
10. `V5.7.9` — Research State Schema V1
11. `V5.7.10` — Research State Builder
12. `V5.7.11` — State Renderer
13. `V5.7.12` — Research IR V1
14. `V5.7.13` — Decision Readiness Inputs
15. `V5.7.14` — Calibration Capture
16. `V5.7.15` — Scenario Tree reservation

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
