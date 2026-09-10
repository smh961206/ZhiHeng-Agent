# V5.0 Normalized Execution

## Rule

This core release contains 14 executable subreleases.

Do not treat `V5.0` as one giant patch.

## Sequence

1. `V5.0.0` — Benchmark case contract
2. `V5.0.1` — Fixture loader
3. `V5.0.2` — Deterministic graders
4. `V5.0.3` — Semantic grader policy
5. `V5.0.4` — Benchmark runner
6. `V5.0.5` — Baseline snapshot
7. `V5.0.6` — Challenger profile integration
8. `V5.0.7` — Offline challenger run
9. `V5.0.8` — Statistical comparison
10. `V5.0.9` — Task classification for champion
11. `V5.0.10` — Champion registry
12. `V5.0.11` — A/B assignment
13. `V5.0.12` — Production champion rollout
14. `V5.0.13` — Model drift monitor baseline

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
