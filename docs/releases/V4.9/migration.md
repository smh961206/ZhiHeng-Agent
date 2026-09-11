# V4.9 Migration

Review fixes require no Mongo migration. New comparison progress is additive local JSON; do not rewrite old reports into resumable ledgers or infer unknown calls. Old approvals bind older code and remain invalid after deployment until new measured evidence is reviewed. Keep every historical artifact and candidate pin; rollback pauses incompatible candidate jobs rather than changing their identity.

No data migration. Existing visual archive remains valid.

V4.9.0 changes only release documentation, the existing development inventory checker, and its regression tests. No backfill, database migration, asset rewrite or checkpoint conversion is performed.

V4.9.1–.8 likewise require no database migration or historical backfill. Deploy compatible readers first; keep FEATURE_VISION_ROUTING=false until measured comparison and review match the deployed configuration/code. Only new admitted jobs write candidate IDs in the existing private modelState structure. Existing legacy pins remain legacy even after activation, and absent historical state remains historical legacy behavior. Candidate jobs require matching admission to resume; disabling admission pauses them without replacing their evidence or cutoff. Key rotation remains compatible.

Compatibility tests cover both old and new values; tests/vision-state.integration.mjs verifies durable Mongo checkpoint, actual process exit, rollback pause, key rotation and resume without duplicate completed tools. Provenance remains source/page/image hashes and actual profile; no profile or usage is invented for old archives. Reverting to an older binary that cannot read candidate pins must preserve the jobs rather than deleting or rewriting them.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
