# Learning Is Offline and Governed

Status: ACCEPTED

## Decision

Telemetry/failures may propose model/Knowledge/policy changes. Production does not self-modify those policies without benchmark and human approval.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: PARTIAL. No online self-modifying learning path was found; complete offline learning/governance pipeline is future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).
