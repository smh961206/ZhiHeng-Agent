# V5.4 Migration

New-write canonical + on-read normalization; avoid one-shot backfill. Existing evidence IDs remain resolvable.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
