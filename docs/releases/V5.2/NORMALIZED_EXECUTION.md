# V5.2 Normalized Execution

## Rule

This core release contains 11 executable subreleases.

Do not treat `V5.2` as one giant patch.

## Sequence

1. `V5.2.0` — Flagship tier schema
2. `V5.2.1` — Flagship eligibility gate
3. `V5.2.2` — Critical review escalation
4. `V5.2.3` — Core conflict detector
5. `V5.2.4` — Judge input contract
6. `V5.2.5` — Judge output contract
7. `V5.2.6` — Judge validation
8. `V5.2.7` — Judge telemetry
9. `V5.2.8` — Judge benchmark
10. `V5.2.9` — Rare-path rollout
11. `V5.2.10` — Flagship drift/usage guard

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
