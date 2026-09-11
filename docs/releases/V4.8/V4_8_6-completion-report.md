# V4.8.6 Completion Report — Dry-run Model Policy

## 1. Release / scope

V4.8.6 implements shadow policy recommendations only. CURRENT remains V4.8; V4.8.7 has not started. The accepted V4.8.5 worktree, including earlier uncommitted accepted work, is the baseline: 1,394 tracked/unignored files, HEAD de56872c3718371e086454a291d385f6992bcd24. Actual hashes and rollback copies are in artifacts/v4-8-6-baseline.json and artifacts/v4-8-6-rollback/. Do not reset to HEAD.

Acceptance status: PASS. AC01 is covered by real Gateway observations and six-mode dry-run golden comparisons. Actual model/effort selection and investment research behavior remain unchanged. Opt-in server logging is a runtime observability addition, so total runtime behavior change is not claimed to be zero; default legacy execution retains its behavior.

## 2. Modified files

18 existing files:

- server/agent.mjs — pass known mode/historyYears through the existing completion wrapper.
- server/model-gateway.mjs — opt-in observation with unchanged prepared execution profile/request.
- tests/research-complexity.test.mjs — extend the prior no-caller boundary only for authorized shadow policy; keep all scoring assertions.
- .env.example — document legacy/dry-run, default legacy, unsupported policy fallback.
- MANIFEST.json — refresh Harness hashes, sizes and packaged report count.
- docs/adr/ADR-002-model-gateway.md
- docs/adr/ADR-014-quality-before-cost.md
- docs/architecture/00-system-map.md
- docs/architecture/04-model-system.md
- docs/architecture/current-implementation-map.md
- docs/contracts/model-gateway.contract.md
- docs/invariants/model.invariants.md
- docs/releases/V4.8/DETAILED_INDEX.md
- docs/releases/V4.8/README.md
- docs/releases/V4.8/migration.md
- docs/releases/V4.8/rollback.md
- docs/releases/V4.8/schema.md
- docs/releases/V4.8/subreleases/V4_8_6-dry-run-model-policy.md

## 3. New files

- server/model-policy.mjs
- tests/model-policy.test.mjs
- docs/releases/V4.8/V4_8_6-completion-report.md

Ignored snapshots, temporary audit helpers and test logs under artifacts/v4-8-6-* are local verification assets, not product additions.

## 4. Removed files

None. No tests, fixtures, historical reports or golden baselines were deleted or overwritten.

## 5. Architecture / inspected owners

Inspected AGENTS/protocol, active detailed spec, architecture/maps, Model Gateway contract, model/research/evidence invariants, ADR-002/012/014, release acceptance and real Catalog/Gateway/adapter/routing/stream/Agent/execution/path/Vision/followup owners. Existing tests and the pure evaluator were inspected before adding policy; no existing equivalent policy was found. Deployment env_file already forwards server environment; no deployment change is needed.

The new policy owner reuses evaluateResearchComplexity unchanged. It calculates candidate MAIN/PRO plus low/high/max while Gateway continues to execute its existing explicit/purpose-selected legacy profile. Agent forwards only existing job mode and planned historyYears; it neither chooses slots nor classifies failures. Router/Vision receive no research-tier candidate. Catalog, adapter, connection guards and stream parser are byte-identical to baseline. No parallel execution subsystem is created.

Map/contract/invariant/ADR updates separate CURRENT shadow observation from FUTURE executable slots, health, persistent telemetry/state and rollout. Original ADR decisions and ENFORCED research/Evidence constraints are unchanged. The spec's generic modelState/persistence language is calibrated to V4.8.7/.9 ownership; none is implemented prematurely.

## 6. Schema

Internal/log RoutingDecision schemaVersion 1 and policyVersion 1 only: actual execution profile/effort, purpose, shadow mode, normalized complexity, candidate and reason codes. No public Gateway response/API, database schema, checkpoint, framework 4.7 or research contract 7 change. Omitted effort and unknown signals remain null. Candidate slots have no executable profile binding.

## 7. Migrations

None. Existing configuration and research/checkpoint records remain valid. No backfill, schema version increment, historical rewriting, source refresh or Knowledge modification.

## 8. Environment

Windows PowerShell, Node 24.19.0, pnpm 11.19.0. Project dependency manifest/lock and actual .env remain unchanged. Only .env.example documents the optional flag. Temporary MongoDB mongo:8.0 ran as zhiheng-v486-test-mongo on loopback 27029 with random test databases; no real research database was connected. Tests dropped their temporary databases, and the container was stopped and automatically removed after verification. Initial sandbox-only Docker inspection failed with daemon permission denied; the scoped isolated test container was then started through approved escalation. This was an environment permission issue, not a test failure or skipped case.

## 9. Compatibility / behavior

Legacy is the default; empty, unknown and unsupported policy settings also use legacy without observation. Dry-run preserves actual model, explicit profile, reasoning parameters, request bodies, private tool continuation, results, events and checkpoints. No MAIN/PRO candidate reaches the adapter or changes validation/budgets. Default logs contain only normalized safe metadata, with no prompt, reasoning, source body, credentials, URL or concrete model name.

Decisions record prepared attempts before adapter validation, not confirmed dispatch or success. Format negotiation may record multiple attempts; provider retries keep the original policy observation. Best-effort sink failures are suppressed and rejected promises consumed without awaiting; they cannot fail/replay the call. Sinks are trusted server code, not a sandbox for arbitrary JavaScript. No latency equivalence claim is made for the optional logging overhead.

## 10. Resume / recovery / point-in-time

