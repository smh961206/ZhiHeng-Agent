# Harness V3 — Fully Normalized Release Plan

V3 resolves the remaining granularity mismatch between early and late releases.

## What changed

- H0 through V6.0 now use the same subrelease execution model.
- V4.9–V5.2 were expanded to implementation-level granularity.
- Every `Vx.x.y` subrelease now uses the same **26-section engineering contract**.
- V5.3–V6.0 are no longer only major-version capability lists; every subrelease has an executable file.
- Each subrelease explicitly states:
  1. Why
  2. Preconditions
  3. Current Code Inspection
  4. Current Behavior
  5. Target Behavior
  6. In Scope
  7. Out of Scope
  8. Deliverables
  9. Suggested Code Ownership
  10. Contract Changes
  11. Invariant Changes
  12. ADR Dependencies
  13. Schema
  14. API
  15. Migration
  16. Resume / Recovery
  17. Point-in-Time
  18. Provenance
  19. Feature Flag
  20. Tests
  21. Acceptance Cases
  22. Benchmark Gate
  23. Rollout
  24. Rollback
  25. Stop Condition
  26. Deferred Work

The package still starts with `docs/releases/CURRENT = H0`.
