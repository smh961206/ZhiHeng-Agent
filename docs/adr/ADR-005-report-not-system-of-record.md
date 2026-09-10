# Report Is Not the Long-term System of Record

Status: ACCEPTED

## Decision

Structured Fact/Claim/Calculation/ResearchState objects eventually own research state. Markdown/PDF/Memo are renderers.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
