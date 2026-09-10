# Additive Migration by Default

Status: ACCEPTED

## Decision

Persistent architecture changes use additive schema, dual read, new write, verified backfill, cutover, later cleanup.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
