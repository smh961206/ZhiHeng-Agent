# V5.0 Acceptance Contract

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
