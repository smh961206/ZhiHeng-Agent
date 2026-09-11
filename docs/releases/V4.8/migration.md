# V4.8 Migration

CURRENT V4.8.1: the internal Catalog factory generates Legacy Profiles from old env, preserving model defaults, router override and Vision configuration. Existing request paths continue reading their original env; no new configuration or data migration is needed. Catalog connection references reuse `modelRouting` and contain no credentials or URLs.

FUTURE V4.8.9: old checkpoint without modelState maps to legacy. No destructive backfill. V4.8.1 does not modify old checkpoints or persist profiles.

CURRENT V4.8.2: standalone Gateway resolves existing connection references privately and adds opt-in strict parser callbacks. No business import/call migration yet. V4.8.3/V4.8.4 must preserve review negotiation, router cache/fallback and Vision processing budgets when integrating; Gateway alone does not implement these business lifecycles. No database, environment or checkpoint migration is required.

## Migration rules

V4.8.5 is an isolated pure evaluator with no production imports. It neither extracts signals from jobs nor modifies Gateway/routing, research budgets, source validation or persistence. No code-path cutover, database/environment migration or model selection change is required. Future integration must classify reasoning failures separately from missing-data/provider/format failures and must not treat unknowns as known-zero workload.

V4.8.4 replaces path/intent/Vision and synthetic diagnostic transports with Gateway calls. Existing model/base/key fallback, cache TTL/key semantics, one-attempt Router/Vision behavior, image assembly and budgets remain. Catalog now owns the legacy image predicate with a compatibility re-export. Only omitted JSON role metadata is accepted by the scoped compatibility mode. Router reads gain bounded cleanup and redirect/strict-response rejection; no database, config, checkpoint or policy migration. See [V4.8.4 report](V4_8_4-completion-report.md).

V4.8.3 replaces Agent's direct transport with Gateway for research, forced draft, review/supplemental review and followup assessment. The existing completion wrapper remains for callers and recovery codes. One logical completion freezes its connection across review-format negotiation; this is not job pinning. Default analysis model/stream/thinking behavior, review repairs, private tool continuation and research cutoffs remain. No database, configuration or checkpoint migration is required. Missing credentials, unsafe URLs and malformed completions now fail locally/closed through Gateway. Router/Vision remain for V4.8.4.

- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.

## V4.8.6 accepted boundary

V4.8.6 enables optional shadow observation at the existing Gateway and supplies only mode/historyYears from Agent. MODEL_ROUTING_MODE defaults to legacy; dry-run logs recommendations with unchanged execution. No adapter/caller cutover, database, source, Knowledge, checkpoint or persisted configuration migration. Existing .env files work unchanged. Previous V4.8.5 no-integration statements describe that accepted baseline.

## V4.8.7

Existing migrateSchema applies the additive v2 ModelCall index idempotently under its existing lock. Old jobs/calls are not rewritten. Tests evolve the injected next migration from v2 to v3 while preserving failure/lock/downgrade/data assertions. Deployment test likewise upgrades 2→3 and rolls back to 2.

## V4.8.9 additive compatibility

Private job/checkpoint modelState v1 is additive in existing GridFS payloads; Mongo schema remains 2, no migration/index/backfill. Old absence reads as legacy with unknown historical identity; malformed presence or changed model/connection/effort/policy refuses recovery before reacquisition. Key rotation is compatible. Original cutoff/evidence remain untouched. Public lists/details strip modelState. New pinned jobs without usable progress require an explicit new job, not silent restart. Rollback must retain pin-compatible readers for existing pinned jobs; restoring original configuration allows resume, whereas an older reader ignoring pins is not safe for those jobs. See V4_8_9-completion-report.md for actual tests and limitations.

## V4.8.10 internal policy compatibility

Private modelState v2 is additive for explicit policy jobs: active profile/effort, bounded JSON-failure counters, up to three contiguous transition receipts. Existing v1/absence remain readable; Mongo schema remains 2 and no historical backfill occurs. No production policy jobs are created by .10. Rollback retains compatible state readers and pinned config; never downgrade a policy checkpoint's identity to legacy. A transition save with uncertain acknowledgement stops dispatch, preserving a consistent rebuilt boundary for recovery. Source lineage and cutoff do not change.

## V4.8.11 final boundary

No new Mongo schema/migration or historical backfill. The optional initial field in private modelState v2 records an approved initial policy selection; old v2 without it means MAIN/low and old v1/absence remain compatible. Strict readers check contiguous escalation history. The live acceptance report is local operator configuration, never a canonical research object, and is not supplied by this task.

Use pnpm start:legacy after stopping the prior server to override an inherited policy setting without rewriting .env or research payloads. New jobs use legacy; pinned policy jobs safely pause until matching policy/configuration is restored. Resume cannot silently replay private context through legacy. Default in both environment examples stays legacy; actual .env and dependency lock remain unchanged. Real quality comparison/production rollout is explicitly deferred.
