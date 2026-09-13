# V5.2 rollback

Set FEATURE_FLAGSHIP_REVIEW=false and FEATURE_JUDGE=false and restart the service with the same storage. This closes new independent calls; retain current V5.2 readers and all private receipts. Ordinary V5.1 model choices, evidence requirements and final validation remain in force. The switches do not clear budgets, change model pins or erase conflicts.

Completed independent outcomes are reusable only with matching input/profile/connection and currently admitted authorization. Revoked admission cannot trigger a replacement model. Uncertain/reserved/rejected sessions pause at Agent entry and need operator reconciliation; do not mark them pending or delete them to force a replay. Unknown completion is not zero consumption.

Code rollback alone is safe only for jobs with no V5.2 state. Older code does not understand flagshipState and must not resume affected jobs. Preserve those records read-only until V5.2 recovery code returns; no database rollback or receipt deletion is required. Existing backup/restore remains the operational rollback owner.

Tests cover switches, unadmitted direct Gateway requests, saved outcome reuse, failed durable acknowledgements, actual Agent entry pause and MongoDB process restart. Full Linux deploy/backup/upgrade/rollback evidence is recorded in validation-results.json.
