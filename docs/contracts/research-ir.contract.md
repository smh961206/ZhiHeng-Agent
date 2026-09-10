# Research IR Contract
Implementation Status: FUTURE
Earliest Release: V5.7+ design integration; runtime only after explicit release scope.

Research IR is machine-readable research intent/plan, not a prompt and not a report.

Reserved fields:
researchTarget, asOf, mode, hypotheses/claims, evidenceRequirements, methods, constraints, output requirements.

Do not implement Research IR runtime opportunistically in earlier releases.

## H0 implementation evidence

Current research plans and public execution steps do not implement this reserved IR.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
