# V4.8.7 Model Usage Telemetry — Completion Report

Acceptance update, 2026-09-10: V4.8.7 is accepted with both review fixes. The previously blocked Linux deployment script now passes all nine check groups with exit 0, and the current full unit suite passes 648/648. See [deployment acceptance](V4_8_7-deployment-acceptance.md) for current evidence, cleanup and file audit. The sections below retain the original pre-deployment implementation snapshot and its then-pending gate; the two linked reviews and deployment addendum supersede that historical status. CURRENT remains V4.8; V4.8.8/.9 have not been implemented.

## 1. Release and acceptance

Implemented V4.8.7 only so far. CURRENT=V4.8. User authorized V4.8.7→V4.8.8→V4.8.9 sequentially; .8/.9 have not started because .7 acceptance is still pending the Linux deployment gate. Baseline is the accepted 1,399-file worktree after both V4.8.4–.6 reviews, saved in artifacts/v4-8-7-baseline.json and artifacts/v4-8-7-rollback/. Preserve earlier uncommitted work.

## 2. Modified files

server/model-gateway.mjs; server/storage.mjs; server/schema-migrations.mjs; server/index.mjs; .env.example; .env.production.example; tests/schema.integration.mjs; tests/deploy.integration.sh; docs/architecture/current-implementation-map.md; docs/architecture/00-system-map.md; docs/contracts/model-gateway.contract.md; docs/invariants/model.invariants.md; docs/releases/V4.8/DETAILED_INDEX.md; docs/releases/V4.8/schema.md; docs/releases/V4.8/migration.md; docs/releases/V4.8/rollback.md; docs/releases/V4.8/subreleases/V4_8_7-model-usage-telemetry.md; MANIFEST.json.

## 3. New files

server/model-telemetry.mjs; tests/model-telemetry.test.mjs; tests/model-telemetry.integration.mjs; this report. Ignored artifacts/v4-8-7-* snapshots/helpers/logs are local acceptance assets.

## 4. Removed files

None. No original assertions, goldens, historical reports or Knowledge content deleted.

## 5. Architecture

Gateway emits started/terminal ModelCall metadata through the single new telemetry owner. Existing index configures the existing storage writer and uses AsyncLocalStorage only for job correlation; nested calls inherit job ID without new business transports. Mongo model_calls is independent of canonical research and public events. On-demand storage.modelUsageSummary avoids duplicated persisted totals or new API routes. No model selection/cost/health change.

Inspected active specs/maps, contracts and model/research/Evidence invariants, ADR-002/012/014, Gateway/Catalog/adapter/stream, Agent/execution/path/Vision/followup, storage/migrations/checkpoints/retry and tests. There is no storage.contract.md or storage.invariants.md in this repository; storage truth is current code, schema/migration docs and accepted additive-migration ADR. Original ADR decisions and enforced investment rules are unchanged.

## 6. Schema

Append Mongo migration 2 model_call_indexes: index model_calls(jobId,startedAt), with _id call uniqueness. ModelCall schemaVersion 1 includes safe profile/purpose/status, nullable job attribution, mode/policy version, timestamps, safe error category/status, nullable normalized usage, per-field provider/unknown source, timing and nullable estimated billing. No prompt/output/reasoning/URL/credential. No public job, checkpoint, framework 4.7 or contract 7 change.

## 7. Migration

Idempotent additive index under existing migration lock. Historical calls remain absent/unknown; no backfill or research rewrite. Schema/deploy tests now inject version 3 after real version 2, retaining all lock/failure/data/backup/downgrade assertions. Started writes are insert-only; same-ID terminal writes are idempotent and cannot be overwritten by a late start. Job deletion removes telemetry and tombstones prevent late resurrection.

## 8. Environment and blocking approval

Windows PowerShell / Node 24.19.0 / pnpm 11.19.0. No dependency/lock/actual .env change. Disposable mongo:8.0 container zhiheng-v4879-test-mongo on loopback 27029, random test DB names, no real research DB. It is retained temporarily for the authorized subsequent stages.

Automatic approval rejected the attempted Linux runner Docker socket mount, citing near-host Docker management rights and no recognized explicit current authorization. The runner was not launched and the rejection was not bypassed. A concise approval request is pending. The exact prepared runner is artifacts/v4-8-7-deploy-runner.sh, with read-only repository input and disposable independent Compose project/data. Deployment acceptance remains unverified until an approved actual run succeeds.

## 9. Compatibility and runtime behavior

Actual profile/model/effort, request body, research output and golden checkpoint behavior remain legacy. Telemetry is a runtime addition, so Runtime behavior change is not zero. Production writes are on by default; each start/terminal write waits at most 1000ms. Timeout/error prints a fixed warning and never replays model work. Late writes may complete. Succeeded describes completed model transport; caller cancellation during terminal writing is still honored. Standard preview/validation callbacks remain mandatory and unchanged.

