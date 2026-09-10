# V6.0 Migration

Add workspace boundaries additively. Default existing data to explicit single-user/default workspace only with reviewed migration. Backups and rollback mandatory.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
