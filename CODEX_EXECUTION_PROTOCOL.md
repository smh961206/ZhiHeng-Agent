# Codex Execution Protocol

## Default

CURRENT selects authorized work, not implemented capability status. A newly activated release remains unimplemented until its own acceptance evidence exists. DETAILED_INDEX and linked normalized subreleases determine execution order; historical overview groupings do not override them.

Validation defaults to tests directly related to the files and behavior changed in the current task. Do not automatically run full UI regression, release gates, full benchmark suites, complete Docker deployment/rollback validation, or real-model acceptance. Run any of those only when the user explicitly requests it.

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
9. Run the directly relevant old + new tests.
10. Run a benchmark gate only when the user explicitly requests it.
11. Report.
12. Stop or continue only if authorized.
