# V5.1 Acceptance Contract

Behavioral evidence: model-pricing/model-usage/model-cost suites cover COST-001; model-cost-policy and the frozen cost benchmark cover COST-002; model-cache covers COST-003; research-budget (including actual Agent checkpoint continuation), existing research-resume/review tests and model-cost.integration cover BUD-001/BUD-002, persistence and safe projection. Operational limitations and disabled rollout are explicit in [runbook](runbook.md); final suite counts belong in the completion report.

A release is not complete because code compiles. These behaviors must hold.

### COST-001

Unknown price is not fabricated.

### COST-002

Cheap low-quality model cannot become champion.

### COST-003

Cache routing relies on observed samples/ratio, not theoretical assumptions.

### BUD-001

Budget pressure does not silently skip critical validation.

### BUD-002

Stopped research discloses unresolved gaps.


## Global gates
- Existing relevant tests pass.
- New release tests pass.
- No P0 evidence/fact/point-in-time/calculation regression.
- Resume/recovery behavior remains valid.
- Rollback path is documented and testable.
