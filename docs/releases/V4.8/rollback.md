# V4.8 Rollback

## Current V4.8.0 inventory boundary

V4.8.0 adds only inventory documentation and static tests. Revert that subrelease's files/manifest changes to roll it back; there is no runtime or database rollback. MODEL_ROUTING_MODE and Legacy Profiles are not implemented at this point. The release-level switch below is a future rollout requirement, not a current operational command.

## Current V4.8.1 Catalog boundary

Revert the V4.8.1 Catalog/test additions, documentation/manifest updates and the equivalent Vision predicate extraction. Existing model request owners and environment settings remain usable throughout. No research record, schema, checkpoint or database rollback is needed. MODEL_ROUTING_MODE is still FUTURE and is not a usable rollback switch for this subrelease.

## Current V4.8.2 Gateway boundary

Revert its three Gateway/adapter/result modules, new Gateway test file, opt-in model-stream changes, explicit inventory extension/tests and documentation/manifest changes to the V4.8.1 commit. No business caller was migrated and old parser defaults remain usable. No data/schema/environment rollback or routing-mode switch is required. Preserve prior V4.8.1 work and all research records.

## V4.8.3 text migration rollback

Restore only the V4.8.3 changes to the accepted V4.8.2 worktree snapshot: Agent transport/wrapper, Gateway callback/compatibility additions, error translation, parser option, migration tests/fixtures, static checks and associated documents/manifest. V4.8.2 is still uncommitted in this workspace, so resetting to HEAD would incorrectly discard accepted V4.8.2 work. The ignored `artifacts/v4-8-3-rollback/` and `artifacts/v4-8-3-baseline.json` preserve the actual start snapshot. Do not reset the whole repository.

No modelState, persisted usage, database schema, new config or feature flag is added. Existing checkpoints remain readable by the prior owner, as covered by golden checkpoint comparison and real-process resume. No research/evidence deletion or data rollback is needed. MODEL_ROUTING_MODE is still a future policy control, not this migration's rollback mechanism.

## V4.8.4 remaining-call migration rollback

Restore only V4.8.4's changed files from `artifacts/v4-8-4-rollback/`, using `artifacts/v4-8-4-baseline.json` as the hash reference, and remove only the four additions listed in its completion report. The actual accepted V4.8.3 worktree includes uncommitted V4.8.2/V4.8.3 work; HEAD is not this baseline. Saved old path/intent/Vision implementations produced the independent golden fixture. No database/schema/config or research-data rollback is required. Preserve all historical records and previous reviews. No MODEL_ROUTING_MODE exists for this migration.

## Target policy rollback — FUTURE

Set MODEL_ROUTING_MODE=legacy; retain legacy profiles/config and compatible checkpoint reads.

## Rollback requirements

V4.8.5 rollback: remove only the four added evaluator/test/fixture/report files listed in its completion report and restore its changed Harness documents/manifest from `artifacts/v4-8-5-rollback/`, checked against `artifacts/v4-8-5-baseline.json`. This preserves the accepted but uncommitted V4.8.2–V4.8.4 work. No production import, persistent data or config changed, so no runtime/data rollback or routing switch is needed.
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.

## V4.8.6 accepted boundary

V4.8.6: set MODEL_ROUTING_MODE=legacy (or remove it) to stop observations; actual requests already use legacy. For code rollback, restore only this subrelease delta from artifacts/v4-8-6-rollback/ against artifacts/v4-8-6-baseline.json and remove only its three additions listed in the report. Preserve all earlier uncommitted accepted work; do not reset to HEAD. No database/checkpoint/data rollback or deletion is required. Unknown policy flag values also remain legacy.

## V4.8.7

Set MODEL_TELEMETRY_ENABLED=false and restart to disable writes, leaving model_calls and schema v2 intact. For code restoration use artifacts/v4-8-7-rollback/ with its baseline, but retain the additive v2 migration definition in the rollback build; older binaries deliberately reject newer schema versions. Never delete schema history or research data to bypass that guard. No data rollback is needed for this additive collection.

## V4.8.9 additive compatibility

Private job/checkpoint modelState v1 is additive in existing GridFS payloads; Mongo schema remains 2, no migration/index/backfill. Old absence reads as legacy with unknown historical identity; malformed presence or changed model/connection/effort/policy refuses recovery before reacquisition. Key rotation is compatible. Original cutoff/evidence remain untouched. Public lists/details strip modelState. New pinned jobs without usable progress require an explicit new job, not silent restart. Rollback must retain pin-compatible readers for existing pinned jobs; restoring original configuration allows resume, whereas an older reader ignoring pins is not safe for those jobs. See V4_8_9-completion-report.md for actual tests and limitations.

## V4.8.10 internal policy compatibility

Private modelState v2 is additive for explicit policy jobs: active profile/effort, bounded JSON-failure counters, up to three contiguous transition receipts. Existing v1/absence remain readable; Mongo schema remains 2 and no historical backfill occurs. No production policy jobs are created by .10. Rollback retains compatible state readers and pinned config; never downgrade a policy checkpoint's identity to legacy. A transition save with uncertain acknowledgement stops dispatch, preserving a consistent rebuilt boundary for recovery. Source lineage and cutoff do not change.

## V4.8.11 final boundary

No new Mongo schema/migration or historical backfill. The optional initial field in private modelState v2 records an approved initial policy selection; old v2 without it means MAIN/low and old v1/absence remain compatible. Strict readers check contiguous escalation history. The live acceptance report is local operator configuration, never a canonical research object, and is not supplied by this task.

Use pnpm start:legacy after stopping the prior server to override an inherited policy setting without rewriting .env or research payloads. New jobs use legacy; pinned policy jobs safely pause until matching policy/configuration is restored. Resume cannot silently replay private context through legacy. Default in both environment examples stays legacy; actual .env and dependency lock remain unchanged. Real quality comparison/production rollout is explicitly deferred.
