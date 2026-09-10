# Additive Migration by Default

Status: ACCEPTED

## Decision

Persistent architecture changes use additive schema, dual read, new write, verified backfill, cutover, later cleanup.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: CURRENT. Schema migrations append sequential versions, lock upgrades and reject downgrade; H0 creates no migration.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
