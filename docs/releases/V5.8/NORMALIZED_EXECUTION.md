# V5.8 Normalized Execution

## Rule

This core release contains 12 executable subreleases.

Do not treat `V5.8` as one giant patch.

## Sequence

1. `V5.8.0` — Event Identity / Time
2. `V5.8.1` — Event Classifier V1
3. `V5.8.2` — Event→Fact Impact
4. `V5.8.3` — Materiality Engine V1
5. `V5.8.4` — Research Delta Schema
6. `V5.8.5` — Selective Revalidation Planner
7. `V5.8.6` — Monitoring Metric Links
8. `V5.8.7` — Leading Indicator Registry
9. `V5.8.8` — Thesis Fragility
10. `V5.8.9` — Research Priority
11. `V5.8.10` — Continuous Scheduler V1
12. `V5.8.11` — Continuous Coverage Benchmark

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
