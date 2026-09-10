# H0 Completion Report — ACCEPTED

Release/subrelease: H0.0 → H0.1 → H0.2 → H0.3, all acceptance gates passed. Runtime baseline: b7592abc4b888e218bbdfca958230366919ea3bb. Report date: 2026-09-10.

**Harness calibration and all existing test suites passed. Runtime behavior change = 0; investment-research behavior change = 0. CURRENT=V4.8 is the next-stage entry only; V4.8 was not implemented.**

## 1. 实际检查的主要模块

The tracked inventory covers 418 files: 89 server, 35 shared, 110 frontend, 28 scripts, 97 baseline tests/fixtures/scenario files, 38 active Knowledge files, 14 public assets and 7 root runtime/build/deployment inputs. Lexical imports/exports and SHA-256 are recorded; major runtime paths and tests were inspected directly. This does not claim a line-by-line proof of all semantic behavior.

- Models: routing/request/deadline/stream, research/review/followup completion, path and security intent, Vision/material/visual reading.
- Research: Agent/execution/workflow/context/create/baseline; checkpoints/resume/retry/calculation recovery and public/private state.
- Knowledge: ENTRY/modules catalog/rules, lazy section loading, excerpts, hash/line receipts, snapshots and legacy archives.
- Evidence/data: search/page/disclosure/followup/web fetching, authority and integrity, PDF/OCR/workers, security/SEC/exchange, market/filings/vendor adapters.
- Finance: observations/original-number verification/data-basis/XBRL; deterministic calculations, quick screen, cashflow bridge, normalized earnings, reinvestment, sensitivity, valuation, comparison and shareholder returns.
- Storage/delivery: MongoDB/GridFS, caches, schema and legacy migration, review formats/contracts/references, save-only recovery, SSE/public projections, frontend/shared views.
- Tests: unit, MongoDB, route, UI/scenario imports, Linux deployment; synthetic fixtures and live diagnostic versus future benchmark boundaries.

Full map: [current implementation](../../architecture/current-implementation-map.md). Inventory: [repository-inventory.json](repository-inventory.json).

## 2. 新增文件

- [docs/development/architecture-fitness.md](../../../docs/development/architecture-fitness.md)
- [docs/releases/H0/audit-findings.md](../../../docs/releases/H0/audit-findings.md)
- [docs/releases/H0/completion-report.md](../../../docs/releases/H0/completion-report.md)
- [docs/releases/H0/repository-inventory.json](../../../docs/releases/H0/repository-inventory.json)
- [docs/releases/H0/test-failure-analysis.md](../../../docs/releases/H0/test-failure-analysis.md)
- [tests/harness.test.mjs](../../../tests/harness.test.mjs)

Ignored artifacts contain the baseline hashes/import scan, environment helpers, test logs, screenshots and a timing diagnostic copy. They are test evidence/tools, not new runtime modules or committed Knowledge content.

## 3. 修改文件

290 existing files changed: Harness entry/navigation, architecture/domain status, contract implementation notes, invariant evidence, ADR implementation assessments, H0 specifications/rollback/testing, future-release authorization-versus-acceptance headings and MANIFEST.json; plus the approved deployment-copy correction and three UI test alignment repairs. CURRENT changes only at the successful H0.3 handoff. Full exact list is in Appendix A.

Future-release edits only clarify status/overview authority; no future API/schema/specification behavior is implemented. Existing ADR decision bodies are byte-equivalent after line-ending normalization.

## 4. 删除文件

None. No file, scenario, fixture, business validator, historical research or Knowledge archive was removed. Obsolete presentation assertions in three UI files were migrated to the current UI; finance/Evidence/recovery checks remain intact.

## 5. Current Implementation Map 主要修正

Added missing transport guards/call sites; six-path public execution and context boundaries; current snapshot pinning and exact rule receipts; acquisition/providers/workers; original-number matching limitations; specialized calculation ownership; GridFS/schema/cache distinctions; review/public projection/save-only recovery; frontend/shared modules and every test runner. Diagnostic scripts are not mislabeled as frozen benchmarks.

## 6. CURRENT / PARTIAL / FUTURE 状态修正

- Current resolver, financial observation/verification and math capabilities are explicitly CURRENT; their incomplete canonical entity/Fact/Calculation contracts remain PARTIAL.
- Source/Evidence/Event/ResearchState/Security Master contracts use a single PARTIAL label with precise predecessors; Listing/Issuer/ShareClass canonical entities remain FUTURE.
- Job-scoped Knowledge pinning is existing enforcement; K-Series governance remains FUTURE. Indexing/section loading/excerpts are not reinvented as future work.
- Canonical Model Gateway, hybrid retrieval, Fact Engine, formula/DAG, Claim/Belief, Research IR/State, decision/portfolio/governance and unified benchmark systems remain FUTURE.
- No new DEPRECATED designation. CURRENT activation is authorization only, not implementation acceptance. Future overview groupings cannot override DETAILED_INDEX.

## 7. 架构重叠

Distributed LLM transports; SEC directory/exchange lookups; official/web document reading; shared evidence block identity across retrieval/financial gates; calculation/sensitivity/valuation reuse; Knowledge backup/snapshot/excerpt; checkpoint/retry/delivery recovery; server/shared projections. These have distinct current roles. H0 records integration risks and creates no parallel subsystem. Details: [audit findings](audit-findings.md).

## 8. 文档偏差

H0-D01–D09 cover missing modules, understated Knowledge maturity, mixed statuses, overstated benchmark execution, stale H0 sequence/template text, incomplete test command coverage, omitted deployment shared/ and future activation ambiguity. Future version overview sequences remain historical summaries with explicit normalized-index authority.

## 9. 潜在技术债务

Compatible resume preserves initial data, but rejected checkpoints may restart collection under the same job ID; new followup lacks a universal historical publication cutoff. Original-number matching is not independent Fact verification. Semantic grounding/counter-evidence/injection resistance are not universally proven by structural validators. Pending unsaved delivery is in-memory; TTL caches/GridFS payload retention are not canonical restatement/replay history. Retained GridFS growth needs future lifecycle work.

UI baseline incompatibilities were resolved under the user’s follow-up authorization with test-only selector, copy, setup and synchronization repairs. The full suite passes. Each cause and preserved assertion is detailed in [test failure analysis](test-failure-analysis.md).

## 10. Contracts / Invariants / ADR 修正

All 20 domain contracts now identify current predecessors and future requirements; no persisted shape or financial definition changed. Invariants retain mandatory rules, with executable gates/tests and unproven coverage separated. Public reasoning privacy is marked ENFORCED; Knowledge pinning distinguishes current job enforcement from future release governance. All 15 ADR decisions remain ACCEPTED and unchanged; implementation assessments distinguish CURRENT/PARTIAL/FUTURE. No schema migration or new business contract was introduced.

## 11. 实际运行的测试命令

Environment: Windows PowerShell; Node 24.19.0; pnpm 11.19.0; Vite 6.4.3; existing external Playwright; Edge 152.0.4191.66. MongoDB mongo:8.0 used dedicated container zhiheng-h0-fix-mongo-b7592abc at 127.0.0.1:27028 and UUID temporary databases. Linux deployment ran in docker:27-cli, with temporary bash/coreutils/util-linux and an independent Compose project. No project dependency, lockfile or production configuration changed.

Actual final acceptance commands (all exit 0):

