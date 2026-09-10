# H0 Normalized Execution

## Rule

This core release contains 4 executable subreleases.

Do not treat `H0` as one giant patch.

## Sequence

1. `H0.0` — Repository inventory
2. `H0.1` — Harness control-plane validation
3. `H0.2` — Baseline architecture fitness
4. `H0.3` — H0 acceptance & CURRENT handoff

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
