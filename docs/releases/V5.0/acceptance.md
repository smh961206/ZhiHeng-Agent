# V5.0 Acceptance Contract

2026-09-11 状态：用户明确暂停本轮真实验收，等待明确恢复。已通过的工程验证保留；真实质量、人工验收和生产晋升仍未通过。本次暂停不豁免下列验收门槛。

Current status: PARTIAL. Local engineering acceptance covers BEN-001–004 with deterministic/mock tests and real database restart tests. Live candidate quality and promotion have not been accepted; no active production champion was created. See [completion report](completion-report.md), [execution log](execution-log.md) and [operations runbook](runbook.md).

A release is not complete because code compiles. These behaviors must hold.

### BEN-001

Same frozen fixture produces comparable candidate/baseline evaluation.

### BEN-002

Quality gate runs before cost comparison.

### BEN-003

A/B group is pinned per job, not per model turn.

### BEN-004

No hidden production shadow double-call by default.


## Global gates
- Existing relevant tests pass.
- New release tests pass.
- No P0 evidence/fact/point-in-time/calculation regression.
- Resume/recovery behavior remains valid.
- Rollback path is documented and testable.
