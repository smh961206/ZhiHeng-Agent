# V4.8.7 Post-deployment Review

## 1. Release / outcome

Review limited to accepted V4.8.7. No new confirmed runtime defect or release blocker found in the inspected paths. Four additional contract-level tests strengthen the previously thin boundary coverage and pass against unchanged product code. V4.8.7 remains accepted; CURRENT=V4.8; no V4.8.8 implementation. Baseline is preserved in artifacts/v4-8-7-review3-baseline.json and artifacts/v4-8-7-review3-rollback/, including prior uncommitted work.

## 2. Modified files

tests/model-telemetry.test.mjs; tests/model-telemetry.integration.mjs; docs/invariants/model.invariants.md; docs/architecture/current-implementation-map.md; docs/releases/V4.8/DETAILED_INDEX.md; MANIFEST.json.

## 3. New files

This report only. Ignored artifacts/v4-8-7-review3-* contain local snapshots, test logs and audit/manifest helpers.

## 4. Removed files

None. Existing tests/assertions, golden fixtures and historical reports remain intact. Four tests are appended; none replaces an existing test.

## 5. Review findings / architecture

Inspected Gateway finalization, telemetry normalization/recorder/summary, storage ModelCall upserts/tombstones/deletion, schema boundary, production writer setup/correlation and existing tests, together with active maps, contract, invariants and ADR-002/012/014. No parallel implementation introduced.

The gap was in verification: earlier Mongo tests covered a single late start and a write after completed deletion, but did not exercise concurrent terminal replays, concurrent deletion/writes or independent job totals. The new Mongo tests seed 16 started records across two jobs, concurrently replay terminal writes and late starts, then require exactly 16 records and correct per-job totals. A separate test interleaves 16 writes with deletion, checks late start/terminal suppression and preserves another job's record. Both pass against existing storage code.

Two unit tests add explicit-zero versus unknown usage/billing with separate CNY/USD totals, and a write that rejects after its telemetry timeout followed by a successful terminal write. Neither failure is allowed to become a free/zero usage inference or affect research. No production fix was necessary.

## 6. Schema

No schema, persistent field, public API or version changes. ModelCall schemaVersion 1 and Mongo migration 2 remain. Test fixtures use existing fields only.

## 7. Migrations

No new migration/backfill or historical rewrite. Existing migrations run only in randomly named disposable test databases; tests drop their databases in finally blocks.

## 8. Environment

Existing Windows/Node/pnpm environment. No dependency/lockfile, .env/example, runtime/deployment config change. Mongo tests explicitly use mongodb://127.0.0.1:27029 and random database names in the pre-existing isolated test service. No real research DB connection or new Docker service/socket mount.

## 9. Compatibility / runtime

Runtime behavior change = 0 for this review. No product source is edited. Model routing, financial definitions, Evidence/review validation, Knowledge, successful responses and error behavior retain the accepted implementation. Contract semantics unchanged; only tested enforcement evidence is expanded.

## 10. Resume / recovery / point-in-time

No checkpoint, tool, cutoff, recovery or Knowledge snapshot change. Existing real-process resume integration is included with the new Mongo tests. Deletion coverage concerns operational ModelCall rows, not a rewrite of canonical research state.

## 11. Feature flags

No changes. MODEL_TELEMETRY_ENABLED and MODEL_ROUTING_MODE keep accepted defaults/behavior. No policy/health/escalation activation.

## 12. Actual commands

```text
pnpm test
node --test tests/model-telemetry.test.mjs tests/model-telemetry-migration.test.mjs
node --test tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
pnpm test:mongodb
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
node artifacts/v4-8-7-review3-audit.mjs
git -c core.safecrlf=false diff --check
```

Mongo commands use explicit loopback 27029. Logs are artifacts/v4-8-7-review3-*. Linux deployment, UI and routes are not rerun: product and deployment code are unchanged. The preceding successful deployment remains historical acceptance evidence, not a newly executed run here.

## 13. Results

Baseline full unit suite: 648/648, exit 0. Telemetry plus existing async-writer golden subset: 25/25, exit 0. Telemetry/Knowledge API/real-process resume integration: 5/5, exit 0, including both new concurrent Mongo cases. Final full unit suite: 650/650; final Mongo suite: 7/7; standalone Harness: 7/7 with 470 exact packaged byte/hash entries. All final runs exit 0 with no failed, skipped, cancelled or todo tests. Subsets overlap the full unit suite and must not be added to its count. No tests deleted or relaxed; no product code changes to make these cases pass.

The first pnpm test:mongodb run exited 1: four tests passed and three existing API tests timed out (Node reports cancelled=3, at their unchanged 20/30-second limits). It is retained as artifacts/v4-8-7-review3-mongodb.log. Read-only docker stats and docker logs --since 8m zhiheng-v4879-test-mongo diagnostics found server-side slow operations across unrelated temporary databases: the create-test GridFS metadata operation took 9,945 ms with only 13.5 ms CPU, and other operations took approximately 9–10 seconds. These observed service delays explain the cumulative test deadlines; the underlying host scheduling/storage cause was not conclusively identified. No real database was inspected or service/configuration changed. The exact same pnpm command, test files, timeouts, concurrency and loopback service then passed 7/7 in 3.46 seconds (artifacts/v4-8-7-review3-mongodb-final.log). Raw isolated-service diagnostics remain in artifacts/v4-8-7-review3-mongo-diagnostic.log. This transient failure is not hidden or converted into a skipped test.

Audit against 1,407 baseline files confirms six modified test/document/manifest files, one added report and zero deletions. All product source, schema/config, Knowledge, golden fixtures and previous reports are unchanged. Inventory verifies one transport/adapter, ten semantic callers, four migrated owners and one diagnostic with historical hashes unchanged. Whitespace diff check passes. Evidence files use the review3 prefix: -unit.log, -integration.log, -harness.log, -inventory.log and -audit-result.json.

## 14. Benchmark

Existing twelve async-writer golden cases pass in the affected subset: six research modes preserve full request/result/event/checkpoint digests and six router/Vision cases preserve wire/results/cache behavior. Fixtures unchanged. Concurrent Mongo checks are correctness coverage, not a throughput benchmark or proof of all possible schedules. No live-provider quality/cost certification.

## 15. Security / privacy

Deletion tests verify no owned telemetry survives after all concurrent operations settle and later writes complete, while another job is retained. Late storage exceptions do not expose raw text in records/warnings. No prompt/reasoning/credential handling change or new external destination. Existing tombstone and whitelist implementations remain authoritative.

## 16. Rollback

Restore only the six modified test/document/manifest files from this review snapshot and remove this report, after checking for later edits. Do not reset to HEAD or discard previous uncommitted work. No runtime/database rollback or migration needed. V4.8.7's operational rollback guidance remains unchanged.

## 17. Limitations

This review does not prove every concurrent schedule or lossless telemetry under process death/storage outage. Best-effort writes can still leave absent/started records, and summaries cover recorded calls only. The retry test seeds started rows before duplicate terminal updates; it is not a new guarantee for arbitrary conflicting payloads sharing an ID. The initial integration timeout demonstrates sensitivity to transient service latency; the exact host-level source of that latency remains undetermined. No unsupported claim of a newly found production incident or product defect.

## 18. Deferred / stop

V4.8.8 health/cooldown/fallback and V4.8.9 modelState remain future and unimplemented. No distributed queue, cost routing, transactional audit ledger, new deployment or later-release capability added. V4.8.7 acceptance and CURRENT=V4.8 are retained. Stop after this scoped review and verification.
