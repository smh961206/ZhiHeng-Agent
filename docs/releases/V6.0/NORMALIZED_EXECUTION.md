# V6.0 Normalized Execution

## Rule

This core release contains 16 executable subreleases.

Do not treat `V6.0` as one giant patch.

## Sequence

1. `V6.0.0` — Tenant/Workspace Ownership Inventory
2. `V6.0.1` — Workspace/Tenant Schema
3. `V6.0.2` — RBAC V1
4. `V6.0.3` — Audit Ledger
5. `V6.0.4` — Data Classification
6. `V6.0.5` — Provider Governance
7. `V6.0.6` — Human Override Provenance
8. `V6.0.7` — Human Research Workflow
9. `V6.0.8` — Research Workbench Shell
10. `V6.0.9` — Fact/Claim/Evidence Drilldown
11. `V6.0.10` — Research Package
12. `V6.0.11` — ZRP v1
13. `V6.0.12` — API/MCP Surface
14. `V6.0.13` — Worker/Queue
15. `V6.0.14` — Tenant-safe Continuous Research
16. `V6.0.15` — Production Hardening / DR

## Completion

The core release is complete only after:
- every subrelease has passed its own Stop Condition;
- the release-level acceptance and benchmark files pass;
- rollback is verified;
- architecture/current implementation docs reflect the resulting code;
- the user or release process authorizes changing CURRENT to the next release.
