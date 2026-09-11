# V4.8.7–V4.8.9 Second Review

## 1. Release / scope

CURRENT=V4.8. Review of V4.8.7 implementation and V4.8.8/.9 planned boundaries. V4.8.7 deployment acceptance is pending; .8/.9 remain unimplemented. Preserve prior uncommitted work using artifacts/v4-8-7-9-review2-baseline.json and artifacts/v4-8-7-9-review2-rollback/, not HEAD. No later release implementation.

## 2. Modified files

server/model-gateway.mjs; tests/model-telemetry.test.mjs; docs/contracts/model-gateway.contract.md; docs/invariants/model.invariants.md; docs/architecture/current-implementation-map.md; docs/releases/V4.8/DETAILED_INDEX.md; MANIFEST.json.

## 3. New files

This report only. Ignored artifacts/v4-8-7-9-review2-* provide local snapshots/helpers/logs, not product files.

## 4. Removed files

None. No previous test/assertion, report or golden fixture modified or deleted; three new tests appended to the existing telemetry suite.

## 5. Finding / architecture

**P2 fixed: terminal telemetry reread mutable caller cancellation state.** After awaiting the terminal writer, Gateway inspected input.signal again. A caller/observer replacing or removing that field could suppress a real deadline, attach an unrelated aborted signal to a successful call, or install a getter whose raw exception escaped finalization. Three new tests reproduce all outcomes before the fix. The first test also checks both removing and replacing the original signal after the fix.

Gateway now retains the validated signal reference from its prepared dispatch request before any telemetry await and uses it in finalization. An absent original signal remains absent. No additional awaits, transport, retry or state owner. Each regression asserts exactly one provider request. Existing timeout classification and best-effort telemetry semantics remain.

This is a reproducible internal API mutation boundary; this review found no current business owner deliberately rewriting the submitted signal. It is not evidence of an observed production incident or an external exploit. Reviewed telemetry normalization/write bounds, storage upserts/deletion/summary, execution attribution, Catalog/adapter/deadline and future health/resume specifications; no additional confirmed runtime defect was established in those areas.

## 6. Schema

No schema or field change. Existing ModelCall v1, Mongo migration 2, job/checkpoint structures and public response shapes unchanged. Per-call signal reference is memory-only, not V4.8.9 modelState.

## 7. Migrations

No new/modified migration, backfill or historical rewrite. Integration tests use existing migrations in random temporary databases only.

## 8. Environment

Existing Windows/Node/pnpm environment. No dependencies/lockfile, actual .env, example configuration, Docker or deployment script changes. Tests use the previously prepared isolated Mongo service on loopback 27029 and random database names; no real research database. The pre-existing temporary service is retained for subsequent authorized work.

## 9. Compatibility / runtime

Runtime behavior change is not zero: mutable-input cancellation races now follow the dispatched signal. Normal requests, model selection, wire format, stream handling, successful results and all financial/Evidence/review rules remain unchanged. No-sink scheduling guard retained. The terminal succeeded record still describes completed transport even when original caller cancellation during its write subsequently rejects the result.

## 10. Resume / recovery / point-in-time

Existing timeout-to-model_timeout recovery mapping is retained; request-object mutation cannot erase the original timeout at this boundary. No checkpoint/pending-tool/cutoff/Knowledge changes. V4.8.9's required new-record pin and fail-closed mismatch handling remain future work, as already recorded in the first review.

## 11. Feature flags

No flags/default changes. MODEL_TELEMETRY_ENABLED=false still disables the production writer. MODEL_ROUTING_MODE remains legacy/dry-run; no health selection or production policy.

## 12. Executed commands

```text
pnpm test
node --test tests/model-telemetry.test.mjs
node --test tests/model-telemetry.test.mjs tests/model-telemetry-migration.test.mjs tests/model-gateway.test.mjs tests/model-deadline.test.mjs tests/research-path.test.mjs
pnpm test:mongodb
node --test tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
node artifacts/v4-8-7-9-review2-audit.mjs
git -c core.safecrlf=false diff --check
```

Mongo commands explicitly set MONGODB_URI=mongodb://127.0.0.1:27029. Logs use artifacts/v4-8-7-9-review2-*. No UI/routes/deployment rerun: none of their code/config changed, and the previous Linux deployment permission gate remains unresolved. This is not a claim that all release acceptance gates passed.

## 13. Results

Baseline unit suite: 645/645, exit 0. Reproducer telemetry suite: 11 tests, 8 pass and 3 fail before production fix; failure log retained. Affected telemetry/Gateway/deadline/path plus enabled-writer goldens: 62/62, exit 0. Final full unit suite: 648/648; Mongo suite: 7/7; telemetry/Knowledge API/real-process resume integration: 3/3; standalone Harness: 7/7 with 468 exact packaged file hashes. All final commands exit 0, with no failures, skips, cancellations or todos. Subset counts overlap the full suite and are not added to it. No deletion or relaxed assertion to make tests pass.

Audit against the 1,405-file review baseline confirms seven modified files, one added report, zero deletions. Gateway is the only modified runtime file. Inventory passes with one transport/adapter, ten semantic callers, four migrated business owners, one migrated diagnostic and historical baseline hashes verified. Whitespace diff check passes. Previous reports, storage/schema, Knowledge, financial/Evidence code, golden fixtures, dependencies/locks and environment/configuration remain unchanged. Actual logs are artifacts/v4-8-7-9-review2-unit.log, -mongodb.log, -integration.log, -harness.log, -inventory.log and -audit-result.json under the same prefix.

## 14. Benchmark

Twelve existing asynchronous-writer scenarios pass in the affected subset: six research modes retain 24 pinned wire/result/event/checkpoint hashes, and six router/Vision cases retain 12 wire/result hashes plus cache assertions. Existing legacy/dry-run fixtures remain unchanged. No live-provider cost/quality/latency certification or new benchmark platform.

## 15. Security / privacy

Finalization no longer evaluates a newly installed getter on the mutable caller object, preventing that getter's raw exception from replacing the model result. Original safe timeout/cancellation categories remain. No prompt/reasoning/credentials in telemetry, no new public data or destination. The API is not a sandbox for arbitrary JavaScript proxies or mutated AbortSignal internals.

## 16. Rollback

Restore only the seven modified files from this review's saved worktree and remove this added report, after checking for later edits. Do not reset to HEAD or discard previous reviews. No data rollback. Preserve V4.8.7 schema v2 compatibility; never remove migration records to bypass downgrade protection.

## 17. Limitations

Best-effort telemetry retains its existing bounded waits and possible absent/started records. Storage summary covers recorded calls only. V4.8.7 Linux deployment acceptance remains unverified: the preceding task's automatic approval rejected the host Docker socket mount because it grants host Docker management rights without recognized explicit authorization. No new mount attempt or workaround in this review. The review request does not substitute for that authorization.

## 18. Deferred work / stop

V4.8.8 health/cooldown/same-tier selection and V4.8.9 persistent modelState remain authorized but unimplemented, sequenced after preceding acceptance. Their existing specifications already cover private continuation, availability-versus-reasoning separation, no replay, legacy absence and model-pin mismatch before acquisition; no new spec change was needed in this second review. No .10/.11 escalation/rollout or later-release work. CURRENT remains V4.8.
