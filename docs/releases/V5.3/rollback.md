# V5.3 Rollback

Execution compatibility follow-up: before rolling back the field rename, drain or pause new-format jobs and retain a compatible worker for their continuation. Earlier code cannot interpret their checkpoint scope safely. Do not rewrite counters or remove model/K pins to force a resume; use a compatible forward fix for active work. No database or historical archive rewrite is needed. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

Use an explicitly published K-Series rollback or forward-fix release; never rewrite a snapshot.

Operational rollback explicitly activates a retained, previously validated K-Series version with the rollback control. K1.0.0 is currently the only retained choice. Jobs pinned to K1.0.0 may finish on their exact snapshot or remain paused; they are never moved to another K version. No database rollback, record deletion, hash rewrite or historical backfill is required.

Validated by the V5.3 tests: catalogs without K-Series governance are rejected; non-K snapshot references are rejected; changed K/snapshot identity invalidates resume rather than silently switching.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.

For the optional model-support synchronization, first set `RESEARCH_BUDGET_MODE=disabled` and remove `criticalReviewer`/`judge` assignments for new work. Jobs with completed additive state remain readable; jobs with reserved or uncertain resource/review sessions must stay paused and be handled by a compatible forward fix. Never delete receipts, clear hashes or rewrite the research cutoff to force recovery. Code rollback requires draining such active jobs; no database rewrite is required.

For Prompt governance rollback, drain active writer/auditor streams before changing code. Older code ignores additive `promptContext`, context-receipt v2 fields and vision block digests. No data migration or deletion is needed. A job stopped after the new calculation-evidence gate should be resumed with compatible code or restarted from its original input and cutoff; never mark an incomplete v1 receipt complete or remove evidence references to force continuation.
