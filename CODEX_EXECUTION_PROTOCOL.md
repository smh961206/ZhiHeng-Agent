# Codex Execution Protocol

## Default

Read `docs/releases/CURRENT`.

If CURRENT is `H0`, execute H0 only.

If CURRENT is a core version, read its `DETAILED_INDEX.md` and execute only the user-authorized subrelease or, if explicitly asked for the full release, execute subreleases in listed order.

## Never

- infer permission to execute a future release from the Master Roadmap;
- skip a subrelease because a later implementation would be easier;
- create parallel systems without migration ownership;
- weaken Evidence, Fact, Calculation, Point-in-Time or Validation rules to make tests pass.

## Before each subrelease

1. Read AGENTS.md.
2. Read CURRENT.
3. Read the subrelease file.
4. Read listed contracts/invariants/ADRs.
5. Inspect actual code listed under Current Code Inspection.
6. Correct stale file assumptions using actual repo state.
7. Run a relevant baseline test subset.
8. Implement.
9. Run old + new tests.
10. Run benchmark gate where specified.
11. Report.
12. Stop or continue only if authorized.
