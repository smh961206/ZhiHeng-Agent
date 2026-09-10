# Outcome Contract
Implementation Status: FUTURE; target V5.11.

Outcome records what happened after a decision/research prediction.

Must distinguish:
price outcome, business outcome, claim-resolution outcome, and attribution.

A positive return does not automatically prove research correctness.

## H0 implementation evidence

Current researchOutcome stores a delivery summary/action/confidence, not realized investment/business outcomes or attribution.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
