# Stable Entity Identities

Status: ACCEPTED

## Decision

Ticker/name are not canonical primary keys. Long-term security research uses issuer/security/listing/share-class identities.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