No job/checkpoint/modelState mutation or pinning. Pending tools, evidence, cutoff and original snapshots remain governed by existing owners. Golden checkpoint comparisons and real-process exit/resume tests cover legacy and dry-run. Unknown historical signals are not fabricated; mode/history come from the existing job/plan, not refreshed sources.

## 11. Feature flag

MODEL_ROUTING_MODE=legacy (default) or dry-run. No policy execution flag, health switch, new model or tier binding is enabled. The default sink is a JSON server-console record; custom factory onRoutingDecision is internal only. Removing the flag or setting legacy disables observations immediately for subsequent calls.

## 12. Actual test commands

Logs are under artifacts/ with the indicated v4-8-6 prefix. Commands used:

```text
pnpm test                                      # baseline-unit.log; final unit.log
node --test tests/model-policy.test.mjs tests/research-complexity.test.mjs tests/model-migration.test.mjs tests/model-call-inventory.test.mjs
pnpm test:mongodb                              # MONGODB_URI=127.0.0.1:27029
node --test tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
node --test tests/research-resume.integration.mjs  # MODEL_ROUTING_MODE=dry-run; isolated MongoDB
pnpm test:routes
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
git -c core.safecrlf=false diff --check
node artifacts/v4-8-6-audit.mjs
```

No test filters, skips, changed Evidence/review/financial assertions or overwritten goldens. UI and Linux deployment tests were not rerun: no frontend, HTTP payload, dependencies, deployment, migrations or storage implementation changed. Earlier passing UI/deploy evidence is historical and is not counted as this stage's execution.

## 13. Actual results

| Verification | Actual result |
|---|---|
| Baseline unit suite | 601 passed |
| Initial targeted subset | 52 passed, before adding the HTTP-failure regression |
| Final full unit suite | 77 files, 616 passed; includes all 15 new policy tests and 7 Harness tests |
| MongoDB integration | 7 passed |
| Knowledge API + real-process resume | 2 passed |
| Additional dry-run real-process resume | 1 passed (same resume case with flag enabled) |
| Routes | 5/5 rendered successfully |
| Final standalone Harness | 7 passed; 463 packaged file hashes/sizes match |
| Model-call inventory | 1 provider adapter, 4 production owners, 10 semantic callers, 1 migrated diagnostic; historical hashes verified |
| Whitespace/diff check | exit 0 |
| File hash audit | 18 changed, 3 added, 0 removed; 1,376 baseline files byte-identical |

All test commands exited 0 with zero failures/cancellations/skips/todos. Subset and standalone Harness results overlap the full suite and must not be added as unique tests. No failing test required a business fix. The only changed pre-existing test is the explicitly authorized complexity-consumer architecture check; all earlier functional assertions, fixtures and golden digests remain intact. Financial/Evidence/Knowledge/acquisition implementations, dependencies, lock, deployment files, and prior completion reports are byte-identical to the saved baseline. Logs: baseline-unit, targeted, unit, mongodb, api-resume, dry-resume, routes, inventory, harness and change-audit under artifacts/v4-8-6-*.

## 14. Benchmark evidence

Six original research mode cases compare all request/result/event/checkpoint hashes (24 pinned digests) with dry-run enabled. These prove synthetic baseline parity, including tool/private history and reviewed delivery. Existing router/Vision baseline comparisons remain unchanged. No live provider quality, cost, latency or Champion benchmark is claimed. Shadow candidate quality is uncalibrated and cannot authorize production rollout.

## 15. Security / privacy

No new network destination, credentials, provider identity inference or public/private reasoning exposure. Observation logs omit job IDs and raw research content; they do contain coarse mode/horizon/workload metadata, so existing server-log access controls apply. Logging failures are observational only; strict completion, refusal, request bounds, private continuation and financial/Evidence validation stay intact. No persistent model or research data is added.

## 16. Rollback

Set MODEL_ROUTING_MODE=legacy or remove the variable to stop observation; actual execution is already legacy. For code rollback, restore exactly the 18 modified files from the saved accepted-worktree snapshot and remove only the three additions above. Keep prior accepted uncommitted work, Knowledge, evidence and historical records. No database/runtime migration or data deletion is needed. Legacy/dry-run parity and disabled/unknown-mode tests validate the flag fallback.

## 17. Known limitations / debt

- Raw score thresholds are exactly 0–3 MAIN/low, 4–7 MAIN/high, 8–10 PRO/high, ≥11 PRO/max; Mode A caps MAIN/low per MG-004. V4.8.5 uses a 0–100 heuristic with B=8, so B plus five years=12 already saturates PRO/max. No conversion was specified; accepted weights and required thresholds are preserved and this mismatch is explicit calibration debt.
- Only mode/historyYears are collected automatically. Company identity, markets/currencies, material workload, valuations, conflicts and separately classified failures remain unknown unless supplied explicitly through the internal API. Missing/provider/format counts cannot inflate score; all-scoring-unknown yields no candidate.
- Candidate slots/efforts are recommendations, not certified or executable capabilities. No production tier switching, quality/health/cost order implementation or hidden-state cross-provider safety is implied.
- Logs are best effort prepared-attempt records, with no durable correlation/retention/ModelCall usage accounting. Invalid signals produce a safe null candidate. Full job-to-signal mapping and reliable failure classification remain deferred.
- Static boundaries are lexical evidence, not whole-program proof against arbitrary dynamic execution. Synthetic parity does not measure live investment research quality.

## 18. Deferred work / stop

V4.8.7 usage persistence, V4.8.8 health, V4.8.9 modelState, V4.8.10 escalation and V4.8.11 quality-gated rollout remain FUTURE. No V4.9/V5.x/V6.0 work. CURRENT final value is V4.8; the next subrelease eligible for separate authorization is V4.8.7. Stop after V4.8.6 verification and report; do not start it automatically.
