# V5.3 Rollback

Execution compatibility follow-up: before rolling back the field rename, drain or pause new-format jobs and retain a compatible worker for their continuation. Earlier code cannot interpret their checkpoint scope safely. Do not rewrite counters or remove model/K pins to force a resume; use a compatible forward fix for active work. No database or historical archive rewrite is needed. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

Use an explicitly published K-Series rollback or forward-fix release; never rewrite a snapshot.

Operational rollback keeps all archives and explicitly activates a previously validated K-Series version with the rollback control. V4.x cannot be selected by the current runtime. Jobs pinned to K1.0.0 may finish on their exact snapshot or remain paused; they are never moved to another K version. No database rollback, record deletion, hash rewrite or historical backfill is required.

Validated by the V5.3 tests: catalogs without K-Series governance are rejected; V4.x snapshot references are rejected; changed K/snapshot identity invalidates resume rather than silently switching.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
