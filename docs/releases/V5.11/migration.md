# V5.11 Migration

Historical records may be partially replayable; never invent unavailable old snapshots. Mark coverage explicitly.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
