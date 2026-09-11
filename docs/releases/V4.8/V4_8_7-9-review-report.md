# V4.8.7–V4.8.9 Review and Optimization

## 1. Release and actual scope

CURRENT=V4.8. Reviewed the implemented V4.8.7 telemetry and the unimplemented V4.8.8/.9 specifications against real code. V4.8.7 still awaits Linux deployment acceptance. No V4.8.8 health routing or V4.8.9 modelState implementation is claimed or introduced; no .10/.11 or later release work. The review baseline preserves all earlier uncommitted work in artifacts/v4-8-7-9-review-baseline.json and artifacts/v4-8-7-9-review-rollback/; HEAD is not that baseline.

## 2. Modified files

- server/model-gateway.mjs
- server/model-telemetry.mjs
- tests/model-telemetry.test.mjs
- docs/contracts/model-gateway.contract.md
- docs/invariants/model.invariants.md
- docs/architecture/current-implementation-map.md
- docs/architecture/04-model-system.md
- docs/releases/V4.8/schema.md
- docs/releases/V4.8/subreleases/V4_8_8-health-routing-v1.md
- docs/releases/V4.8/subreleases/V4_8_9-checkpoint-modelstate-compatibility.md
- docs/releases/V4.8/DETAILED_INDEX.md
- MANIFEST.json

## 3. New files

tests/model-telemetry-migration.test.mjs and this report. Local ignored artifacts/v4-8-7-9-review-* contain reproducibility logs, manifest/audit helpers and the rollback snapshot.

## 4. Removed files

None. Prior reports, tests and pinned golden fixtures are retained. One existing assertion is tightened to require a genuinely selected preflight profile instead of accepting null; no validation is removed or relaxed.

## 5. Findings and architecture

**P2 fixed — deadline timeout misclassified during terminal telemetry writing.** The existing deadline aborts with code=model_timeout. Gateway's post-write cancellation check recognized only name=TimeoutError, yielding aborted/nonretryable and losing the existing legacy model_timeout recovery classification. Both reason forms now remain timeout; ordinary cancellation remains aborted. The regression fails before the fix and passes afterward, checks safe error text/retryability/legacy translation, and verifies exactly one provider request.

**P2 fixed — preflight failures lost known attribution.** Valid research requests failing stream validation produced null purpose/profile and default legacy mode even in dry-run. Recorder metadata now captures the valid known purpose and snapshotted routing mode, then the profile actually selected before remaining validation. Unknown requested profile IDs remain null rather than being recorded as selected. No adapter call is emitted for these failures. The regression fails before the fix and verifies zero provider requests afterward.

**P2 corrected — contradictory current/future mapping.** Current map/model architecture/schema still called durable telemetry FUTURE despite V4.8.7 storage. Those statements now distinguish implemented .7 telemetry from its pending acceptance and unimplemented health/state work. V4.8.8's template incorrectly allowed checkpoint modelState despite its no-schema scope; that belongs to .9.

Inspected Gateway/Catalog/adapter/result/request/deadline, telemetry, index execution, storage/migrations, Agent, create/retry/resume/checkpoint/public-job owners, active architecture/contract/invariants and ADR-002/012/014. Existing owners remain; no parallel transport, health system, state store or new provider endpoint.

## 6. Schema

No schema version or field additions in this review. V4.8.7 model_calls schemaVersion 1 and Mongo migration 2 remain. Known attribution now populates already nullable fields earlier. Older null values remain readable and are not retrospectively guessed.

## 7. Migrations

No migration or backfill introduced, edited or executed against a real research database. Integration tests run the existing migrations only in random disposable test databases. No historical record rewrite.

## 8. Environment

Windows PowerShell, existing Node/pnpm/dependencies. Mongo integration uses mongodb://127.0.0.1:27029 and random database names in the previously prepared isolated test Mongo service. No actual .env, environment example, dependency, lockfile, container configuration or deployment script changes in this review. The pre-existing temporary Mongo container remains available for subsequent authorized acceptance work.

## 9. Compatibility and runtime behavior

Runtime behavior change is not zero: timeout error classification and preflight operational metadata are corrected. Successful model selection, request payload, delivery/review/Evidence/financial behavior remain unchanged. No public API shape change. No-sink Gateway timing guards remain intact. A succeeded ModelCall continues to mean completed transport; caller cancellation during its bounded terminal write can still reject the caller. This existing distinction is documented, not relabeled as a health signal.

## 10. Resume, recovery and point-in-time

Timeouts again reach the existing model_timeout recovery mapping. Private checkpoint, tool state, original cutoff and Knowledge snapshots remain unchanged. Real-process Mongo resume tests pass. V4.8.9 planning now explicitly warns that returning null for model-pin mismatch would reach research-retry's reacquisition branch: new pinned records must reject incompatible continuation before dispatch/acquisition. This is a future implementation constraint, not a newly implemented pin. Old records cannot prove a historical model/connection pin that was never stored.