## 10. Resume / recovery / point-in-time

No modelState or checkpoint changes in .7. Existing real-process recovery passes. Crash can leave a started row; unknown usage is not fabricated. Source cutoff, evidence, private tool continuation and Knowledge snapshots stay in their current owners. Correlation scope is process-local; durable calls survive via existing MongoDB. Storage outages can lose telemetry, not research validation or evidence.

## 11. Flags

MODEL_TELEMETRY_ENABLED=false disables production writer setup; default true. MODEL_ROUTING_MODE still only legacy/dry-run, with no executable policy. Standalone Gateway/diagnostics do not open Mongo automatically and require explicit onModelCall/configured writer to persist calls; no-sink calls preserve previous standalone behavior.

## 12. Actual tests and commands

```text
pnpm test
node --test tests/model-telemetry.test.mjs
node --test tests/research-path.test.mjs tests/model-telemetry.test.mjs
node --test tests/model-gateway.test.mjs tests/model-policy.test.mjs tests/model-migration.test.mjs tests/router-vision-migration.test.mjs
pnpm test:mongodb
node --test tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
git -c core.safecrlf=false diff --check
node artifacts/v4-8-7-audit.mjs
```

Mongo commands use mongodb://127.0.0.1:27029. Logs under artifacts/v4-8-7-*. Linux deployment command was rejected before execution, not counted as a pass. UI was not rerun: no frontend or public response shape change. No skipped tests or weakened financial/Evidence/review requirements.

## 13. Results

Baseline full unit 625 pass. Initial affected Gateway/migration subset 71 pass. Initial telemetry subset 5 pass; cancellation-during-terminal-write case added afterward. MongoDB 7 pass; telemetry/Knowledge API/real-process resume 3 pass.

The first full run had 631 tests: 630 passed and one existing research-path concurrency assertion failed. The cause was an unnecessary async start/finish wait even when no telemetry sink existed, delaying the original provider-call scheduling. Gateway now awaits recorder work only when the recorder is enabled. No test assertions were changed. Targeted concurrency/telemetry verification passed 11/11; the final full unit run passed 631/631 with zero failures, cancellations, skips or todos (artifacts/v4-8-7-unit-final.log, exit 0). The failed run remains in artifacts/v4-8-7-unit.log.

Inventory verification passed: one production transport/adapter, four migrated business owners, ten semantic callers, one migrated diagnostic; historical baseline hashes verified. File audit against the 1,399-file starting worktree confirms exactly 18 modified files, four new files and zero removed files. No Knowledge, financial/Evidence logic, existing benchmark fixture, dependency, lockfile or actual environment configuration changed. Whitespace diff check passed. Harness verification passed 7/7, including all 466 packaged file hashes (artifacts/v4-8-7-harness.log, exit 0). Linux deployment acceptance is still pending approval; V4.8.7 is not yet accepted and V4.8.8/V4.8.9 have not started.

## 14. Benchmark

Pinned synthetic six-mode research wire/result/events/checkpoints (24 hashes) and six router/Vision wire/results (12 hashes) remain unmodified and pass the initial affected suite in legacy/dry-run. No live-provider cost/latency/quality certification. Telemetry timing overhead is explicit; no cost-based routing.

## 15. Security / privacy

Whitelist normalization occurs in Gateway telemetry and again in storage. Fixed errors/warnings omit raw provider and storage text. Tokens remain provider/unknown; billing is estimated only with existing known counts/prices. Async contexts isolate concurrent jobs. Pre-job routers/uploads have null jobId. Internal summaries never sum currencies or treat missing totals as zero. No hidden reasoning, public prompt history or external telemetry service.

## 16. Rollback

Disable MODEL_TELEMETRY_ENABLED and restart; keep schema v2 and additive collection. A code rollback must retain the v2 migration definition in the rollback build because existing downgrade protection rejects pre-v2 binaries. Never delete schema records or research data to bypass it. Snapshot rollback copies preserve the actual accepted uncommitted baseline; do not reset to HEAD. No mandatory data rollback/backfill.

## 17. Limits

Best-effort operational telemetry, not transactional audit completeness. Up to two bounded write delays per complete(); process death/unavailable storage can leave started/absent calls. Summary covers recorded calls only. No tokenizer estimate or partial failed-response usage is fabricated. Success latency/TTFT comes from adapter; failed-call latency is recorder elapsed time with unknown TTFT and may include the start write. No retention TTL or aggregate cache; job deletion removes owned rows. No full RoutingDecision signals persisted.

## 18. Deferred / continuation

Finish .7 Linux deployment and final verification before proceeding. V4.8.8 provider health and V4.8.9 modelState are explicitly authorized next, in that order. V4.8.10 escalation, .11 rollout and later core versions remain unauthorized. CURRENT stays V4.8 throughout.
