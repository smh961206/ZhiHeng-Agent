# Report Is Not the Long-term System of Record

Status: ACCEPTED

## Decision

Structured Fact/Claim/Calculation/ResearchState objects eventually own research state. Markdown/PDF/Memo are renderers.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. Structured job/tool/review records coexist with reports; canonical ResearchState is future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
