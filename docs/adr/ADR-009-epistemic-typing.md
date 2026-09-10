# Epistemic Typing

Status: ACCEPTED

## Decision

Verified, observed, derived, estimated, forecast, assumed and unknown are different semantic states and must not collapse into one value field.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. Observation/assumption/review warnings are distinguished in existing paths; unified epistemic type engine is future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
