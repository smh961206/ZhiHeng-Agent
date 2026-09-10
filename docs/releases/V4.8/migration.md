# V4.8 Migration

Old env auto-generates Legacy Profile. Old checkpoint without modelState maps to legacy. No destructive backfill.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
