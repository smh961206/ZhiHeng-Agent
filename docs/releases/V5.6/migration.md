# V5.6 Migration

Wrap current tool results additively; do not recalculate/replace historical values unless explicitly migrated/versioned.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
