# V5.2 Acceptance Contract

A release is not complete because code compiles. These behaviors must hold.

### JDG-001

Judge cannot create an unrelated third factual record.

### JDG-002

Data missing cannot trigger Judge.

### JDG-003

Judge output is accept_l1/accept_l2/insufficient_to_decide.

### JDG-004

Normal research does not routinely fan out to multiple flagships.


## Global gates
- Existing relevant tests pass.
- New release tests pass.
- No P0 evidence/fact/point-in-time/calculation regression.
- Resume/recovery behavior remains valid.
- Rollback path is documented and testable.
