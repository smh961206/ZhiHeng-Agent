# Deterministic Financial Math

Status: ACCEPTED

## Decision

ROIC/FCF/DCF/TSR and other deterministic arithmetic should be programmatic and versioned. LLMs choose assumptions and interpret results.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## Current implementation assessment

Implementation Status: PARTIAL. Financial math is programmatic; centralized formula version/lineage registry is future.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See the [current implementation map](../architecture/current-implementation-map.md).
