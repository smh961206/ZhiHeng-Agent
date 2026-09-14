# Knowledge Invariants

- INV-KNW-001 [ENFORCED principle]: Knowledge describes how to research, not current company opinions.
- INV-KNW-002 [ENFORCED]: every production Knowledge release is pinned/versioned.
- INV-KNW-003 [ENFORCED]: material Knowledge changes require root-cause justification and regression tests.
- INV-KNW-004 [TARGET]: hard deterministic rules should migrate to runtime validators/engines where practical.
- INV-KNW-005 [TARGET]: Knowledge cannot self-modify in production without offline tests and human approval.
- INV-KNW-006 [ENFORCED]: active Knowledge uses only K-Series identity; one published K version has one immutable snapshot fingerprint.
- INV-KNW-007 [ENFORCED]: a task without a valid K-Series pin cannot resume old execution state and must restart on the active K release.

## Current enforcement and limits

Current evidence: `knowledge/current.json` selects one verified K-Series snapshot; the loader rejects non-K versions and new jobs bind the K version/fingerprint. Same-version byte changes are rejected after activation. Knowledge reads check saved receipt/hash identity. Schema-v3 governance assigns Rule IDs, regression ownership, temporal scope and impact. The linter blocks invalid K snapshots and KCP validation rejects non-Knowledge root causes.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
