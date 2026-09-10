# V5.6 Normalized Execution

## Rule

This core release contains 13 executable subreleases.

Do not treat `V5.6` as one giant patch.

## Sequence

1. `V5.6.0` — Calculation inventory
2. `V5.6.1` — Formula Registry
3. `V5.6.2` — Calculation Record wrapper
4. `V5.6.3` — Assumption Registry
5. `V5.6.4` — Claim Schema V1
6. `V5.6.5` — Counter-evidence support
7. `V5.6.6` — Claim Dependency Links
8. `V5.6.7` — Dependency DAG V1
9. `V5.6.8` — Runtime System Invariants
10. `V5.6.9` — Causal Mechanism metadata
11. `V5.6.10` — Narrative Discipline checks
12. `V5.6.11` — Claim Renderer sidecar
13. `V5.6.12` — Claim/Calculation benchmark

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
