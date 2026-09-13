# V5.1 Migration

No destructive migration; missing historical cost stays unknown.

V5.1 uses existing Mongo model_calls and private job payloads. No collection/index version change, database downgrade or backfill is required. Old ModelCall objects retain their original normalized shape when the additive fields are absent, so frozen V5.0 benchmark result hashes remain valid. New telemetry adds usageDetails, cost, cache and transportAttempts; old readers may ignore them. Budget state is absent for old jobs, never manufactured from event counts.

Read compatibility precedes new writes: both legacy and dated Catalog prices are accepted; historical cost snapshots are read without a current-price lookup. Repeated benchmark case-local call IDs are scoped by unit only during aggregation; original result receipts are not rewritten. No effective date, provider count, original data cutoff or source lineage is invented. Existing job/deletion/retention owners remain authoritative.

New budgetState lives only in the private payload. It pins limits/mode/start and durable resource receipts; public detail/list/SSE projections omit the ledger and expose a separate whitelist summary through the cost endpoint. Budgeted jobs with invalid state or unusable checkpoints cannot fall back to reacquisition.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
