# V5.3 Migration

Cut active Knowledge control from framework/V4.7 identity to K1.0.0 while preserving old snapshots and exact historical hashes.

Migration is explicit and idempotent: run `npm run knowledge:seed-governance`, `npm run knowledge:lint`, `npm run benchmark:knowledge`, the release gate, `npm run knowledge:backup`, then `npm run knowledge:activate`. The seed maps 26 existing high-impact sections without rewriting their Markdown. The active snapshot is stored under `auto/K1.0.0/<snapshot-id>/`; `current.json` selects it. Existing V4.x archives remain byte-for-byte unchanged. No historical job is backfilled or relabelled.

Compatibility: new code reads schema-v3 K-Series snapshots only. Completed V4.x reports remain viewable, but old unfinished tasks and V4.x rule excerpts are not executed by the active runtime. Retrying an unfinished old task creates a fresh K1.0.0 plan and discards old execution progress while preserving the historical record.

## Migration rules

Execution field migration is dual-read/new-write with no backfill. New jobs pin execution compatibility 1 and contract 7. Compatible K-pinned pre-rename plans keep their old version and exact checkpoint scope, messages and result/event metadata. Knowledge validation is mandatory before either execution format can resume. M1.x becomes an engineering milestone description only; model configuration and state are unchanged. See [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md).

- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
