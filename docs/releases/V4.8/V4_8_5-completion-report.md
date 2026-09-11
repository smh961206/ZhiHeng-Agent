# V4.8.5 Completion Report — Complexity Evaluator V1

Date: 2026-09-10. CURRENT remains V4.8; runtime/Knowledge remains 4.7 and research contract version 7. **V4.8.5 isolated evaluator and scoped acceptance are complete. V4.8.6 is not started.**

## 1. Release and baseline

V4.8.5 adds pure structured complexity scoring only. Before editing, 1,390 tracked/unignored worktree files were hashed/copied into ignored `artifacts/v4-8-5-baseline.json` and `artifacts/v4-8-5-rollback/`. HEAD is still de56872c3718371e086454a291d385f6992bcd24; accepted V4.8.2–V4.8.4 and reviews are uncommitted and preserved. The baseline full unit suite passed 586 tests, no failures/cancellations/skips/todo.

## 2. Modified files

- `docs/architecture/00-system-map.md`, `04-model-system.md`, `current-implementation-map.md`: isolated evaluator, actual current owners and future integration. Also correct a stale Catalog-to-Vision predicate description to the real V4.8.4 ownership.
- `docs/contracts/model-gateway.contract.md`: closed signal/result API, all fixed weights, thresholds, unknown handling, non-scoring failure categories and limits.
- `docs/invariants/model.invariants.md`: local missing-data/provider-failure separation and executable isolation evidence; existing obligations unchanged.
- `docs/adr/ADR-014-quality-before-cost.md`: supporting utility implementation status, without reversing the accepted decision or claiming quality calibration.
- `docs/releases/V4.8/README.md`, `DETAILED_INDEX.md`, `schema.md`, `migration.md`, `rollback.md`, `subreleases/V4_8_5-complexity-evaluator-v1.md`: scope, actual API and future-template corrections.
- `docs/releases/V4.8/subreleases/V4_8_4-migrate-router-and-vision-calls.md`: update the stale next-stage navigation note; previous completion report remains unchanged.
- `MANIFEST.json`: packaged hashes and this report.

No pre-existing product source, test, fixture, dependency, runtime config, Knowledge content or research record is modified.

## 3. New files

- `server/research-complexity.mjs`: pure synchronous evaluateResearchComplexity(), no imports/I/O/production caller.
- `tests/research-complexity.test.mjs`: six golden specification fixtures plus mode, uncertainty, normalization, thresholds, failure separation, ownership, malformed-input and architecture-isolation regressions (15 tests).
- `tests/fixtures/research-complexity-cases.json`: six hand-authored expected score/level/reason cases, including A/B/D, cross-currency, evidence conflict and non-scoring missing/provider/format signals.
- `docs/releases/V4.8/V4_8_5-completion-report.md`: this report.

Ignored artifacts hold snapshots/helpers/logs only; no new service or infrastructure.

## 4. Removed files

None. Existing implementations, tests, assertions and prior release evidence are preserved.

## 5. Architecture and inspected implementation

Repository search found no existing evaluateResearchComplexity or scoring weights. Existing mode/history plans, execution budgets/status, review validation attempts and evidence gaps are separate owners. Inspected `research-create`, `research-workflow`, `agent-execution`, Agent's review/receipt handling, `research-resume`, `evidence-followup`, shared framework/recovery and the accepted model stack/maps/contracts. Relevant ADR-002/012/014 and model/research/Evidence invariants remain authoritative.

A separate small pure module is appropriate because complexity scoring is new, distinct from choosing a research path, executing tools, calculating financial values or validating review. It accepts only explicit structured inputs and does not extract signals from jobs. Tests scan server/scripts/shared/src to prohibit production imports/calls in V4.8.5 and verify no ambient clock/environment/provider dependencies. No parallel router, policy, orchestration or validation subsystem is created.

## 6. Schema

Only a version-1 in-memory signal/result contract. Output is version, score, level, ordered reasons, normalized signals and unknownSignals. This is heuristic versioning, not a persistent schema/version. Missing stays null; explicit zero/empty lists remain distinguishable. No database, checkpoint/modelState, public HTTP API, research payload or historical-record change.

## 7. Migration

None. Existing jobs are neither read nor written by the evaluator. No runtime integration or backfill. Generic specification text implying persisted modelState, usage or policy flags was corrected to V4.8.9, V4.8.7 and later policy rollout respectively. Future integration must classify failures and establish distinct companies/markets/currencies/workload from their real owners; this subrelease does not infer them from free text or retries.

## 8. Environment

Node 24.19.0 / pnpm 11.19.0 on Windows. No dependencies, lockfile, environment, configuration, server or database setup changes. Tests are deterministic local calls plus existing synthetic mocked model regressions; no live provider request or user research data transmission. No temporary server/container was needed or started.

## 9. Compatibility and runtime impact

Existing runtime behavior change = 0: all pre-existing product files remain byte-identical and no production owner imports the new evaluator. Model selection, request wire, research prompts/budgets, calculations, Evidence constraints, Knowledge, collection, review and delivery are unchanged.

The V1 weights are explicit initial engineering heuristics because no prior contract/calibration existed. Known contributions sum to 0–100 with descriptive low/moderate/high levels; all-scoring-signals-unknown produces unknown. Partial-input levels describe only known contributions, not confidence that unknown work is easy. No score recommends or upgrades a model. Fixed weights/levels and all input boundaries are recorded in the Gateway contract; policy thresholds and quality calibration remain separate future work.

