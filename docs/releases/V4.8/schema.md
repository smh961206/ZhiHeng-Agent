# V4.8 Schema

CURRENT V4.8.1: ModelProfile configuration schema v1 is validated in `server/model-catalog.mjs`; see [contract](../../contracts/model-gateway.contract.md). Catalog profiles are not persisted research objects. No database/schema version, checkpoint or public API change.

V4.8.7 implements persistent ModelCall records below. Full persistent RoutingDecision and checkpoint modelState remain FUTURE. Existing research/evidence/calculation schemas remain unchanged.

CURRENT V4.8.2: in-memory complete() request/result/error contract, including nullable usage/performance/billing and explicit private continuation access. No persistence, ModelCall record, checkpoint field or schema version change. See [Gateway contract](../../contracts/model-gateway.contract.md).

## General rules

V4.8.5 adds only a version-1 in-memory complexity result and structured signal contract. Version refers to heuristic rules, not research/database schema. No caller integration, persistence, public API, checkpoint or migration. Unknown signal values remain null and failure categories stay distinct.

V4.8.4 adds no persistent schema, public API or checkpoint fields. Its factory-only legacy-router-vision compatibility accepts omitted JSON role metadata while retaining strict completion. No ModelCall/modelState, migration or framework/Knowledge version change.

V4.8.3 adds no persistent schema or checkpoint/modelState field. Safe in-memory lifecycle callbacks and factory-only legacy-text compatibility extend the Gateway API; public HTTP/research payload contracts remain unchanged. Six-mode golden checkpoint comparisons and actual MongoDB process-resume tests verify compatibility with existing records.

- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.

## V4.8.6 accepted boundary

V4.8.6 adds an internal/log RoutingDecision schemaVersion 1 and policyVersion 1; candidate slot/effort is separate from actual legacy executionProfile/effort. Gateway output, external API, database, checkpoint, framework 4.7 and research contract 7 stay unchanged. Unknown signals and omitted execution effort remain null. No persistent migration/backfill.

## V4.8.7

Mongo schema version 2 appends model_call_indexes for model_calls(jobId, startedAt); _id is the stable per-call UUID. ModelCall v1 and on-demand internal job summaries are documented in the Gateway contract. No job/checkpoint/public schema change, no historical backfill. Existing v1 migration remains byte-for-byte unchanged.

## V4.8.9 additive compatibility

Private job/checkpoint modelState v1 is additive in existing GridFS payloads; Mongo schema remains 2, no migration/index/backfill. Old absence reads as legacy with unknown historical identity; malformed presence or changed model/connection/effort/policy refuses recovery before reacquisition. Key rotation is compatible. Original cutoff/evidence remain untouched. Public lists/details strip modelState. New pinned jobs without usable progress require an explicit new job, not silent restart. Rollback must retain pin-compatible readers for existing pinned jobs; restoring original configuration allows resume, whereas an older reader ignoring pins is not safe for those jobs. See V4_8_9-completion-report.md for actual tests and limitations.

## V4.8.10 internal policy compatibility

Private modelState v2 is additive for explicit policy jobs: active profile/effort, bounded JSON-failure counters, up to three contiguous transition receipts. Existing v1/absence remain readable; Mongo schema remains 2 and no historical backfill occurs. No production policy jobs are created by .10. Rollback retains compatible state readers and pinned config; never downgrade a policy checkpoint's identity to legacy. A transition save with uncertain acknowledgement stops dispatch, preserving a consistent rebuilt boundary for recovery. Source lineage and cutoff do not change.

## V4.8.11 final boundary

No new Mongo schema/migration or historical backfill. The optional initial field in private modelState v2 records an approved initial policy selection; old v2 without it means MAIN/low and old v1/absence remain compatible. Strict readers check contiguous escalation history. The live acceptance report is local operator configuration, never a canonical research object, and is not supplied by this task.

Use pnpm start:legacy after stopping the prior server to override an inherited policy setting without rewriting .env or research payloads. New jobs use legacy; pinned policy jobs safely pause until matching policy/configuration is restored. Resume cannot silently replay private context through legacy. Default in both environment examples stays legacy; actual .env and dependency lock remain unchanged. Real quality comparison/production rollout is explicitly deferred.
