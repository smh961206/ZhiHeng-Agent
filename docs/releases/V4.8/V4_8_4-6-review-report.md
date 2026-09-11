# V4.8.4–V4.8.6 Review and Optimization

## 1. Reviewed release / findings

Scope is the accepted V4.8.4 router/Vision migration, V4.8.5 complexity utility and V4.8.6 shadow policy. Review status: PASS. CURRENT remains V4.8. No V4.8.7 work is authorized or implemented. Review-start snapshot: 1,397 files in artifacts/v4-8-4-6-review-baseline.json with byte copies in artifacts/v4-8-4-6-review-rollback/. Earlier accepted uncommitted work is preserved.

**P2 — fixed: configuration can change between profile selection and transport.** A Gateway created with a mutable env and custom onRoutingDecision hook selected a profile before the hook ran, but the adapter read connection/key/deadline options afterward. A hook reloading configuration could send the old model to the new endpoint with the new key. The new regression reproduced exactly that mismatch: 15 existing policy tests passed, this case failed before the fix. Gateway now snapshots env at complete() entry and reuses it for Catalog, observation mode and adapter. The next call still receives updated configuration. This is an internal injectable-API case; standard Agent/router/Vision wrappers already copy their environment, and no production occurrence is claimed.

**P3 — fixed: stale current-state documentation.** V4.8.5's status line still said V4.8.6 was unimplemented, and the current map used unqualified future/no-policy language. It now separates the original V4.8.5 boundary from accepted shadow integration and future executable routing.

**Coverage improvement:** six pinned V4.8.4 router/Vision cases now also run with V4.8.6 dry-run enabled. They preserve full wire/result hashes and existing cache assertions and verify null candidates/no extra observations on cache hits. No new executable defect was found in the reviewed V4.8.4 wrappers or V4.8.5 score formulas; their product code and weights remain unchanged.

## 2. Modified files

- server/model-gateway.mjs — coherent per-call environment snapshot.
- tests/model-policy.test.mjs — reproduced reload mismatch, current/next-call identity and deadline assertions.
- tests/router-vision-migration.test.mjs — six dry-run golden/cache cases.
- docs/contracts/model-gateway.contract.md — snapshot semantics and review evidence.
- docs/architecture/current-implementation-map.md — accurate current/future boundary and current owner.
- docs/releases/V4.8/subreleases/V4_8_5-complexity-evaluator-v1.md — correct stage status navigation.
- docs/releases/V4.8/DETAILED_INDEX.md — review report navigation.
- MANIFEST.json — exact Harness file hashes, sizes and review report entry.

## 3. New files

Only this report: docs/releases/V4.8/V4_8_4-6-review-report.md. Snapshot/audit/manifest helpers and logs under artifacts/v4-8-4-6-review-* are ignored local verification assets.

## 4. Removed files

None. Existing tests, golden baselines, old completion reports and Knowledge files are preserved.

## 5. Architecture review

Read AGENTS, execution protocol, CURRENT, active specs, system/current maps, Model Gateway contract, model/research/evidence invariants and ADR-002/012/014. Inspected current path and security-intent cache/fallback/cancellation owners, Vision readiness/request guards, Catalog, Gateway, adapter and stream parser, diagnostics, complexity, policy and their regression fixtures. Existing owners are reused; no new subsystem, provider client, parser, signal collector or routing selector.

Gateway owns the new per-call consistency guard. Model policy remains observational; profile/model/effort selection stays legacy. Router/Vision capability/role/finish guards, deadlines, sizes, retries and source handling remain unchanged. No accepted ADR decision or enforced invariant is changed or downgraded.

## 6. Schema

No configuration schema, RoutingDecision shape, persistence schema, API, checkpoint or framework/Knowledge version change. Runtime framework remains 4.7 and research contract remains 7. Environment snapshots are transient server memory, never public metadata.

## 7. Migrations

None. No data backfill, historical rewrite, source refresh, dependency migration or modelState pinning. New calls can still observe configuration reloads; only mixing configurations within one call is prevented.

## 8. Environment

Windows PowerShell / Node 24.19.0 / pnpm 11.19.0. No dependency/lock/deployment/actual .env modification, external model calls, servers or containers needed for this review. All transport cases inject synthetic responses.

## 9. Compatibility / runtime impact

Normal legacy/dry-run model requests remain identical. Runtime behavior changes only for the reproduced configuration-reload boundary: current calls now retain original model/base/key/deadline while subsequent calls see the new values. Do not describe the total fix as Runtime behavior change = 0. Investment research rules, actual policy selection, financial definitions, Evidence/Knowledge and acquisition behavior are unchanged. The observer remains trusted code; this guard does not sandbox arbitrary hook side effects or synchronous work.

