# Normalized Subrelease Standard

Every Codex-executable subrelease must contain these 26 sections in this order:

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

## Granularity rule

One subrelease should be small enough for Codex to:
- inspect;
- implement;
- migrate;
- test;
- benchmark when applicable;
- roll back;
- stop.

A subrelease must not silently absorb a later subrelease because it is “convenient”.

## Naming rule

Core release:
`V5.5`

Executable subrelease:
`V5.5.6`

The user may ask Codex to execute either:
- one subrelease only; or
- an entire core release sequentially.

When executing an entire core release, Codex must still finish/tests/report each subrelease before proceeding.
