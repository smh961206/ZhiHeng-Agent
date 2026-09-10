# V4.8 Migration

CURRENT V4.8.1: the internal Catalog factory generates Legacy Profiles from old env, preserving model defaults, router override and Vision configuration. Existing request paths continue reading their original env; no new configuration or data migration is needed. Catalog connection references reuse `modelRouting` and contain no credentials or URLs.

FUTURE V4.8.9: old checkpoint without modelState maps to legacy. No destructive backfill. V4.8.1 does not modify old checkpoints or persist profiles.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
