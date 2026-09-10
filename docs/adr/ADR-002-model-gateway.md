# Model Gateway

Status: ACCEPTED

## Decision

Business logic expresses capabilities/purpose. Model/provider identity and API differences live behind a gateway and adapters.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
