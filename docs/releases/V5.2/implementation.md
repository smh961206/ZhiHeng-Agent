# V5.2 Implementation Plan

## Release goal
Use flagship models only for exceptional complexity, critical review or adjudication.

## Sequence
## V5.2.0 — Flagship profile pool

### Objective
Flagship tier exists but is not default Main.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.2.1 — Critical reviewer

### Objective
Escalate repeated semantic/review failure.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.2.2 — Judge contract

### Objective
Judge sees evidence/tool results and completed conclusions only.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.2.3 — Conflict gate

### Objective
Judge only on material L1/L2 conflict with sufficient evidence.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.2.4 — Cost/quality monitoring

### Objective
Verify rare-use target and real value.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.


## Cross-cutting requirements
- Preserve resume/recovery.
- Preserve evidence safety.
- Preserve point-in-time behavior.
- Preserve existing financial formulas unless this release explicitly owns a formula version change.
- Every persistent schema change requires migration and rollback documentation.