```text
pnpm test
pnpm test:mongodb
node --test tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
pnpm test:routes
pnpm test:ui
bash /source/tests/deploy.integration.sh
node --test tests/harness.test.mjs
node artifacts/h0-verify.mjs
git -c core.safecrlf=false diff --check
```

The deployment command ran inside the disposable Linux container with the repository mounted read-only at /source. MongoDB commands explicitly set MONGODB_URI=mongodb://127.0.0.1:27028. UI_BASE_URL=http://127.0.0.1:5189; UI_ARTIFACT_SUBDIR=h0-ui-acceptance; PLAYWRIGHT_MODULE points to the existing installation. UI_TEST_FILTER was unset for full acceptance. The ignored Vite config excludes docs/tests/artifacts from watching; it does not change the frontend or its API fixtures.

Earlier baseline: node --test --test-reporter=tap "tests/*.test.mjs". Repair diagnostics: pnpm test:ui with a 25-scenario name filter (14/25 then 22/25), then the five related directory scenarios (5/5). These are separate diagnostics, not the final acceptance result.

## 12. 测试数量和结果

| Suite / check | Actual final result | Exit |
|---|---|---|
| Existing unit baseline before H0 edits | 505 passed, 0 failed/skipped | 0 |
| Full unit suite including Harness | 512 passed, 0 failed/skipped | 0 |
| Harness static tests (included in 512) | 7 passed | 0 |
| MongoDB package integration | 7 passed, 0 failed/skipped | 0 |
| Additional Knowledge API + process resume integration | 2 passed, 0 failed/skipped | 0 |
| Route renderer | 5/5 scenarios passed | 0 |
| Full unfiltered UI | 271/271 scenarios passed; same ordered name census as baseline | 0 |
| Linux deployment lifecycle | PASS: deploy, upgrade, persistent data, backup, rollback, health checks, stopped backup, expected build failure and expected migration failure | 0 |
| Runtime/ADR/change boundary | 917 protected files unchanged, accepted ADR bodies unchanged, exact one-list deployment correction | 0 |
| Manifest/navigation/status | 452 packaged files, exact bytes and SHA-256; no self-hash | 0 |

Historical UI failures remain recorded: 248/271 then 249/271 before authorized repairs, both exit 1. The 22 deterministic failures were stale presentation contracts or asynchronous test observations. No scenario was removed or skipped and no runtime patch was used. See [failure analysis](test-failure-analysis.md) for all ten cause groups, intermediate failures and retained validation.

Final local evidence: artifacts/h0-fix-unit.log, h0-fix-mongodb.log, h0-fix-extra.log, h0-fix-routes.log, h0-ui-acceptance.log, h0-ui-acceptance/ui-results.json, h0-fix-deploy.log, h0-handoff-static.log, h0-change-audit.json and h0-acceptance-record.json. Baseline and diagnostic logs/screenshots are retained separately. Artifacts are ignored local evidence; this report preserves counts and conclusions for repository reviewers.

H0 gates: H0.0 inventory/map PASS; H0.1 architecture/contracts/invariants/ADR/navigation calibration PASS; H0.2 static fitness and complete existing test suites PASS; H0.3 zero-runtime audit/report and CURRENT handoff PASS.

## 13. Runtime behavior change

**Runtime behavior change = 0. Investment-research behavior change = 0.** The original starting hashes cover all 917 tracked files outside the explicit Harness and four-file test-repair allowlist, including every server/src/shared file, Knowledge content/archives, dependency/lockfile and runtime/deployment configuration. All protected hashes match. UI fixtures and scenario names are retained; the test diff only changes current UI contracts and bounded synchronization. Deployment assertions remain unchanged.

No API, persisted type/schema, financial definition, model routing, Evidence rule, acquisition behavior or business feature flag changed. New executable code is a test-only Harness checker. No production research or database migration ran.

## 14. CURRENT 最终值

V4.8. Updated from H0 only after all acceptance gates passed. This selects the next-stage entry; it does not certify a V4.8 implementation.

## 15. 下一阶段允许执行的版本

V4.8 in a subsequent task. This task stops immediately after the H0 handoff and its final consistency checks.

## 16. 本轮没有实施 V4.8

Confirmed: no Model Gateway, model profile/catalog, provider adapter migration, policy/health router, escalation, telemetry or V4.9/V5.x/V6.0 capability was implemented. Future-release documentation clarification is not future implementation.

## Compatibility, recovery, security, rollback and deferred work

- Architecture: mapping and fitness coverage only; no runtime ownership or dependencies changed.
- Schema/migrations: none. Existing migrations were tested only on disposable databases/copies.
- Compatibility/resume: runtime/data/Knowledge bytes unchanged; existing resume/cutoff limitations remain explicit in audit findings.
- Environment: temporary loopback MongoDB, Vite and independent Linux deployment containers. Test databases/Compose projects cleaned by their existing teardown; remaining H0 runner containers and Vite are removed/stopped at completion. Docker images/build cache and ignored logs remain as test artifacts. No production config/dependency mutation.
- Feature flags: none added or changed.
- Benchmark: unified benchmark remains FUTURE; existing regressions/deployment checked. No model quality, cost or performance comparison claimed.
- Security/privacy: synthetic integration fixtures only; no real research/model call or trading action. Deployment copies test source/examples, not real .env secrets. Private reasoning policy unchanged.
- Rollback: restore only this H0 Harness/test change set, remove its six added files, and reset CURRENT to H0. Preserve unrelated work and historical data; no database rollback needed.
- Deferred: H0-G01–G10 runtime gaps and all V4.8+ implementations. No parallel subsystem or opportunistic business fix introduced.

## Appendix A — exact modified files

