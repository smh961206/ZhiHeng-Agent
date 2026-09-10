# Human Override Provenance

Status: ACCEPTED

## Decision

Human corrections/overrides are first-class auditable objects and cannot be silently replaced by later model runs.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
