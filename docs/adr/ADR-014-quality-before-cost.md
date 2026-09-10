# Quality Before Cost

Status: ACCEPTED

## Decision

Routing order is Capability → Quality → Health → Cost. Cheap but materially worse models cannot become Champion.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