## 10. Resume / recovery / point-in-time

No persistence or Agent/recovery code change. Existing full-suite resume/recovery tests and six-mode golden checkpoint comparisons remain applicable; job cutoff, evidence and private tool history are not modified. Per-call environment consistency is not cross-call/job profile pinning and does not implement V4.8.9.

## 11. Feature flags

No new flag. MODEL_ROUTING_MODE remains legacy by default; dry-run logs candidates only; unsupported policy/unknown values remain legacy. The routing-mode read uses the same current-call snapshot as the selected profile and transport configuration.

## 12. Commands actually executed

```text
pnpm test
node --test tests/model-policy.test.mjs
node --test tests/model-policy.test.mjs tests/research-complexity.test.mjs tests/router-vision-migration.test.mjs tests/model-gateway.test.mjs tests/model-migration.test.mjs tests/model-call-inventory.test.mjs
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
git -c core.safecrlf=false diff --check
node artifacts/v4-8-4-6-review-audit.mjs
```

Log prefix: artifacts/v4-8-4-6-review-. No skipped/filtered cases or weakened assertions. MongoDB/API/process integration, UI and deployment suites were not rerun: this review changes only Gateway's transient configuration capture plus tests/docs, with no database/API/UI/deployment implementation change. Prior integration acceptance is historical evidence, not a run performed by this review.

## 13. Results

| Check | Actual result |
|---|---|
| Baseline full suite | 616 passed, exit 0 |
| Pre-fix reproduction | 15 passed / 1 failed, exit 1; old model mixed with new address/key |
| Affected subset after fix | 96 passed, exit 0 |
| Final full unit suite | 623 passed across 77 files, exit 0; includes 7 added tests and all final deadline assertions |
| Final standalone Harness | 7 passed, exit 0; 464 packaged entries match exact bytes/hashes |
| Model-call inventory | 1 adapter endpoint, 4 production owners, 10 semantic callers, 1 migrated diagnostic; historical hashes verified |
| Diff whitespace check | exit 0 |
| File hash audit | 8 modified / 1 added / 0 removed; 1,389 baseline files byte-identical |

Final tests have 0 failures/cancellations/skips/todos. Subset and Harness counts overlap the full suite and must not be counted as additional unique tests. The reproduced failure was retained and fixed, not hidden or deleted. Financial/Evidence/Knowledge/acquisition code, adapter/parser, scoring weights, dependency/lock/config/deployment files and prior completion reports match their review-start hashes. Logs are baseline, repro, targeted, unit, harness, inventory and change-audit under artifacts/v4-8-4-6-review-*.

## 14. Benchmark evidence

Original six-mode text request/result/event/checkpoint goldens (24 pinned digests) remain unchanged and run in legacy and dry-run suites. Original six router/Vision wire/result goldens (12 pinned digests) now also run under dry-run with full equality. Existing offline synthetic diagnostic still verifies Vision→analysis request separation. No live-provider quality, cost, latency or calibration benchmark is claimed.

## 15. Security / privacy

The fix prevents the reproduced accidental endpoint/key/model mismatch during observation-driven reload. New tests use synthetic credentials/domains and no real networking. No credentials, URLs, prompts, source content or hidden reasoning enter new public records. Snapshotting does not change existing secret resolution ownership or extend log contents.

## 16. Rollback

Restore only the eight modified files from artifacts/v4-8-4-6-review-rollback/ and remove only this added report, checked against the review baseline hashes. Do not reset the repository to HEAD, which would discard earlier accepted work. No database/data rollback is required. Reverting the guard restores the documented hook/reload mismatch; setting MODEL_ROUTING_MODE=legacy disables shadow observation without reverting the guard.

## 17. Known limitations

The existing 0–100 complexity heuristic and raw 0–3/4–7/8–10/≥11 policy bands still saturate early (B plus five planned years → PRO/max). This is explicitly uncalibrated shadow-policy debt; no evidence supports changing weights or enabling executable routing in this review. Most automatic signals remain unknown, and no complete company/material/failure classifier is added. Static architecture checks are lexical, not proof against arbitrary dynamic code. No additional confirmed runtime defect remains in this reviewed delta; this is not an exhaustive security certification.

## 18. Deferred work / stop

Persistent usage, health, job-level modelState, escalation, executable tier profiles and quality-gated rollout remain V4.8.7–V4.8.11 work. No V4.9/V5.x/V6.0 changes. Stop after review verification, with CURRENT=V4.8 and V4.8.7 unstarted.
