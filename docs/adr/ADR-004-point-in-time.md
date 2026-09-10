# Point-in-Time Integrity

Status: ACCEPTED

## Decision

Historical research must use information available at the historical cutoff. Originally reported and later restated information remain distinguishable.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. Compatible resume preserves saved initial data; universal historical cutoff/restatement/replay is future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
