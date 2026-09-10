# V4.9 Implementation Plan

## Release goal
Make Vision a capability-routed Gateway workload; benchmark and optionally introduce primary/fallback models without changing Vision evidence trust rules.

## Sequence
## V4.9.0 — Vision request normalization

### Objective
All Vision model requests use Model Gateway with imageInput capability.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V4.9.1 — Vision fixture harness

### Objective
Create frozen financial-table/screenshot/scanned-PDF benchmark.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V4.9.2 — Vision challenger

### Objective
Add second image-capable profile offline.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V4.9.3 — Primary/fallback policy

### Objective
Provider/capability failure fallback; unreadable input is not repeated blindly.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V4.9.4 — Rollout

### Objective
Switch primary only if benchmark passes; preserve old profile as fallback.

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