- [AGENTS.md](../../../AGENTS.md)
- [CODEX_EXECUTION_PROTOCOL.md](../../../CODEX_EXECUTION_PROTOCOL.md)
- [HARNESS_README.md](../../../HARNESS_README.md)
- [MANIFEST.json](../../../MANIFEST.json)
- [START_HERE.md](../../../START_HERE.md)
- [benchmark/README.md](../../../benchmark/README.md)
- [benchmark/RED_TEAM_PLAN.md](../../../benchmark/RED_TEAM_PLAN.md)
- [benchmark/contracts/case-schema.md](../../../benchmark/contracts/case-schema.md)
- [docs/adr/ADR-001-evidence-first.md](../../../docs/adr/ADR-001-evidence-first.md)
- [docs/adr/ADR-002-model-gateway.md](../../../docs/adr/ADR-002-model-gateway.md)
- [docs/adr/ADR-003-hybrid-not-vector-only.md](../../../docs/adr/ADR-003-hybrid-not-vector-only.md)
- [docs/adr/ADR-004-point-in-time.md](../../../docs/adr/ADR-004-point-in-time.md)
- [docs/adr/ADR-005-report-not-system-of-record.md](../../../docs/adr/ADR-005-report-not-system-of-record.md)
- [docs/adr/ADR-006-no-agent-swarm-by-default.md](../../../docs/adr/ADR-006-no-agent-swarm-by-default.md)
- [docs/adr/ADR-007-deterministic-financial-math.md](../../../docs/adr/ADR-007-deterministic-financial-math.md)
- [docs/adr/ADR-008-knowledge-not-company-opinion.md](../../../docs/adr/ADR-008-knowledge-not-company-opinion.md)
- [docs/adr/ADR-009-epistemic-typing.md](../../../docs/adr/ADR-009-epistemic-typing.md)
- [docs/adr/ADR-010-research-decision-separation.md](../../../docs/adr/ADR-010-research-decision-separation.md)
- [docs/adr/ADR-011-offline-learning-only.md](../../../docs/adr/ADR-011-offline-learning-only.md)
- [docs/adr/ADR-012-additive-migrations.md](../../../docs/adr/ADR-012-additive-migrations.md)
- [docs/adr/ADR-013-stable-entity-identities.md](../../../docs/adr/ADR-013-stable-entity-identities.md)
- [docs/adr/ADR-014-quality-before-cost.md](../../../docs/adr/ADR-014-quality-before-cost.md)
- [docs/adr/ADR-015-human-override-provenance.md](../../../docs/adr/ADR-015-human-override-provenance.md)
- [docs/adr/README.md](../../../docs/adr/README.md)
- [docs/architecture/00-system-map.md](../../../docs/architecture/00-system-map.md)
- [docs/architecture/01-domain-model.md](../../../docs/architecture/01-domain-model.md)
- [docs/architecture/02-research-lifecycle.md](../../../docs/architecture/02-research-lifecycle.md)
- [docs/architecture/03-data-lifecycle.md](../../../docs/architecture/03-data-lifecycle.md)
- [docs/architecture/04-model-system.md](../../../docs/architecture/04-model-system.md)
- [docs/architecture/05-knowledge-system.md](../../../docs/architecture/05-knowledge-system.md)
- [docs/architecture/06-evidence-fact-system.md](../../../docs/architecture/06-evidence-fact-system.md)
- [docs/architecture/07-calculation-claim-belief.md](../../../docs/architecture/07-calculation-claim-belief.md)
- [docs/architecture/08-forecast-decision-portfolio.md](../../../docs/architecture/08-forecast-decision-portfolio.md)
- [docs/architecture/09-learning-provenance-governance.md](../../../docs/architecture/09-learning-provenance-governance.md)
- [docs/architecture/10-versioning-tracks.md](../../../docs/architecture/10-versioning-tracks.md)
- [docs/architecture/current-implementation-map.md](../../../docs/architecture/current-implementation-map.md)
- [docs/contracts/README.md](../../../docs/contracts/README.md)
- [docs/contracts/assumption.contract.md](../../../docs/contracts/assumption.contract.md)
- [docs/contracts/audit-ledger.contract.md](../../../docs/contracts/audit-ledger.contract.md)
- [docs/contracts/belief.contract.md](../../../docs/contracts/belief.contract.md)
- [docs/contracts/calculation.contract.md](../../../docs/contracts/calculation.contract.md)
- [docs/contracts/claim.contract.md](../../../docs/contracts/claim.contract.md)
- [docs/contracts/decision.contract.md](../../../docs/contracts/decision.contract.md)
- [docs/contracts/event.contract.md](../../../docs/contracts/event.contract.md)
- [docs/contracts/evidence.contract.md](../../../docs/contracts/evidence.contract.md)
- [docs/contracts/fact.contract.md](../../../docs/contracts/fact.contract.md)
- [docs/contracts/failure.contract.md](../../../docs/contracts/failure.contract.md)
- [docs/contracts/forecast.contract.md](../../../docs/contracts/forecast.contract.md)
- [docs/contracts/hypothesis.contract.md](../../../docs/contracts/hypothesis.contract.md)
- [docs/contracts/mandate.contract.md](../../../docs/contracts/mandate.contract.md)
- [docs/contracts/model-gateway.contract.md](../../../docs/contracts/model-gateway.contract.md)
- [docs/contracts/outcome.contract.md](../../../docs/contracts/outcome.contract.md)
- [docs/contracts/portfolio.contract.md](../../../docs/contracts/portfolio.contract.md)
- [docs/contracts/research-ir.contract.md](../../../docs/contracts/research-ir.contract.md)
- [docs/contracts/research-state.contract.md](../../../docs/contracts/research-state.contract.md)
- [docs/contracts/security-master.contract.md](../../../docs/contracts/security-master.contract.md)
- [docs/contracts/source.contract.md](../../../docs/contracts/source.contract.md)
- [docs/development/testing.md](../../../docs/development/testing.md)
- [docs/invariants/README.md](../../../docs/invariants/README.md)
- [docs/invariants/claim-belief.invariants.md](../../../docs/invariants/claim-belief.invariants.md)
- [docs/invariants/decision-portfolio.invariants.md](../../../docs/invariants/decision-portfolio.invariants.md)
- [docs/invariants/evidence.invariants.md](../../../docs/invariants/evidence.invariants.md)
- [docs/invariants/fact-calculation.invariants.md](../../../docs/invariants/fact-calculation.invariants.md)
- [docs/invariants/financial.invariants.md](../../../docs/invariants/financial.invariants.md)
- [docs/invariants/governance.invariants.md](../../../docs/invariants/governance.invariants.md)
- [docs/invariants/knowledge.invariants.md](../../../docs/invariants/knowledge.invariants.md)
- [docs/invariants/model.invariants.md](../../../docs/invariants/model.invariants.md)
- [docs/invariants/point-in-time.invariants.md](../../../docs/invariants/point-in-time.invariants.md)
- [docs/invariants/research.invariants.md](../../../docs/invariants/research.invariants.md)
- [docs/releases/CURRENT](../../../docs/releases/CURRENT)
- [docs/releases/H0/EXECUTE_H0.md](../../../docs/releases/H0/EXECUTE_H0.md)
- [docs/releases/H0/README.md](../../../docs/releases/H0/README.md)
- [docs/releases/H0/implementation.md](../../../docs/releases/H0/implementation.md)
- [docs/releases/H0/rollback.md](../../../docs/releases/H0/rollback.md)
- [docs/releases/H0/subreleases/H0_0-repository-inventory.md](../../../docs/releases/H0/subreleases/H0_0-repository-inventory.md)
- [docs/releases/H0/subreleases/H0_1-harness-control-plane-validation.md](../../../docs/releases/H0/subreleases/H0_1-harness-control-plane-validation.md)
- [docs/releases/H0/subreleases/H0_2-baseline-architecture-fitness.md](../../../docs/releases/H0/subreleases/H0_2-baseline-architecture-fitness.md)
- [docs/releases/H0/subreleases/H0_3-h0-acceptance-current-handoff.md](../../../docs/releases/H0/subreleases/H0_3-h0-acceptance-current-handoff.md)
- [docs/releases/V4.8/README.md](../../../docs/releases/V4.8/README.md)
- [docs/releases/V4.8/subreleases/V4_8_0-llm-call-inventory.md](../../../docs/releases/V4.8/subreleases/V4_8_0-llm-call-inventory.md)
- [docs/releases/V4.8/subreleases/V4_8_1-model-catalog-legacy-profiles.md](../../../docs/releases/V4.8/subreleases/V4_8_1-model-catalog-legacy-profiles.md)
- [docs/releases/V4.8/subreleases/V4_8_10-safe-main-pro-escalation.md](../../../docs/releases/V4.8/subreleases/V4_8_10-safe-main-pro-escalation.md)
- [docs/releases/V4.8/subreleases/V4_8_11-policy-mode-rollout-gate.md](../../../docs/releases/V4.8/subreleases/V4_8_11-policy-mode-rollout-gate.md)
- [docs/releases/V4.8/subreleases/V4_8_2-gateway-request-response-normalization.md](../../../docs/releases/V4.8/subreleases/V4_8_2-gateway-request-response-normalization.md)
- [docs/releases/V4.8/subreleases/V4_8_3-migrate-research-review-followup-calls.md](../../../docs/releases/V4.8/subreleases/V4_8_3-migrate-research-review-followup-calls.md)
- [docs/releases/V4.8/subreleases/V4_8_4-migrate-router-and-vision-calls.md](../../../docs/releases/V4.8/subreleases/V4_8_4-migrate-router-and-vision-calls.md)
- [docs/releases/V4.8/subreleases/V4_8_5-complexity-evaluator-v1.md](../../../docs/releases/V4.8/subreleases/V4_8_5-complexity-evaluator-v1.md)
- [docs/releases/V4.8/subreleases/V4_8_6-dry-run-model-policy.md](../../../docs/releases/V4.8/subreleases/V4_8_6-dry-run-model-policy.md)
- [docs/releases/V4.8/subreleases/V4_8_7-model-usage-telemetry.md](../../../docs/releases/V4.8/subreleases/V4_8_7-model-usage-telemetry.md)
- [docs/releases/V4.8/subreleases/V4_8_8-health-routing-v1.md](../../../docs/releases/V4.8/subreleases/V4_8_8-health-routing-v1.md)
- [docs/releases/V4.8/subreleases/V4_8_9-checkpoint-modelstate-compatibility.md](../../../docs/releases/V4.8/subreleases/V4_8_9-checkpoint-modelstate-compatibility.md)
- [docs/releases/V4.9/README.md](../../../docs/releases/V4.9/README.md)
- [docs/releases/V4.9/subreleases/V4_9_0-vision-call-inventory.md](../../../docs/releases/V4.9/subreleases/V4_9_0-vision-call-inventory.md)
- [docs/releases/V4.9/subreleases/V4_9_1-vision-canonical-request.md](../../../docs/releases/V4.9/subreleases/V4_9_1-vision-canonical-request.md)
- [docs/releases/V4.9/subreleases/V4_9_2-vision-response-normalization.md](../../../docs/releases/V4.9/subreleases/V4_9_2-vision-response-normalization.md)
- [docs/releases/V4.9/subreleases/V4_9_3-remove-concrete-model-name-capability-logic.md](../../../docs/releases/V4.9/subreleases/V4_9_3-remove-concrete-model-name-capability-logic.md)
- [docs/releases/V4.9/subreleases/V4_9_4-vision-benchmark-fixtures.md](../../../docs/releases/V4.9/subreleases/V4_9_4-vision-benchmark-fixtures.md)
- [docs/releases/V4.9/subreleases/V4_9_5-vision-graders.md](../../../docs/releases/V4.9/subreleases/V4_9_5-vision-graders.md)
- [docs/releases/V4.9/subreleases/V4_9_6-vision-challenger-offline.md](../../../docs/releases/V4.9/subreleases/V4_9_6-vision-challenger-offline.md)
- [docs/releases/V4.9/subreleases/V4_9_7-vision-fallback-policy.md](../../../docs/releases/V4.9/subreleases/V4_9_7-vision-fallback-policy.md)
- [docs/releases/V4.9/subreleases/V4_9_8-vision-primary-promotion-gate.md](../../../docs/releases/V4.9/subreleases/V4_9_8-vision-primary-promotion-gate.md)
- [docs/releases/V5.0/README.md](../../../docs/releases/V5.0/README.md)
- [docs/releases/V5.0/subreleases/V5_0_0-benchmark-case-contract.md](../../../docs/releases/V5.0/subreleases/V5_0_0-benchmark-case-contract.md)
- [docs/releases/V5.0/subreleases/V5_0_1-fixture-loader.md](../../../docs/releases/V5.0/subreleases/V5_0_1-fixture-loader.md)
- [docs/releases/V5.0/subreleases/V5_0_10-champion-registry.md](../../../docs/releases/V5.0/subreleases/V5_0_10-champion-registry.md)
- [docs/releases/V5.0/subreleases/V5_0_11-a-b-assignment.md](../../../docs/releases/V5.0/subreleases/V5_0_11-a-b-assignment.md)
- [docs/releases/V5.0/subreleases/V5_0_12-production-champion-rollout.md](../../../docs/releases/V5.0/subreleases/V5_0_12-production-champion-rollout.md)
- [docs/releases/V5.0/subreleases/V5_0_13-model-drift-monitor-baseline.md](../../../docs/releases/V5.0/subreleases/V5_0_13-model-drift-monitor-baseline.md)
- [docs/releases/V5.0/subreleases/V5_0_2-deterministic-graders.md](../../../docs/releases/V5.0/subreleases/V5_0_2-deterministic-graders.md)
- [docs/releases/V5.0/subreleases/V5_0_3-semantic-grader-policy.md](../../../docs/releases/V5.0/subreleases/V5_0_3-semantic-grader-policy.md)
- [docs/releases/V5.0/subreleases/V5_0_4-benchmark-runner.md](../../../docs/releases/V5.0/subreleases/V5_0_4-benchmark-runner.md)
- [docs/releases/V5.0/subreleases/V5_0_5-baseline-snapshot.md](../../../docs/releases/V5.0/subreleases/V5_0_5-baseline-snapshot.md)
- [docs/releases/V5.0/subreleases/V5_0_6-challenger-profile-integration.md](../../../docs/releases/V5.0/subreleases/V5_0_6-challenger-profile-integration.md)
- [docs/releases/V5.0/subreleases/V5_0_7-offline-challenger-run.md](../../../docs/releases/V5.0/subreleases/V5_0_7-offline-challenger-run.md)
- [docs/releases/V5.0/subreleases/V5_0_8-statistical-comparison.md](../../../docs/releases/V5.0/subreleases/V5_0_8-statistical-comparison.md)
- [docs/releases/V5.0/subreleases/V5_0_9-task-classification-for-champion.md](../../../docs/releases/V5.0/subreleases/V5_0_9-task-classification-for-champion.md)
- [docs/releases/V5.1/README.md](../../../docs/releases/V5.1/README.md)
- [docs/releases/V5.1/subreleases/V5_1_0-pricing-schema.md](../../../docs/releases/V5.1/subreleases/V5_1_0-pricing-schema.md)
- [docs/releases/V5.1/subreleases/V5_1_1-pricing-registry-history.md](../../../docs/releases/V5.1/subreleases/V5_1_1-pricing-registry-history.md)
- [docs/releases/V5.1/subreleases/V5_1_10-research-budget-schema.md](../../../docs/releases/V5.1/subreleases/V5_1_10-research-budget-schema.md)
- [docs/releases/V5.1/subreleases/V5_1_11-budget-accounting.md](../../../docs/releases/V5.1/subreleases/V5_1_11-budget-accounting.md)
- [docs/releases/V5.1/subreleases/V5_1_12-budget-aware-retrieval.md](../../../docs/releases/V5.1/subreleases/V5_1_12-budget-aware-retrieval.md)
- [docs/releases/V5.1/subreleases/V5_1_13-peak-off-peak-pricing-support.md](../../../docs/releases/V5.1/subreleases/V5_1_13-peak-off-peak-pricing-support.md)
- [docs/releases/V5.1/subreleases/V5_1_14-cost-observability-ui-api.md](../../../docs/releases/V5.1/subreleases/V5_1_14-cost-observability-ui-api.md)
- [docs/releases/V5.1/subreleases/V5_1_2-usage-normalization.md](../../../docs/releases/V5.1/subreleases/V5_1_2-usage-normalization.md)
- [docs/releases/V5.1/subreleases/V5_1_3-per-call-cost-calculation.md](../../../docs/releases/V5.1/subreleases/V5_1_3-per-call-cost-calculation.md)
- [docs/releases/V5.1/subreleases/V5_1_4-job-cost-aggregation.md](../../../docs/releases/V5.1/subreleases/V5_1_4-job-cost-aggregation.md)
- [docs/releases/V5.1/subreleases/V5_1_5-effective-task-cost.md](../../../docs/releases/V5.1/subreleases/V5_1_5-effective-task-cost.md)
- [docs/releases/V5.1/subreleases/V5_1_6-cache-fingerprint.md](../../../docs/releases/V5.1/subreleases/V5_1_6-cache-fingerprint.md)
- [docs/releases/V5.1/subreleases/V5_1_7-cache-analytics.md](../../../docs/releases/V5.1/subreleases/V5_1_7-cache-analytics.md)
- [docs/releases/V5.1/subreleases/V5_1_8-cache-eligibility-gate.md](../../../docs/releases/V5.1/subreleases/V5_1_8-cache-eligibility-gate.md)
- [docs/releases/V5.1/subreleases/V5_1_9-cost-candidate-ranking.md](../../../docs/releases/V5.1/subreleases/V5_1_9-cost-candidate-ranking.md)
- [docs/releases/V5.10/README.md](../../../docs/releases/V5.10/README.md)
- [docs/releases/V5.10/subreleases/V5_10_0-portfolio-position-schema.md](../../../docs/releases/V5.10/subreleases/V5_10_0-portfolio-position-schema.md)
- [docs/releases/V5.10/subreleases/V5_10_1-exposure-engine-v1.md](../../../docs/releases/V5.10/subreleases/V5_10_1-exposure-engine-v1.md)
- [docs/releases/V5.10/subreleases/V5_10_10-capital-allocation-v1.md](../../../docs/releases/V5.10/subreleases/V5_10_10-capital-allocation-v1.md)
- [docs/releases/V5.10/subreleases/V5_10_11-counterfactual-allocation.md](../../../docs/releases/V5.10/subreleases/V5_10_11-counterfactual-allocation.md)
- [docs/releases/V5.10/subreleases/V5_10_12-portfolio-thesis-ui-api.md](../../../docs/releases/V5.10/subreleases/V5_10_12-portfolio-thesis-ui-api.md)
- [docs/releases/V5.10/subreleases/V5_10_13-portfolio-benchmark.md](../../../docs/releases/V5.10/subreleases/V5_10_13-portfolio-benchmark.md)
- [docs/releases/V5.10/subreleases/V5_10_2-factor-exposure-v1.md](../../../docs/releases/V5.10/subreleases/V5_10_2-factor-exposure-v1.md)
- [docs/releases/V5.10/subreleases/V5_10_3-liquidity-engine.md](../../../docs/releases/V5.10/subreleases/V5_10_3-liquidity-engine.md)
- [docs/releases/V5.10/subreleases/V5_10_4-price-correlation.md](../../../docs/releases/V5.10/subreleases/V5_10_4-price-correlation.md)
- [docs/releases/V5.10/subreleases/V5_10_5-thesis-correlation.md](../../../docs/releases/V5.10/subreleases/V5_10_5-thesis-correlation.md)
- [docs/releases/V5.10/subreleases/V5_10_6-business-relationship-graph-v1.md](../../../docs/releases/V5.10/subreleases/V5_10_6-business-relationship-graph-v1.md)
- [docs/releases/V5.10/subreleases/V5_10_7-macro-regime-state-v1.md](../../../docs/releases/V5.10/subreleases/V5_10_7-macro-regime-state-v1.md)
- [docs/releases/V5.10/subreleases/V5_10_8-hidden-exposure-engine.md](../../../docs/releases/V5.10/subreleases/V5_10_8-hidden-exposure-engine.md)
- [docs/releases/V5.10/subreleases/V5_10_9-risk-budget.md](../../../docs/releases/V5.10/subreleases/V5_10_9-risk-budget.md)
- [docs/releases/V5.11/README.md](../../../docs/releases/V5.11/README.md)
- [docs/releases/V5.11/subreleases/V5_11_0-research-snapshot-manifest.md](../../../docs/releases/V5.11/subreleases/V5_11_0-research-snapshot-manifest.md)
- [docs/releases/V5.11/subreleases/V5_11_1-point-in-time-replay.md](../../../docs/releases/V5.11/subreleases/V5_11_1-point-in-time-replay.md)
- [docs/releases/V5.11/subreleases/V5_11_10-structured-research-diff.md](../../../docs/releases/V5.11/subreleases/V5_11_10-structured-research-diff.md)
- [docs/releases/V5.11/subreleases/V5_11_11-institutional-memory.md](../../../docs/releases/V5.11/subreleases/V5_11_11-institutional-memory.md)
- [docs/releases/V5.11/subreleases/V5_11_12-offline-knowledge-policy-learning.md](../../../docs/releases/V5.11/subreleases/V5_11_12-offline-knowledge-policy-learning.md)
- [docs/releases/V5.11/subreleases/V5_11_2-research-provenance-id.md](../../../docs/releases/V5.11/subreleases/V5_11_2-research-provenance-id.md)
- [docs/releases/V5.11/subreleases/V5_11_3-failure-registry.md](../../../docs/releases/V5.11/subreleases/V5_11_3-failure-registry.md)
- [docs/releases/V5.11/subreleases/V5_11_4-decision-journal.md](../../../docs/releases/V5.11/subreleases/V5_11_4-decision-journal.md)
- [docs/releases/V5.11/subreleases/V5_11_5-outcome-model.md](../../../docs/releases/V5.11/subreleases/V5_11_5-outcome-model.md)
- [docs/releases/V5.11/subreleases/V5_11_6-return-attribution.md](../../../docs/releases/V5.11/subreleases/V5_11_6-return-attribution.md)
- [docs/releases/V5.11/subreleases/V5_11_7-belief-calibration.md](../../../docs/releases/V5.11/subreleases/V5_11_7-belief-calibration.md)
- [docs/releases/V5.11/subreleases/V5_11_8-decision-calibration.md](../../../docs/releases/V5.11/subreleases/V5_11_8-decision-calibration.md)
- [docs/releases/V5.11/subreleases/V5_11_9-research-genealogy.md](../../../docs/releases/V5.11/subreleases/V5_11_9-research-genealogy.md)
- [docs/releases/V5.2/README.md](../../../docs/releases/V5.2/README.md)
- [docs/releases/V5.2/subreleases/V5_2_0-flagship-tier-schema.md](../../../docs/releases/V5.2/subreleases/V5_2_0-flagship-tier-schema.md)
- [docs/releases/V5.2/subreleases/V5_2_1-flagship-eligibility-gate.md](../../../docs/releases/V5.2/subreleases/V5_2_1-flagship-eligibility-gate.md)
- [docs/releases/V5.2/subreleases/V5_2_10-flagship-drift-usage-guard.md](../../../docs/releases/V5.2/subreleases/V5_2_10-flagship-drift-usage-guard.md)
- [docs/releases/V5.2/subreleases/V5_2_2-critical-review-escalation.md](../../../docs/releases/V5.2/subreleases/V5_2_2-critical-review-escalation.md)
- [docs/releases/V5.2/subreleases/V5_2_3-core-conflict-detector.md](../../../docs/releases/V5.2/subreleases/V5_2_3-core-conflict-detector.md)
- [docs/releases/V5.2/subreleases/V5_2_4-judge-input-contract.md](../../../docs/releases/V5.2/subreleases/V5_2_4-judge-input-contract.md)
- [docs/releases/V5.2/subreleases/V5_2_5-judge-output-contract.md](../../../docs/releases/V5.2/subreleases/V5_2_5-judge-output-contract.md)
- [docs/releases/V5.2/subreleases/V5_2_6-judge-validation.md](../../../docs/releases/V5.2/subreleases/V5_2_6-judge-validation.md)
- [docs/releases/V5.2/subreleases/V5_2_7-judge-telemetry.md](../../../docs/releases/V5.2/subreleases/V5_2_7-judge-telemetry.md)
- [docs/releases/V5.2/subreleases/V5_2_8-judge-benchmark.md](../../../docs/releases/V5.2/subreleases/V5_2_8-judge-benchmark.md)
- [docs/releases/V5.2/subreleases/V5_2_9-rare-path-rollout.md](../../../docs/releases/V5.2/subreleases/V5_2_9-rare-path-rollout.md)
- [docs/releases/V5.3/README.md](../../../docs/releases/V5.3/README.md)
- [docs/releases/V5.3/subreleases/V5_3_0-knowledge-inventory-ownership-map.md](../../../docs/releases/V5.3/subreleases/V5_3_0-knowledge-inventory-ownership-map.md)
- [docs/releases/V5.3/subreleases/V5_3_1-rule-id-foundation.md](../../../docs/releases/V5.3/subreleases/V5_3_1-rule-id-foundation.md)
- [docs/releases/V5.3/subreleases/V5_3_10-promote-to-runtime-pipeline.md](../../../docs/releases/V5.3/subreleases/V5_3_10-promote-to-runtime-pipeline.md)
- [docs/releases/V5.3/subreleases/V5_3_11-impact-analysis-rule-decay.md](../../../docs/releases/V5.3/subreleases/V5_3_11-impact-analysis-rule-decay.md)
- [docs/releases/V5.3/subreleases/V5_3_2-constitution-extraction.md](../../../docs/releases/V5.3/subreleases/V5_3_2-constitution-extraction.md)
- [docs/releases/V5.3/subreleases/V5_3_3-ontology-foundation.md](../../../docs/releases/V5.3/subreleases/V5_3_3-ontology-foundation.md)
- [docs/releases/V5.3/subreleases/V5_3_4-knowledge-resolver-v1.md](../../../docs/releases/V5.3/subreleases/V5_3_4-knowledge-resolver-v1.md)
- [docs/releases/V5.3/subreleases/V5_3_5-context-compiler-v1.md](../../../docs/releases/V5.3/subreleases/V5_3_5-context-compiler-v1.md)
- [docs/releases/V5.3/subreleases/V5_3_6-knowledge-linter.md](../../../docs/releases/V5.3/subreleases/V5_3_6-knowledge-linter.md)
- [docs/releases/V5.3/subreleases/V5_3_7-knowledge-regression.md](../../../docs/releases/V5.3/subreleases/V5_3_7-knowledge-regression.md)
- [docs/releases/V5.3/subreleases/V5_3_8-k-series-snapshot.md](../../../docs/releases/V5.3/subreleases/V5_3_8-k-series-snapshot.md)
- [docs/releases/V5.3/subreleases/V5_3_9-knowledge-change-proposal.md](../../../docs/releases/V5.3/subreleases/V5_3_9-knowledge-change-proposal.md)
- [docs/releases/V5.4/README.md](../../../docs/releases/V5.4/README.md)
- [docs/releases/V5.4/subreleases/V5_4_0-source-contract-adapter.md](../../../docs/releases/V5.4/subreleases/V5_4_0-source-contract-adapter.md)
- [docs/releases/V5.4/subreleases/V5_4_1-evidence-contract-normalization.md](../../../docs/releases/V5.4/subreleases/V5_4_1-evidence-contract-normalization.md)
- [docs/releases/V5.4/subreleases/V5_4_2-bm25-lexical-layer.md](../../../docs/releases/V5.4/subreleases/V5_4_2-bm25-lexical-layer.md)
- [docs/releases/V5.4/subreleases/V5_4_3-embedding-provider-index.md](../../../docs/releases/V5.4/subreleases/V5_4_3-embedding-provider-index.md)
- [docs/releases/V5.4/subreleases/V5_4_4-hybrid-fusion.md](../../../docs/releases/V5.4/subreleases/V5_4_4-hybrid-fusion.md)
- [docs/releases/V5.4/subreleases/V5_4_5-reranker.md](../../../docs/releases/V5.4/subreleases/V5_4_5-reranker.md)
- [docs/releases/V5.4/subreleases/V5_4_6-retrieval-planner.md](../../../docs/releases/V5.4/subreleases/V5_4_6-retrieval-planner.md)
- [docs/releases/V5.4/subreleases/V5_4_7-evidence-pack.md](../../../docs/releases/V5.4/subreleases/V5_4_7-evidence-pack.md)
- [docs/releases/V5.4/subreleases/V5_4_8-contradiction-registry.md](../../../docs/releases/V5.4/subreleases/V5_4_8-contradiction-registry.md)
- [docs/releases/V5.4/subreleases/V5_4_9-retrieval-benchmark.md](../../../docs/releases/V5.4/subreleases/V5_4_9-retrieval-benchmark.md)
- [docs/releases/V5.5/README.md](../../../docs/releases/V5.5/README.md)
- [docs/releases/V5.5/subreleases/V5_5_0-security-identity-inventory.md](../../../docs/releases/V5.5/subreleases/V5_5_0-security-identity-inventory.md)
- [docs/releases/V5.5/subreleases/V5_5_1-issuer-security-listing-shareclass-schema.md](../../../docs/releases/V5.5/subreleases/V5_5_1-issuer-security-listing-shareclass-schema.md)
- [docs/releases/V5.5/subreleases/V5_5_10-fact-verification-pipeline.md](../../../docs/releases/V5.5/subreleases/V5_5_10-fact-verification-pipeline.md)
- [docs/releases/V5.5/subreleases/V5_5_11-restatement-revision-engine.md](../../../docs/releases/V5.5/subreleases/V5_5_11-restatement-revision-engine.md)
- [docs/releases/V5.5/subreleases/V5_5_12-fact-conflict-resolver.md](../../../docs/releases/V5.5/subreleases/V5_5_12-fact-conflict-resolver.md)
- [docs/releases/V5.5/subreleases/V5_5_13-fact-lineage-api.md](../../../docs/releases/V5.5/subreleases/V5_5_13-fact-lineage-api.md)
- [docs/releases/V5.5/subreleases/V5_5_2-identifier-resolver-bridge.md](../../../docs/releases/V5.5/subreleases/V5_5_2-identifier-resolver-bridge.md)
- [docs/releases/V5.5/subreleases/V5_5_3-corporate-action-base.md](../../../docs/releases/V5.5/subreleases/V5_5_3-corporate-action-base.md)
- [docs/releases/V5.5/subreleases/V5_5_4-fact-schema-v1.md](../../../docs/releases/V5.5/subreleases/V5_5_4-fact-schema-v1.md)
- [docs/releases/V5.5/subreleases/V5_5_5-metric-ontology-runtime-bridge.md](../../../docs/releases/V5.5/subreleases/V5_5_5-metric-ontology-runtime-bridge.md)
- [docs/releases/V5.5/subreleases/V5_5_6-period-engine.md](../../../docs/releases/V5.5/subreleases/V5_5_6-period-engine.md)
- [docs/releases/V5.5/subreleases/V5_5_7-currency-engine.md](../../../docs/releases/V5.5/subreleases/V5_5_7-currency-engine.md)
- [docs/releases/V5.5/subreleases/V5_5_8-accounting-scope-engine.md](../../../docs/releases/V5.5/subreleases/V5_5_8-accounting-scope-engine.md)
- [docs/releases/V5.5/subreleases/V5_5_9-share-basis-engine.md](../../../docs/releases/V5.5/subreleases/V5_5_9-share-basis-engine.md)
- [docs/releases/V5.6/README.md](../../../docs/releases/V5.6/README.md)
- [docs/releases/V5.6/subreleases/V5_6_0-calculation-inventory.md](../../../docs/releases/V5.6/subreleases/V5_6_0-calculation-inventory.md)
- [docs/releases/V5.6/subreleases/V5_6_1-formula-registry.md](../../../docs/releases/V5.6/subreleases/V5_6_1-formula-registry.md)
- [docs/releases/V5.6/subreleases/V5_6_10-narrative-discipline-checks.md](../../../docs/releases/V5.6/subreleases/V5_6_10-narrative-discipline-checks.md)
- [docs/releases/V5.6/subreleases/V5_6_11-claim-renderer-sidecar.md](../../../docs/releases/V5.6/subreleases/V5_6_11-claim-renderer-sidecar.md)
- [docs/releases/V5.6/subreleases/V5_6_12-claim-calculation-benchmark.md](../../../docs/releases/V5.6/subreleases/V5_6_12-claim-calculation-benchmark.md)
- [docs/releases/V5.6/subreleases/V5_6_2-calculation-record-wrapper.md](../../../docs/releases/V5.6/subreleases/V5_6_2-calculation-record-wrapper.md)
- [docs/releases/V5.6/subreleases/V5_6_3-assumption-registry.md](../../../docs/releases/V5.6/subreleases/V5_6_3-assumption-registry.md)
- [docs/releases/V5.6/subreleases/V5_6_4-claim-schema-v1.md](../../../docs/releases/V5.6/subreleases/V5_6_4-claim-schema-v1.md)
- [docs/releases/V5.6/subreleases/V5_6_5-counter-evidence-support.md](../../../docs/releases/V5.6/subreleases/V5_6_5-counter-evidence-support.md)
- [docs/releases/V5.6/subreleases/V5_6_6-claim-dependency-links.md](../../../docs/releases/V5.6/subreleases/V5_6_6-claim-dependency-links.md)
- [docs/releases/V5.6/subreleases/V5_6_7-dependency-dag-v1.md](../../../docs/releases/V5.6/subreleases/V5_6_7-dependency-dag-v1.md)
- [docs/releases/V5.6/subreleases/V5_6_8-runtime-system-invariants.md](../../../docs/releases/V5.6/subreleases/V5_6_8-runtime-system-invariants.md)
- [docs/releases/V5.6/subreleases/V5_6_9-causal-mechanism-metadata.md](../../../docs/releases/V5.6/subreleases/V5_6_9-causal-mechanism-metadata.md)
- [docs/releases/V5.7/README.md](../../../docs/releases/V5.7/README.md)
- [docs/releases/V5.7/subreleases/V5_7_0-hypothesis-schema.md](../../../docs/releases/V5.7/subreleases/V5_7_0-hypothesis-schema.md)
- [docs/releases/V5.7/subreleases/V5_7_1-hypothesis-evaluation-loop.md](../../../docs/releases/V5.7/subreleases/V5_7_1-hypothesis-evaluation-loop.md)
- [docs/releases/V5.7/subreleases/V5_7_10-research-state-builder.md](../../../docs/releases/V5.7/subreleases/V5_7_10-research-state-builder.md)
- [docs/releases/V5.7/subreleases/V5_7_11-state-renderer.md](../../../docs/releases/V5.7/subreleases/V5_7_11-state-renderer.md)
- [docs/releases/V5.7/subreleases/V5_7_12-research-ir-v1.md](../../../docs/releases/V5.7/subreleases/V5_7_12-research-ir-v1.md)
- [docs/releases/V5.7/subreleases/V5_7_13-decision-readiness-inputs.md](../../../docs/releases/V5.7/subreleases/V5_7_13-decision-readiness-inputs.md)
- [docs/releases/V5.7/subreleases/V5_7_14-calibration-capture.md](../../../docs/releases/V5.7/subreleases/V5_7_14-calibration-capture.md)
- [docs/releases/V5.7/subreleases/V5_7_15-scenario-tree-reservation.md](../../../docs/releases/V5.7/subreleases/V5_7_15-scenario-tree-reservation.md)
- [docs/releases/V5.7/subreleases/V5_7_2-belief-schema.md](../../../docs/releases/V5.7/subreleases/V5_7_2-belief-schema.md)
- [docs/releases/V5.7/subreleases/V5_7_3-uncertainty-taxonomy-runtime.md](../../../docs/releases/V5.7/subreleases/V5_7_3-uncertainty-taxonomy-runtime.md)
- [docs/releases/V5.7/subreleases/V5_7_4-forecast-data-model.md](../../../docs/releases/V5.7/subreleases/V5_7_4-forecast-data-model.md)
- [docs/releases/V5.7/subreleases/V5_7_5-revenue-forecast-v1.md](../../../docs/releases/V5.7/subreleases/V5_7_5-revenue-forecast-v1.md)
- [docs/releases/V5.7/subreleases/V5_7_6-margin-fcf-forecast-v1.md](../../../docs/releases/V5.7/subreleases/V5_7_6-margin-fcf-forecast-v1.md)
- [docs/releases/V5.7/subreleases/V5_7_7-scenario-engine-v1.md](../../../docs/releases/V5.7/subreleases/V5_7_7-scenario-engine-v1.md)
- [docs/releases/V5.7/subreleases/V5_7_8-reverse-valuation.md](../../../docs/releases/V5.7/subreleases/V5_7_8-reverse-valuation.md)
- [docs/releases/V5.7/subreleases/V5_7_9-research-state-schema-v1.md](../../../docs/releases/V5.7/subreleases/V5_7_9-research-state-schema-v1.md)
- [docs/releases/V5.8/README.md](../../../docs/releases/V5.8/README.md)
- [docs/releases/V5.8/subreleases/V5_8_0-event-identity-time.md](../../../docs/releases/V5.8/subreleases/V5_8_0-event-identity-time.md)
- [docs/releases/V5.8/subreleases/V5_8_1-event-classifier-v1.md](../../../docs/releases/V5.8/subreleases/V5_8_1-event-classifier-v1.md)
- [docs/releases/V5.8/subreleases/V5_8_10-continuous-scheduler-v1.md](../../../docs/releases/V5.8/subreleases/V5_8_10-continuous-scheduler-v1.md)
- [docs/releases/V5.8/subreleases/V5_8_11-continuous-coverage-benchmark.md](../../../docs/releases/V5.8/subreleases/V5_8_11-continuous-coverage-benchmark.md)
- [docs/releases/V5.8/subreleases/V5_8_2-event-fact-impact.md](../../../docs/releases/V5.8/subreleases/V5_8_2-event-fact-impact.md)
- [docs/releases/V5.8/subreleases/V5_8_3-materiality-engine-v1.md](../../../docs/releases/V5.8/subreleases/V5_8_3-materiality-engine-v1.md)
- [docs/releases/V5.8/subreleases/V5_8_4-research-delta-schema.md](../../../docs/releases/V5.8/subreleases/V5_8_4-research-delta-schema.md)
- [docs/releases/V5.8/subreleases/V5_8_5-selective-revalidation-planner.md](../../../docs/releases/V5.8/subreleases/V5_8_5-selective-revalidation-planner.md)
- [docs/releases/V5.8/subreleases/V5_8_6-monitoring-metric-links.md](../../../docs/releases/V5.8/subreleases/V5_8_6-monitoring-metric-links.md)
- [docs/releases/V5.8/subreleases/V5_8_7-leading-indicator-registry.md](../../../docs/releases/V5.8/subreleases/V5_8_7-leading-indicator-registry.md)
- [docs/releases/V5.8/subreleases/V5_8_8-thesis-fragility.md](../../../docs/releases/V5.8/subreleases/V5_8_8-thesis-fragility.md)
- [docs/releases/V5.8/subreleases/V5_8_9-research-priority.md](../../../docs/releases/V5.8/subreleases/V5_8_9-research-priority.md)
- [docs/releases/V5.9/README.md](../../../docs/releases/V5.9/README.md)
- [docs/releases/V5.9/subreleases/V5_9_0-investment-mandate-schema.md](../../../docs/releases/V5.9/subreleases/V5_9_0-investment-mandate-schema.md)
- [docs/releases/V5.9/subreleases/V5_9_1-decision-readiness.md](../../../docs/releases/V5.9/subreleases/V5_9_1-decision-readiness.md)
- [docs/releases/V5.9/subreleases/V5_9_10-decision-audit-renderer.md](../../../docs/releases/V5.9/subreleases/V5_9_10-decision-audit-renderer.md)
- [docs/releases/V5.9/subreleases/V5_9_11-decision-benchmark.md](../../../docs/releases/V5.9/subreleases/V5_9_11-decision-benchmark.md)
- [docs/releases/V5.9/subreleases/V5_9_2-expected-return-decomposition.md](../../../docs/releases/V5.9/subreleases/V5_9_2-expected-return-decomposition.md)
- [docs/releases/V5.9/subreleases/V5_9_3-opportunity-set-v1.md](../../../docs/releases/V5.9/subreleases/V5_9_3-opportunity-set-v1.md)
- [docs/releases/V5.9/subreleases/V5_9_4-decision-policy-v1.md](../../../docs/releases/V5.9/subreleases/V5_9_4-decision-policy-v1.md)
- [docs/releases/V5.9/subreleases/V5_9_5-robustness-shocks.md](../../../docs/releases/V5.9/subreleases/V5_9_5-robustness-shocks.md)
- [docs/releases/V5.9/subreleases/V5_9_6-permanent-loss-risk.md](../../../docs/releases/V5.9/subreleases/V5_9_6-permanent-loss-risk.md)
- [docs/releases/V5.9/subreleases/V5_9_7-optionality-separation.md](../../../docs/releases/V5.9/subreleases/V5_9_7-optionality-separation.md)
- [docs/releases/V5.9/subreleases/V5_9_8-decision-sufficiency-stop-rule.md](../../../docs/releases/V5.9/subreleases/V5_9_8-decision-sufficiency-stop-rule.md)
- [docs/releases/V5.9/subreleases/V5_9_9-value-of-information-v1.md](../../../docs/releases/V5.9/subreleases/V5_9_9-value-of-information-v1.md)
- [docs/releases/V6.0/README.md](../../../docs/releases/V6.0/README.md)
- [docs/releases/V6.0/subreleases/V6_0_0-tenant-workspace-ownership-inventory.md](../../../docs/releases/V6.0/subreleases/V6_0_0-tenant-workspace-ownership-inventory.md)
- [docs/releases/V6.0/subreleases/V6_0_1-workspace-tenant-schema.md](../../../docs/releases/V6.0/subreleases/V6_0_1-workspace-tenant-schema.md)
- [docs/releases/V6.0/subreleases/V6_0_10-research-package.md](../../../docs/releases/V6.0/subreleases/V6_0_10-research-package.md)
- [docs/releases/V6.0/subreleases/V6_0_11-zrp-v1.md](../../../docs/releases/V6.0/subreleases/V6_0_11-zrp-v1.md)
- [docs/releases/V6.0/subreleases/V6_0_12-api-mcp-surface.md](../../../docs/releases/V6.0/subreleases/V6_0_12-api-mcp-surface.md)
- [docs/releases/V6.0/subreleases/V6_0_13-worker-queue.md](../../../docs/releases/V6.0/subreleases/V6_0_13-worker-queue.md)
- [docs/releases/V6.0/subreleases/V6_0_14-tenant-safe-continuous-research.md](../../../docs/releases/V6.0/subreleases/V6_0_14-tenant-safe-continuous-research.md)
- [docs/releases/V6.0/subreleases/V6_0_15-production-hardening-dr.md](../../../docs/releases/V6.0/subreleases/V6_0_15-production-hardening-dr.md)
- [docs/releases/V6.0/subreleases/V6_0_2-rbac-v1.md](../../../docs/releases/V6.0/subreleases/V6_0_2-rbac-v1.md)
- [docs/releases/V6.0/subreleases/V6_0_3-audit-ledger.md](../../../docs/releases/V6.0/subreleases/V6_0_3-audit-ledger.md)
- [docs/releases/V6.0/subreleases/V6_0_4-data-classification.md](../../../docs/releases/V6.0/subreleases/V6_0_4-data-classification.md)
- [docs/releases/V6.0/subreleases/V6_0_5-provider-governance.md](../../../docs/releases/V6.0/subreleases/V6_0_5-provider-governance.md)
- [docs/releases/V6.0/subreleases/V6_0_6-human-override-provenance.md](../../../docs/releases/V6.0/subreleases/V6_0_6-human-override-provenance.md)
- [docs/releases/V6.0/subreleases/V6_0_7-human-research-workflow.md](../../../docs/releases/V6.0/subreleases/V6_0_7-human-research-workflow.md)
- [docs/releases/V6.0/subreleases/V6_0_8-research-workbench-shell.md](../../../docs/releases/V6.0/subreleases/V6_0_8-research-workbench-shell.md)
- [docs/releases/V6.0/subreleases/V6_0_9-fact-claim-evidence-drilldown.md](../../../docs/releases/V6.0/subreleases/V6_0_9-fact-claim-evidence-drilldown.md)
- [tests/agent-capabilities-ui-scenarios.mjs](../../../tests/agent-capabilities-ui-scenarios.mjs)
- [tests/deploy.integration.sh](../../../tests/deploy.integration.sh)
- [tests/workflow-ui-scenarios.mjs](../../../tests/workflow-ui-scenarios.mjs)
- [tests/workspace-ui.integration.mjs](../../../tests/workspace-ui.integration.mjs)
