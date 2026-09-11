# V5.0 Implementation Plan

This older five-part grouping is retained as design history. The executable sequence is the fourteen entries in [DETAILED_INDEX.md](DETAILED_INDEX.md). Current implementation and remaining acceptance are recorded in [completion-report.md](completion-report.md).

## Release goal
Make model selection evidence-based using ZhiHeng-specific benchmarks and task champions.

## Sequence
## V5.0.0 — Benchmark platform

### Objective
Canonical case/fixture/grader/runner structure.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.0.1 — Main challenger offline

### Objective
Evaluate second Main candidate without production traffic.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.0.2 — Task champion computation

### Objective
Champion by task class with quality gate.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.0.3 — A/B framework

### Objective
Job-pinned experiment group; disabled by default.

### Required implementation discipline
- Inspect current equivalent modules before creating new files.
- Prefer additive/compatible changes.
- Add/adjust tests at this step.
- Keep the repository runnable before moving to the next subrelease.
- Do not implement later subrelease behavior early unless it is a pure compatible prerequisite.

### Stop condition
This subrelease is complete only when its tests pass and no owning invariant is weakened.
## V5.0.4 — Champion rollout

### Objective
Production routing only after statistical/quality acceptance.

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
