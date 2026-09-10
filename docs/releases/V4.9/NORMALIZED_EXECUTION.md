# V4.9 Normalized Execution

## Rule

This core release contains 9 executable subreleases.

Do not treat `V4.9` as one giant patch.

## Sequence

1. `V4.9.0` — Vision call inventory
2. `V4.9.1` — Vision canonical request
3. `V4.9.2` — Vision response normalization
4. `V4.9.3` — Remove concrete model-name capability logic
5. `V4.9.4` — Vision benchmark fixtures
6. `V4.9.5` — Vision graders
7. `V4.9.6` — Vision challenger offline
8. `V4.9.7` — Vision fallback policy
9. `V4.9.8` — Vision primary promotion gate

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
