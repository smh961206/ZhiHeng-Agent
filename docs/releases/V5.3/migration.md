# V5.3 Migration

Wrap/index current Knowledge; no one-shot rewrite. Preserve old snapshots and exact historical hashes.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