## 11. Feature flags

No new flags or default changes. MODEL_TELEMETRY_ENABLED=false still disables the production writer; MODEL_ROUTING_MODE remains legacy/dry-run only. No production policy or health routing activation.

## 12. Actual test commands

```text
pnpm test
node --test tests/model-telemetry.test.mjs
node --test tests/model-telemetry.test.mjs tests/research-path.test.mjs tests/model-deadline.test.mjs tests/model-gateway.test.mjs
node --test tests/model-telemetry.test.mjs tests/model-telemetry-migration.test.mjs
pnpm test:mongodb
node --test tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
node artifacts/v4-8-7-9-review-audit.mjs
git -c core.safecrlf=false diff --check
```

Mongo commands explicitly use loopback 27029. Logs are artifacts/v4-8-7-9-review-*. UI/routes and Linux deployment are not rerun in this review; no frontend/public route/deployment code changed. The unresolved deployment gate is not counted as a pass or bypassed.

## 13. Results

Baseline: 631/631 unit tests, exit 0. Added repros: 8 telemetry cases, 6 passed and 2 failed before fixing production code (review-repro.log retained). Affected Gateway/deadline/path/telemetry verification: 47/47, exit 0. Final telemetry plus enabled-writer golden subset: 20/20, exit 0. Mongo suite: 7/7; telemetry/Knowledge API/process-resume integration: 3/3, both exit 0. Final full unit suite: 645/645, exit 0; standalone Harness: 7/7, exit 0, with 467 exact packaged hashes. These overlapping subset counts are not added to the full-suite count. No tests skipped, cancelled or deleted to obtain a pass. This is review completion evidence, not V4.8.7–.9 release acceptance.

Inventory passes with one production transport/adapter, ten semantic callers, four migrated business owners, one migrated diagnostic and historical hashes verified. Audit against 1,403 starting files confirms exactly twelve modified files, two additions and zero deletions. Only two runtime files changed: Gateway and its telemetry recorder. Storage/migrations, actual configuration, dependencies/locks, Knowledge, financial/Evidence logic, existing golden fixtures and prior reports are unchanged. Whitespace diff check passes. Logs: review-unit.log, review-harness.log, review-inventory.log and review-audit-result.json under the artifacts/v4-8-7-9- prefix.

## 14. Benchmark evidence

New enabled-writer tests reuse all twelve pinned scenarios with a genuinely asynchronous telemetry sink: six research modes compare full wire/result/event/checkpoint digests (24 hashes), six router/Vision scenarios compare wire/result/cache behavior (12 hashes). Records are paired by call ID and retain scope/purpose/profile. All twelve pass without editing the pinned fixtures. Existing no-sink and dry-run golden tests remain in the full suite. No live-provider quality, cost or latency certification and no unified benchmark platform claim.

## 15. Security and privacy

Telemetry still uses the existing whitelist and excludes prompts/reasoning/credentials/raw exceptions. Unknown requested profile text is not persisted as execution identity; error messages omit the raw deadline reason. No new network destinations or public metadata fields. Future .8 specs require safe health identity and independent availability categories; .9 specs require private modelState exclusions from public detail/list/events. These future guards are not claimed as enforced today.

## 16. Rollback

Restore only this review's twelve modified files from artifacts/v4-8-7-9-review-rollback/ and remove only the two additions listed above, after checking for later edits. Preserve all previous uncommitted work; do not reset to HEAD. No review data migration or data rollback. V4.8.7 rollback still requires retaining schema v2 compatibility; do not delete migration records to run a pre-v2 binary. Older null-attribution telemetry remains valid.

## 17. Limitations and remaining acceptance

V4.8.7's Linux deployment gate is still unverified. In the preceding execution, automatic approval rejected mounting the host Docker socket into the temporary Linux runner because it grants host Docker management access without recognized explicit current authorization. This review request is not treated as that authorization; no retry or workaround was attempted. The already prepared runner remains available. Completing release acceptance requires the authorized actual deployment test; .8/.9 implementation remains sequenced after that gate.

Best-effort telemetry may be absent or left started on storage failure/process death; summary completeness is limited to recorded calls. The review does not turn telemetry into a transactional audit ledger, implement bounded health history or pin model state.

## 18. Deferred work

V4.8.8: recent availability tracking, bounded cooldown and capability/quality-compatible same-tier fallback, with explicit selection/private-history/no-replay safety and concurrency tests. V4.8.9: additive new-job model/profile/effort/policy pins, legacy absence semantics, fail-closed mismatches before reacquisition, safe key rotation and private/public serialization tests. No cross-provider escalation, production rollout, cost routing, distributed circuit breaker or later-release capability is implemented in this review. CURRENT remains V4.8.
