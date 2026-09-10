# Evidence First

Status: ACCEPTED

## Decision

Research conclusions are grounded in retrieved/verified evidence. Missing data stays missing. Models do not complete the story by inventing facts.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. Evidence/citation/calculation gates and independent review exist; universal semantic grounding still depends on model compliance.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
