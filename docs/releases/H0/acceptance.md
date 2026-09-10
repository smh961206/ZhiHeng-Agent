# H0 Acceptance Contract

A release is not complete because code compiles. These behaviors must hold.

### H0-001

AGENTS and navigation exist and point to CURRENT, contracts, invariants and ADRs.

### H0-002

Current implementation map reflects real checkout, not roadmap assumptions.

### H0-003

Future capabilities are explicitly marked FUTURE and are not implemented.

### H0-004

Full existing tests pass.

### H0-005

Runtime behavior change = 0.

### H0-006

On acceptance, next allowed CURRENT is V4.8.


## Global gates
- Existing relevant tests pass.
- New release tests pass.
- No P0 evidence/fact/point-in-time/calculation regression.
- Resume/recovery behavior remains valid.
- Rollback path is documented and testable.
