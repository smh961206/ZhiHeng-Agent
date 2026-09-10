# V5.5 Normalized Execution

## Rule

This core release contains 14 executable subreleases.

Do not treat `V5.5` as one giant patch.

## Sequence

1. `V5.5.0` — Security identity inventory
2. `V5.5.1` — Issuer/Security/Listing/ShareClass schema
3. `V5.5.2` — Identifier Resolver Bridge
4. `V5.5.3` — Corporate Action base
5. `V5.5.4` — Fact Schema V1
6. `V5.5.5` — Metric Ontology runtime bridge
7. `V5.5.6` — Period Engine
8. `V5.5.7` — Currency Engine
9. `V5.5.8` — Accounting Scope Engine
10. `V5.5.9` — Share Basis Engine
11. `V5.5.10` — Fact Verification Pipeline
12. `V5.5.11` — Restatement / Revision Engine
13. `V5.5.12` — Fact Conflict Resolver
14. `V5.5.13` — Fact Lineage API

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
