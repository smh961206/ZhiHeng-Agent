# V5.3 Migration

Establish K1.0.0 as the first retained Knowledge release and the only active snapshot identity.

The active snapshot is stored under `auto/K1.0.0/<snapshot-id>/`; `current.json` selects it. Publication uses the current Python lint, backup and activation commands. No saved research job is backfilled or relabelled. Pre-K release files were removed later by explicit user authorization and are available only through Git history.

Compatibility: current code reads schema-v3 K-Series snapshots only. Tasks without a valid retained K snapshot cannot resume their old execution state; a new research task starts on the active K1.0.0 snapshot without rewriting the saved record.

## Migration rules

Execution field migration is dual-read/new-write with no backfill. New jobs pin execution compatibility 1 and contract 7. Compatible K-pinned pre-rename plans keep their old version and exact checkpoint scope, messages and result/event metadata. Knowledge validation is mandatory before either execution format can resume. M1.x becomes an engineering milestone description only; model configuration and state are unchanged. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.

## Python model-support synchronization

The synchronization is additive. Existing jobs without `budgetState` or `flagshipState` retain disabled behavior. New budget state is created only when `RESEARCH_BUDGET_MODE` is `dry-run` or `enforce`. Optional Critical Reviewer and Judge execute only when their schema-v2 pipeline stages have assignments and deterministic admission succeeds. No historical record is backfilled, no saved conclusion is replaced, and no legacy Champion/Challenger, A/B, drift, complexity-routing or escalation subsystem is restored.

## Prompt and context governance

The migration is additive/new-write. All current Python model call sites now compile a registered Prompt plan and send body-free metadata to Model Gateway. New jobs pin `promptState`; historical jobs do not receive a synthetic pin. Historical model calls without `promptContext`, context receipts at version 1 and vision blocks without image digests remain valid and are not backfilled. Resume continues from saved checkpoints; it does not replay completed researcher/writer/independent stages to manufacture new metadata.
