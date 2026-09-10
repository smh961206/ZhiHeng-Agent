# V5.4 Normalized Execution

## Rule

This core release contains 10 executable subreleases.

Do not treat `V5.4` as one giant patch.

## Sequence

1. `V5.4.0` — Source Contract adapter
2. `V5.4.1` — Evidence Contract normalization
3. `V5.4.2` — BM25 lexical layer
4. `V5.4.3` — Embedding provider/index
5. `V5.4.4` — Hybrid fusion
6. `V5.4.5` — Reranker
7. `V5.4.6` — Retrieval Planner
8. `V5.4.7` — Evidence Pack
9. `V5.4.8` — Contradiction Registry
10. `V5.4.9` — Retrieval benchmark

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
