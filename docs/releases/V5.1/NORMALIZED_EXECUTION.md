# V5.1 Normalized Execution

## Rule

This core release contains 15 executable subreleases.

Do not treat `V5.1` as one giant patch.

## Sequence

1. `V5.1.0` — Pricing schema
2. `V5.1.1` — Pricing registry/history
3. `V5.1.2` — Usage normalization
4. `V5.1.3` — Per-call cost calculation
5. `V5.1.4` — Job cost aggregation
6. `V5.1.5` — Effective Task Cost
7. `V5.1.6` — Cache fingerprint
8. `V5.1.7` — Cache analytics
9. `V5.1.8` — Cache eligibility gate
10. `V5.1.9` — Cost candidate ranking
11. `V5.1.10` — Research budget schema
12. `V5.1.11` — Budget accounting
13. `V5.1.12` — Budget-aware retrieval
14. `V5.1.13` — Peak/off-peak pricing support
15. `V5.1.14` — Cost observability UI/API

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
