# Knowledge Invariants

- INV-KNW-001 [ENFORCED principle]: Knowledge describes how to research, not current company opinions.
- INV-KNW-002 [ENFORCED for current job snapshots; TARGET V5.3 for full release governance]: every production Knowledge release is pinned/versioned.
- INV-KNW-003 [TARGET V5.3]: material Knowledge changes require root-cause justification and regression tests.
- INV-KNW-004 [TARGET]: hard deterministic rules should migrate to runtime validators/engines where practical.
- INV-KNW-005 [TARGET]: Knowledge cannot self-modify in production without offline tests and human approval.

## H0 enforcement evidence and limits

Current evidence: knowledge-snapshots/knowledge pin complete validated snapshots per job; knowledge-excerpt checks saved receipt/hash identity. Tests: knowledge-snapshots, knowledge-backup, research-knowledge, knowledge-api integration. Existing snapshot pinning satisfies the current job-scoped part of KNW-002; full K-Series release governance is still V5.3. Existing offline maintenance tools are not an autonomous learning pipeline.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
