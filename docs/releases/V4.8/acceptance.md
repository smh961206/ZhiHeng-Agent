# V4.8 Acceptance Contract

A release is not complete because code compiles. These behaviors must hold.

### MG-001

Old LLM_* env starts and behaves as legacy.

### MG-002

Business modules no longer call provider endpoints directly after migration.

### MG-003

Business code does not infer image/tool/structured capability from concrete model names.

### MG-004

Mode A policy candidate resolves Main/Low.

### MG-005

Missing official report/data does not escalate to Pro.

### MG-006

Provider 503/429/timeout prefers same-tier fallback/health handling.

### MG-007

Repeated tool-argument/structured-output/validation model failure may escalate safely.

### MG-008

No switch while assistant tool_calls are pending.

### MG-009

reasoning_content is never public/persisted in public execution history.

### MG-010

Old/new resume paths preserve evidence and market cutoff.


## Global gates
- Existing relevant tests pass.
- New release tests pass.
- No P0 evidence/fact/point-in-time/calculation regression.
- Resume/recovery behavior remains valid.
- Rollback path is documented and testable.
