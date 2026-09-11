# V4.9 Implementation Plan

Execution authority is [DETAILED_INDEX.md](DETAILED_INDEX.md). The five groupings below are historical overview headings, not executable subrelease numbers. Normalized V4.9.0–V4.9.8 implementation and offline validation are recorded in the [completion report](V4_9-completion-report.md). Batch-nine real quality is now [operator-approved](vision-operator-approval-20260911.md); production activation remains pending and still requires matching code/configuration. V4.9.0 owns the [Vision inventory](vision-call-inventory.md), and canonical requests start at normalized V4.9.1. V4.8.4 already migrated Vision transport into Gateway; that work is not repeated or claimed as new V4.9 implementation.

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
