# Hybrid Retrieval, not Vector-only RAG

Status: ACCEPTED

## Decision

Use structured/exact retrieval, BM25, semantic retrieval and page/table retrieval together. Vector similarity is never the sole truth source for financial facts.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.
