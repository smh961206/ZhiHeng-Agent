# No Agent Swarm by Default

Status: ACCEPTED

## Decision

Default architecture is one research orchestrator + deterministic tools + independent review. Split agents only for real state/permission/tool/evaluation boundaries.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
