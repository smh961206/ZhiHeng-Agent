# Quality Before Cost

Status: ACCEPTED

## Decision

Routing order is Capability → Quality → Health → Cost. Cheap but materially worse models cannot become Champion.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: FUTURE. Current fixed provider/config routing is not capability-quality-health-cost selection or Champion promotion.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
