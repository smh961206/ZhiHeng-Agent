# No Agent Swarm by Default

Status: ACCEPTED

## Decision

Default architecture is one research orchestrator + deterministic tools + independent review. Split agents only for real state/permission/tool/evaluation boundaries.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: CURRENT. One orchestrator plus deterministic tools and independent review; local render/provider workers are not an agent swarm.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