## 10. Resume/recovery and provenance

No checkpoint/tool state or original cutoff change. Unknown historical observations remain unknown. Runtime/review reasoning failures require explicit caller classification; data gaps, provider failures and format repairs remain separate zero-point signals. Aggregate retries/validation attempts are not accepted as a substitute for reasoning-failure counts. The evaluator neither verifies sources nor extracts private reasoning. Existing resume and golden checkpoint tests retain their original behavior.

## 11. Feature flags

None. Production isolation is explicit and tested. MODEL_ROUTING_MODE, policy decisions, health routing and escalation are not implemented.

## 12. Tests executed

| Command | Actual result | Evidence |
|---|---|---|
| `pnpm test` before edits | 586 passed / 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-5-baseline-unit.log` |
| `node --test tests/research-complexity.test.mjs` | 15 passed, exit 0 | `artifacts/v4-8-5-complexity-tests.log` |
| `node --test tests/research-complexity.test.mjs tests/model-migration.test.mjs tests/router-vision-migration.test.mjs tests/model-call-inventory.test.mjs` | 50 passed, exit 0; includes final mode type/coercion guard | `artifacts/v4-8-5-targeted.log` |
| `pnpm test` after changes | 76 files / 601 passed / 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-5-unit.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 1 transport / 10 production callers / 0 direct diagnostics / 4 migrated production owners / 1 migrated diagnostic; historical hashes verified; exit 0 | `artifacts/v4-8-5-inventory.log` |
| `node --test tests/harness.test.mjs` after final documentation/manifest refresh | 7 passed / 0 failed/skipped; 462 packaged entries; exit 0 | `artifacts/v4-8-5-harness.log` |
| `node artifacts/v4-8-5-audit.mjs` and `git -c core.safecrlf=false diff --check` | 14 changed / 1,376 byte-identical / 4 added / 0 removed; no whitespace errors | `artifacts/v4-8-5-change-audit.json` and final local check |

The full unit run includes Harness checks and all new cases; overlapping subsets are not added as distinct tests. MongoDB/API/process-resume integration, routes, UI and deployment were not rerun: there is no runtime caller, persistence, frontend or deployment change. Their earlier acceptance results are historical, not new V4.8.5 results.

## 13. Results and issues

All recorded tests pass; no existing test was modified or relaxed. Self-review added a primitive-string check for mode before Object.hasOwn, preventing coercion of object values; regression coverage rejects boxed strings and objects without executing their conversion hooks. Counts reject negative/fractional/nonfinite/coercible values and accessor records cannot execute getters. There is no provider-specific branch or unhandled asynchronous path in this synchronous utility.

All 586 existing tests plus 15 new tests pass (601 total). File audit confirms 14 existing Harness files modified, 1,376 baseline files byte-identical, four additions and no removals. Every existing product and test file is unchanged. Determinism and the no-production-integration boundary pass; V4.8.5-AC01 is accepted. The limits of caller-provided classification and uncalibrated weights are retained rather than portrayed as automatic verified reasoning analysis.

## 14. Benchmark

The six hand-authored fixture cases pin A/B/D scoring, cross-market/currency complexity, materials/conflicts and separation of data/provider/format issues from reasoning failures. Results are checked across JSON round trips, key/list ordering, duplicates, explicit unknowns, exact thresholds and maximum contribution bounds. This is deterministic contract coverage, not empirical model-quality calibration or a new unified benchmark platform.

The existing six research-mode cases retain 24 wire/delivery/event/checkpoint hashes; the six Router/Vision cases retain 12 wire/result hashes against their saved executable baselines. Their tests pass without regenerating any previous fixture. Actual models and delivery/citation behavior are not changed by this utility. No live cost, quality, accuracy or performance result is claimed.

## 15. Security/privacy

Only bounded structured categories/counts are accepted, with safe fixed validation errors. No arbitrary job, question, credentials, source text or error object is accepted or echoed. Reasons are stable signal codes and integer contributions, not generated analysis or hidden reasoning. Normalization copies inputs and returns independent values. Ordinary server data is expected; this is not a sandbox for JavaScript proxies. No external data movement or new telemetry.

## 16. Rollback

Remove only the four additions in section 3, restore changed Harness documents/manifest from the V4.8.5 start snapshot and verify hashes. Preserve all previously accepted uncommitted work; do not reset to HEAD. No running code path, database/configuration or historical research data needs rollback.

## 17. Known limitations

- Heuristic weights have not been calibrated against live model quality or production workloads.
- No job-to-signal collector: callers must supply known counts and distinguish companies from listings, conflicts from missing evidence and reasoning failures from other failures.
- Partial scores are known contributions, not complete workload estimates or model capability evidence.
- Currency codes are syntactically validated, not checked against a currency registry or used for FX calculations.
- Production integration, RoutingDecision, telemetry and modelState remain absent.

## 18. Deferred work and stop

V4.8.5 is accepted and CURRENT remains V4.8. V4.8.6 dry-run policy is the next eligible subrelease and requires separate authorization. No candidate/model selection, persistence, price/health routing, escalation, new provider or V4.9/V5.x/V6.0 capability is implemented. Stop at V4.8.5.
