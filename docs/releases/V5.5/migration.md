# V5.5 Migration

Additive objects; resolve/backfill incrementally. No ticker-as-PK destructive replacement. No overwrite of historic reported data.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
