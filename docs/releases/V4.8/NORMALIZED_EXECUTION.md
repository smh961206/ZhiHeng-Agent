# V4.8 Normalized Execution

## Rule

This core release contains 12 executable subreleases.

Do not treat `V4.8` as one giant patch.

## Sequence

1. `V4.8.0` — LLM call inventory
2. `V4.8.1` — Model Catalog + Legacy Profiles
3. `V4.8.2` — Gateway request/response normalization
4. `V4.8.3` — Migrate research/review/followup calls
5. `V4.8.4` — Migrate router and vision calls
6. `V4.8.5` — Complexity Evaluator V1
7. `V4.8.6` — Dry-run Model Policy
8. `V4.8.7` — Model usage telemetry
9. `V4.8.8` — Health routing V1
10. `V4.8.9` — Checkpoint modelState compatibility
11. `V4.8.10` — Safe Main→Pro escalation
12. `V4.8.11` — Policy mode rollout gate

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
