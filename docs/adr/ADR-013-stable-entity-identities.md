# Stable Entity Identities

Status: ACCEPTED

## Decision

Ticker/name are not canonical primary keys. Long-term security research uses issuer/security/listing/share-class identities.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. Directory-backed resolution exists; canonical stable issuer/security/listing/share-class entities are future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
