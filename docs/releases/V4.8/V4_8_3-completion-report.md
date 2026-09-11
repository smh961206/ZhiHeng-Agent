# V4.8.3 Completion Report — research/review/followup migration

Date: 2026-09-10. CURRENT remains V4.8; runtime/Knowledge remains 4.7, contract version 7. **V4.8.3 implementation and scoped acceptance are complete. The authorized Linux deployment regression passed; V4.8.4 is not started.**

## 1. Release and baseline

Scope: V4.8.3 only. The starting HEAD is `de56872c3718371e086454a291d385f6992bcd24` (V4.8.1), but the actual starting worktree includes accepted, uncommitted V4.8.2 implementation and both reviews. All of that work is preserved. Before editing, hashes and rollback copies of all 1,381 tracked/unignored files were captured in `artifacts/v4-8-3-baseline.json` and `artifacts/v4-8-3-rollback/`. HEAD alone is not the correct rollback target.

The baseline unit suite passed 560 tests. AC01 passes: migrated business modules contain no direct provider endpoint. The current inventory has three unmigrated production transports plus one Gateway adapter and ten semantic callers. Original acceptance included 570 unit tests, 9 database/API/process-resume tests, 5 route scenarios, a complete 271-scenario UI rerun, six-mode golden comparisons, static checks and the Linux deployment regression. The first scoped review passed 572 unit tests (section 19); the second passes 574 (section 20). Each review records its distinct verification scope. This accepts V4.8.3, not the entire V4.8 release.

## 2. Modified files in this subrelease

- `server/agent.mjs`: replace the direct transport with a thin Gateway wrapper; explicit review/followup purposes; preserve negotiation, total deadline, progress notices and private continuation.
- `server/model-gateway.mjs`: safe synchronous lifecycle callbacks; factory-only legacy-text compatibility.
- `server/model-adapter.mjs`: forward existing retry/activity/heartbeat signals and the scoped JSON compatibility option.
- `tests/model-gateway.test.mjs`: subsequent review adds buffered-callback cancellation regression coverage.
- `server/model-gateway-result.mjs`: safe translation to existing Agent recovery error codes.
- `server/model-stream.mjs`: optional missing JSON finish metadata compatibility; default strict and existing SSE rules remain unchanged.
- `scripts/check-model-call-inventory.mjs`, `tests/model-call-inventory.test.mjs`: enforce migrated Agent/Gateway boundaries, maintain historical metadata checks and reject router/Vision migration or adapter bypass.
- `tests/fixtures/research-review.mjs`, `tests/model-request.test.mjs`, `tests/model-deadline.test.mjs`: load synthetic test credentials needed by Gateway's existing key preflight; assertions are unchanged.
- `tests/agent-capabilities.test.mjs`: explicitly set the existing unavailable-Vision fixture to disabled; retain all original assertions, including unavailable and exhausted-budget branches.
- `docs/architecture/00-system-map.md`, `04-model-system.md`, `current-implementation-map.md`: update actual ownership and remaining direct transports.
- `docs/contracts/model-gateway.contract.md`, `docs/invariants/model.invariants.md`, `docs/adr/ADR-002-model-gateway.md`: current compatibility/implementation evidence, without reversing decisions or obligations.
- `docs/releases/V4.8/README.md`, `DETAILED_INDEX.md`, `schema.md`, `migration.md`, `rollback.md`, `subreleases/V4_8_3-migrate-research-review-followup-calls.md`: actual release scope, progress and acceptance evidence.
- `MANIFEST.json`: refresh current packaged hashes and include this report.

## 3. New files

- `tests/model-migration.test.mjs`: six golden mode cases and six boundary/deadline/compatibility cases, including subsequent waiting/format-callback regressions.
- `tests/fixtures/model-migration-scenario.mjs`: deterministic synthetic workload shared by pre-migration capture and current regressions.
- `tests/fixtures/model-migration-baseline.json`: outputs captured from the saved pre-migration executable owner, not generated expectations from the new implementation.
- `tests/fixtures/model-env.mjs`: synthetic credential preparation for mocked model calls.
- `docs/releases/V4.8/V4_8_3-completion-report.md`: this report.

Ignored `artifacts/v4-8-3-*` snapshots, helpers and logs are local audit/test evidence, not product modules. No new runtime subsystem is added.

## 4. Removed files

None. Agent's inline endpoint implementation is replaced, not retained as a parallel client. No test is removed or skipped; no Evidence/financial/review assertion is relaxed. Historical H0/V4.8.0/V4.8.2 inventories and completion reports remain untouched by this subrelease.

## 5. Architecture and inspected owners

Inspected Agent execution, routing/Catalog, Gateway/adapter/result, request retry, deadline, stream parser, review-format/research-output/references, evidence-followup, valuation-review, research context/resume/recovery, path/intent/Vision, safe environment template and affected tests. Read the system/current implementation maps, active release, Model Gateway contract, model/research/Evidence invariants and ADR-002/012/014.

Research and forced draft, independent/supplemental review, and evidence-followup assessment now use the same existing Gateway adapter with research/review/followup purposes. Evidence followup's assess callback resides in Agent, so no second client belongs in evidence-followup. Valuation review is deterministic and remains unchanged. The wrapper retains business format negotiation and existing recovery codes; model configuration/provider behavior stays behind Gateway. No policy routing, provider change or parallel parser/orchestrator is introduced.

## 6. Schema

No persistent schema/version, research payload, public HTTP API or checkpoint/modelState change. Lifecycle callbacks and compatibility are internal in-memory API additions. Gateway metadata is not newly persisted. Unknown finish/usage/pricing values remain unknown.

## 7. Migration

Code migration only: replace the existing Agent endpoint with Gateway; reuse its completion signature for existing callers. No database/index/backfill/environment migration. No router/Vision call migration. The generic specification's modelState and persistent routing/usage text was corrected to its owning V4.8.9/V4.8.7 subreleases.

## 8. Environment

Node 24.19.0 / pnpm 11.19.0 on Windows. No project dependency, lockfile, production config or environment template change. Model tests use synthetic credentials and mocked fetch; no live model calls or real financial research are performed.

MongoDB used temporary container `zhiheng-v483-test-mongo`, image mongo:8.0, loopback port 27029 and existing tests' UUID database names. It was stopped and automatically removed after testing. Port 27017's existing service was not used. UI used loopback Vite on 5193, existing external Playwright and Edge, with UI_TEST_FILTER unset; `artifacts/h0-vite.config.mjs` excluded test/report artifacts from file watching. The UI server was stopped after the run.

After explicit user approval of the Docker socket mount, deployment ran in temporary container `zhiheng-v483-deploy-test` using docker:27-cli with temporary bash/coreutils/util-linux. The repository was mounted read-only at /source; the unchanged test script copied runtime files into mktemp and used independent Compose project `zhiheng-deploy-test-1789032144-1`. The runner, test containers, volumes and network were removed on exit. Generated build/backup image tags and build cache are retained by the existing test workflow; no broad image pruning was performed. No production service was redeployed.

## 9. Compatibility and runtime impact

Runtime transport changes are intentional: Agent now dispatches through Gateway. Existing investment-research rules, financial definitions, Evidence requirements, Knowledge content, data collection, tool execution, review/validation and public delivery are unchanged.

Legacy model/base/key, stream/tool/format payloads and default thinking are preserved. One logical completion freezes its connection across format attempts, as before. Format fallback preserves the evidence packet and does not consume validation-repair budgets. An outer idle/total deadline spans negotiation; keepalive does not extend the total. Network retries remain pre-response only; partial streams are never replayed.

`compatibility: 'legacy-text'` accepts omitted/null finish_reason only in non-stream text JSON, matching the existing compatible response behavior. It retains unknown finishReason and validates message/tool/refusal shape. Default Gateway, SSE completion, explicit malformed/truncated/refused responses and business validation remain strict. Missing credentials now fail before dispatch; unsafe URLs/redirects and malformed responses also fail closed. This is not a claim of zero runtime behavior change across invalid configurations/responses.

## 10. Resume/recovery, cutoff and provenance

Existing private reasoning/tool messages are retrieved explicitly from Gateway and remain in the existing private checkpoint path; they do not enter public events or results. No cross-provider switch or model-state pin is introduced. Original research cutoff, evidence, completed tool receipts, Knowledge snapshots, review attempts and followup budget remain unchanged.

Six-mode full checkpoint hashes match the saved V4.8.2 owner. Actual MongoDB process-exit/resume tests passed: completed tools are not repeated, original private reasoning/Knowledge usage survives, and the resumed job reaches reviewed delivery without recollection. Existing privacy checks on list summaries remain intact.

## 11. Feature flags

None. MODEL_ROUTING_MODE is not implemented; it belongs to later policy rollout. Current work retains fixed legacy selection. Rollback is code restoration to the actual V4.8.2 worktree, not a nonexistent configuration switch.

## 12. Tests executed

| Command | Actual result | Evidence |
|---|---|---|
| `pnpm test` before changes | 560 pass / 0 fail, cancelled, skipped or todo | `artifacts/v4-8-3-baseline-unit.log` |
| `node --test tests/agent.test.mjs tests/review-format.test.mjs tests/model-request.test.mjs tests/model-deadline.test.mjs tests/model-gateway.test.mjs tests/streaming.test.mjs tests/research-resume.test.mjs tests/evidence-followup.test.mjs` | 75 pass / 0 fail/skipped; exit 0 | `artifacts/v4-8-3-first-targeted.log` |
| `node --test tests/model-call-inventory.test.mjs` | 11 pass after correcting a checker syntax typo; exit 0 | `artifacts/v4-8-3-inventory-tests-fixed.log` |
| `pnpm test` initial migrated run | 559 pass / 1 fail; unavailable-Vision fixture depended on absent analysis credentials | `artifacts/v4-8-3-unit-initial.log` |
| `pnpm test` final run | 74 files / 570 pass / 0 fail, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-3-unit-final.log` |
| `pnpm test` after deployment acceptance/document refresh | 74 files / 570 pass / 0 fail, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-3-acceptance-unit.log` |
| `node --test tests/model-migration.test.mjs tests/agent-capabilities.test.mjs` | 20 pass / 0 fail/skipped after explicit fixture setup; exit 0 | `artifacts/v4-8-3-migration-tests.log` |
| `pnpm test:mongodb` with MONGODB_URI on port 27029 | 7 pass / 0 fail/skipped; exit 0 | `artifacts/v4-8-3-mongodb.log` |
| `node --test tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs` with the same isolated service | 2 pass / 0 fail/skipped; exit 0 | `artifacts/v4-8-3-extra-integration.log` |
| `pnpm test:routes` | 5 route-render scenarios pass; exit 0 | `artifacts/v4-8-3-routes.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 4 production transports / 10 callers / 1 diagnostic / 1 Gateway adapter / 1 migrated owner; historical hashes verified; exit 0 | `artifacts/v4-8-3-inventory.log` |
| `node artifacts/v4-8-3-golden.mjs --baseline` and current runner | All six modes' canonical request/result/event/checkpoint hashes match | `artifacts/v4-8-3-golden-baseline.json`, `artifacts/v4-8-3-golden-current.json` |
| `pnpm test:ui` first run | 270/271 passed; one initial workbench-load timeout before image assertions; exit 1 | `artifacts/v4-8-3-ui.log`, `artifacts/v4-8-3-ui/ui-results.json` |
| `pnpm test:ui` full rerun | 271/271 passed, no scenario filter or timeout/assertion change; exit 0 | `artifacts/v4-8-3-ui-final.log`, `artifacts/v4-8-3-ui-final/ui-results.json` |
| `node --test tests/harness.test.mjs` | Final documentation and 460-file manifest check: 7 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-3-harness-final.log` |
| `git -c core.safecrlf=false diff --check` | No whitespace errors; exit 0 | Final local command result |
| `bash tests/deploy.integration.sh` through the approved temporary Linux container | Passed deployment, upgrade, persistent data, backup, rollback, health checks, stopped backup, build-failure and migration-failure assertions; exit 0 | `artifacts/v4-8-3-deploy.log`; approval history in `artifacts/v4-8-3-deploy-approval.txt` |

Repeated subsets are not added together as distinct tests. The full unit run includes the seven Harness tests; the final Harness-only run verifies the subsequent report/manifest edits.

## 13. Results and failure analysis

The static checker initially contained an unescaped slash in a new regular expression; the module failed to parse before assertions ran. Replacing that expression with exact import-string counting fixed it. All original negative checks remain, updated to the migrated dispatch owner and strengthened against direct calls/adapter bypass.

The first full migrated unit run found one test setup failure: providing the synthetic analysis key also enables legacy Vision fallback, whereas the missing-page test implicitly expected an unavailable Vision service. The test now explicitly injects `enabled: () => false` for that branch. All original unavailable, page-identity and budget assertions remain; no product Vision behavior changed.

Golden comparisons initially differed solely because normalized assistant messages reorder object keys. Hashing now sorts object keys recursively; every value and all array ordering remain compared. The baseline was recaptured from the saved old executable using the same canonicalizer; all six modes match. No actual field value is omitted or sanitized from that comparison.

The first full UI run passed 270/271 scenarios. `reference-image-backend-320` timed out after the unchanged 10-second wait for `.research-workbench`; its screenshot was blank, with zero fixture API calls, no blocked requests, no page errors and no asset errors. Its 1440-width counterpart passed. Timestamp checks place the screenshot at 16:55:17 and the dev-server's script-edit-triggered reload at 16:57:04; that later reload cannot explain this timeout. The immediate failure is browser workbench initialization, before the image/Gateway paths, but the underlying startup trigger is not established from the available logs. Frontend/shared code is byte-identical and this suite uses in-memory APIs rather than the migrated backend. With source/script edits stopped, a second complete unfiltered run uses the same timeout and assertions. The initial failure is retained rather than erased or represented as a repaired product defect.

Original acceptance unit result: all 560 existing tests plus 10 new migration tests passed (570 total), with no failures, cancellations, skips or todo. Existing test setup changes are listed explicitly above. That acceptance file hash audit confirmed 24 existing worktree files changed, 1,357 remained byte-identical, five files were added and none removed. Protected financial/Evidence/Knowledge/collection/router/Vision/runtime configurations and old completion reports were unchanged. V4.8.3 final acceptance is complete; section 19 records the subsequent review delta and current results.

The complete UI rerun passed all 271 scenarios, including `reference-image-backend-320` in 1,671 ms. No UI code, timeout or assertion was changed between runs. This establishes the final full-suite result; it does not retrospectively establish the first timeout's underlying cause. That unreproduced startup failure remains a known test-environment diagnostic limitation.

Deployment exited 0 and printed the script's full PASS marker before successfully cleaning up the isolated project. Error output from the deliberately injected failing Dockerfile build and migration script is expected: the suite verifies that failed builds do not interrupt the running app, and a failed migration leaves the app stopped without replacing the recorded previous image. Those messages are successful fault-injection coverage, not unresolved failures.

## 14. Benchmark

The reproducible synthetic gate runs A–F modes against the saved pre-migration owner and current owner with the same fixed time, model configuration and responses. Each mode executes a tool call, private reasoning continuation, draft and independent review. All 24 hashes (wire, result, events and checkpoints × six modes) match. Full existing financial/review/Evidence tests provide broader deterministic regression coverage.

This is a transport/delivery compatibility gate, not a live model quality, cost or factual-accuracy benchmark. No model policy/tier/provider selection changes. Live provider variance and long-run production performance are not measured or claimed.

## 15. Security/privacy

Gateway retains private continuation separation, safe public errors, bounded/cancellable reads, URL guards and image/tool capability gates. New callbacks pass only safe lifecycle data. Error translation does not reattach provider body, credential or original cause. Request/response hashes use synthetic inputs; no real research data is exported.

Approval history: automatic approval review initially rejected the host Docker socket mount because it grants broad Docker administration capability. No workaround was used. The user then explicitly approved this exact mount and existing deployment-test action; the approved run completed in its own temporary Compose project. Approval is specific to this verification, not permission to modify unrelated containers/images/volumes.

## 16. Rollback

Restore only files listed in section 2 from the captured V4.8.2 worktree, remove only this subrelease's five additions, then restore the corresponding manifest. Preserve all pre-existing V4.8.2 changes; a reset to HEAD would lose that work. The saved old executable remains runnable and produced the matching golden baseline. No DB/config/schema migration or data rollback is required. Do not delete research, Evidence or historical checkpoints.

## 17. Known limitations

- Deployment validation covers the unchanged repository test's synthetic build/upgrade/backup/rollback/failure cases; it is not a live production rollout.
- Full unit, database, route, golden, UI and final Harness outcomes are recorded above. The first UI startup timeout was not reproduced in the full rerun; its exact underlying trigger remains undetermined and is not claimed fixed.
- No live-provider quality/cost certification or production load benchmark.
- Compatibility is limited to missing JSON finish metadata; canonical Gateway remains strict and other malformed responses fail closed.
- Router/Vision still use direct legacy transports. Global provider-independent policy and cross-provider state compatibility remain incomplete.

## 18. Deferred work and stop

V4.8.3 is accepted and this task stops here. V4.8.4 is the next subrelease and requires separate user authorization; it has not started. Router/Vision migration, policy/complexity/health, persistent usage, modelState, escalation and rollout flags remain with their later subreleases. No V4.9/V5.x/V6.0 capability is implemented. CURRENT remains V4.8.

## 19. Subsequent V4.8.3 review — 2026-09-10

Two reproducible defects were corrected within the existing transport owners:

- **Waiting callback protection:** Agent's heartbeat bridge discarded the return value of onWaiting. A promise escaped Gateway's synchronous callback guard, so an asynchronous rejection could become an unhandled process error. Returning that value through the bridge restores the existing callback_error contract. The regression exercises both resolving and rejecting async callbacks, including reader cleanup.
- **Cancellation during buffered notifications:** Gateway checked cancellation around body reads and after parsing, but callbacks within a single buffered payload could continue after an earlier callback cancelled the request. The adapter now checks immediately before and after each content/activity/heartbeat callback. Regressions cover JSON and single-chunk SSE, all applicable cancellation points, one transport attempt and stream cleanup. Parsing and financial/Evidence validation are not weakened.

The new tests first failed against the accepted implementation: 32 passed / 2 failed in `artifacts/v4-8-3-review-repro.log` (exit 1). The waiting test observed a successful completion instead of callback_error; the cancellation test observed onDelta after onActivity had aborted. Both now pass. All pre-existing assertions and the pinned pre-migration golden fixture remain unchanged.

Review-only modified files: `server/agent.mjs`, `server/model-adapter.mjs`, `tests/model-gateway.test.mjs`, `tests/model-migration.test.mjs`, `docs/contracts/model-gateway.contract.md`, `docs/architecture/current-implementation-map.md`, this report and `MANIFEST.json`. Eight existing files changed; no tracked/unignored file was added or removed. The 1,386-file review-start hashes and byte copies are retained in ignored `artifacts/v4-8-3-review-baseline.json` and `artifacts/v4-8-3-review-rollback/`. Original V4.8.2/V4.8.3 baselines are preserved.

| Executed command | Review result | Evidence |
|---|---|---|
| `node --test tests/model-migration.test.mjs tests/model-gateway.test.mjs tests/model-deadline.test.mjs tests/model-request.test.mjs tests/review-format.test.mjs` | Before edits: 57 passed, exit 0 | `artifacts/v4-8-3-review-baseline.log` |
| `node --test tests/model-migration.test.mjs tests/model-gateway.test.mjs tests/model-deadline.test.mjs tests/model-request.test.mjs tests/review-format.test.mjs tests/streaming.test.mjs tests/research-resume.test.mjs tests/evidence-followup.test.mjs tests/model-call-inventory.test.mjs` | After fixes: 94 passed, exit 0 | `artifacts/v4-8-3-review-targeted.log` |
| `pnpm test` | 74 files / 572 passed; 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-3-review-unit.log` |
| `pnpm test:routes` | All 5 route scenarios passed; exit 0 | `artifacts/v4-8-3-review-routes.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 4 transports / 10 callers / 1 diagnostic / 1 adapter / 1 migrated owner; historical hashes verified; exit 0 | `artifacts/v4-8-3-review-inventory.log` |
| `node --test tests/harness.test.mjs` after report/manifest refresh | 7 passed, no failures/skips; 460 packaged entries; exit 0 | `artifacts/v4-8-3-review-harness.log` |
| `node artifacts/v4-8-3-review-audit.mjs` and `git -c core.safecrlf=false diff --check` | 8 changed / 1,378 byte-identical / 0 added / 0 removed; no whitespace errors | `artifacts/v4-8-3-review-change-audit.json` and final local check |

The full unit run includes all six pinned modes and their 24 wire/delivery/event/checkpoint hashes, as well as existing resume, review, Evidence and financial regressions. Counts above overlap and are not additive. Live-provider quality/cost/load benchmarks were not run. MongoDB, process-resume integration, UI and Linux deployment suites were not rerun for these localized callback fixes: no persistence, frontend, deployment or dependency files changed. Their preceding acceptance results in section 12 remain historical evidence, not fresh results for this review. The earlier unreproduced UI startup failure remains documented.

Architecture remains the existing Agent → Gateway → adapter arrangement. The contract and implementation map document callback/cancellation enforcement; no accepted ADR or invariant is changed. No schema, migration, environment/dependency/configuration, public API, feature flag, checkpoint/cutoff/provenance or model/provider selection change. Runtime behavior changes only for invalid asynchronous waiting callbacks and cancellation notification timing; it is not zero. Normal synchronous progress, investment-research business rules and successful golden results remain unchanged. Callback errors stay sanitized and cancelled readers are closed; no private reasoning or credentials are newly exposed.

Review-only rollback restores the eight listed files from the review-start copies, preserving the accepted V4.8.3 migration and all pre-existing uncommitted work. No data rollback is needed. Persistent model-state compatibility, policy routing and router/Vision migration remain deferred. CURRENT is V4.8; V4.8.4 has not been implemented or started.

## 20. Second V4.8.3 review — 2026-09-10

Scope remains V4.8.3 error handling and compatibility. The previous review and all uncommitted V4.8.2/V4.8.3 changes are preserved. Before edits, 1,386 tracked/unignored files were hashed and copied into ignored `artifacts/v4-8-3-review2-baseline.json` and `artifacts/v4-8-3-review2-rollback/`.

Two defects were reproduced and corrected:

- **Cancellation during read creation:** a native ReadableStream with highWaterMark 0 can cancel its signal and reject inside pull(), synchronously during reader.read(). The adapter previously checked cancellation before attaching any rejection handler to that newly created promise. The completion rejected correctly, but the orphan read rejection could still terminate Node. The independent reproduction observed one unhandled rejection; the strict-unhandled-rejection regression child exited 1. The adapter now consumes the abandoned promise while retaining the authoritative cancellation/timeout result. JSON/SSE × cancel/TimeoutError cases pass in a child with strict rejection handling, one read/request per case and no retained reader lock. The independent reproduction now observes zero unhandled rejections.
- **Format-fallback notification:** the wrapper ignored promise results from onFormatFallback and let synchronous exception details escape. Notification failure could therefore continue another model request or create an unhandled rejection. The existing synchronous callback guard was moved to `model-gateway-result.mjs` and reused by both Gateway and this notification. Invalid callback types fail preflight; thrown/resolving-async/rejecting-async callbacks fail safely with callback_error and no second request. No raw callback cause/message is exposed. Normal synchronous format negotiation and its evidence/validation budgets are unchanged.

Modified files in this review: `server/agent.mjs`, `server/model-adapter.mjs`, `server/model-gateway.mjs`, `server/model-gateway-result.mjs`, `tests/model-gateway.test.mjs`, `tests/model-migration.test.mjs`, `docs/contracts/model-gateway.contract.md`, `docs/architecture/current-implementation-map.md`, this report and `MANIFEST.json`. Ten existing files changed; 1,376 remain byte-identical, with no tracked/unignored additions or removals. Local audit scripts/logs are ignored artifacts. No test or assertion was removed, skipped or weakened.

| Executed command | Actual result | Evidence |
|---|---|---|
| `node --test tests/model-migration.test.mjs tests/model-gateway.test.mjs tests/model-deadline.test.mjs tests/model-request.test.mjs tests/review-format.test.mjs` | Before edits: 59 passed; exit 0 | `artifacts/v4-8-3-review2-baseline.log` |
| `node artifacts/v4-8-3-review2-read-repro.mjs` before/after fix | Before: 1 unhandled rejection, exit 1; after: 0, exit 0 | `artifacts/v4-8-3-review2-read-repro.log`, `artifacts/v4-8-3-review2-read-fixed.log` |
| `node --test tests/model-migration.test.mjs tests/model-gateway.test.mjs` with new tests before fixes | 34 passed / 2 failed; exit 1; confirms both defects | `artifacts/v4-8-3-review2-repro.log` |
| `node --test tests/model-migration.test.mjs tests/model-gateway.test.mjs tests/model-deadline.test.mjs tests/model-request.test.mjs tests/review-format.test.mjs tests/streaming.test.mjs tests/research-resume.test.mjs tests/evidence-followup.test.mjs tests/model-call-inventory.test.mjs` | After fixes: 96 passed; exit 0 | `artifacts/v4-8-3-review2-targeted.log` |
| `pnpm test` | 74 files / 574 passed; 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-3-review2-unit.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 4 transports / 10 callers / 1 diagnostic / 1 adapter / 1 migrated owner; historical hashes verified; exit 0 | `artifacts/v4-8-3-review2-inventory.log` |
| `node --test tests/harness.test.mjs` after documentation/manifest refresh | 7 passed; 0 failed/skipped; 460 packaged entries; exit 0 | `artifacts/v4-8-3-review2-harness.log` |
| `node artifacts/v4-8-3-review2-audit.mjs` and `git -c core.safecrlf=false diff --check` | 10 changed / 1,376 byte-identical / 0 added / 0 removed; no whitespace errors | `artifacts/v4-8-3-review2-change-audit.json` and final local check |

The full unit run includes the two new regressions, both previous-review regressions, existing resume/review/Evidence/financial tests and all six pinned migration modes. All 24 request/delivery/event/checkpoint hashes remain equal to the original executable baseline; no golden fixture was regenerated. Child-process scenarios and overlapping subsets are not counted as additional distinct unit tests. No live-provider quality/cost/load benchmark was performed. Routes, database/API/process-resume integrations, UI and Linux deployment were not rerun in this second review: no corresponding infrastructure, persistence or frontend owner changed. Earlier recorded acceptance results are historical evidence, not results from the second review; the initial unreproduced UI startup timeout remains a known limitation.

Architecture continues to use the same Agent → Gateway → adapter owners. Sharing the existing callback guard avoids a parallel error policy. Contract and implementation-map text now describe the actual enforcement; accepted ADRs and invariants are unchanged. No schema, migration, dependency/environment/configuration, public API or feature flag change. No checkpoint shape, original cutoff, provenance, financial definition, Evidence gate, Knowledge content, collection logic or model/provider selection change. Runtime behavior is intentionally changed for the two failure cases, so runtime behavior change is not zero. Successful investment-research outputs remain pinned by the golden comparison; rejected promise details do not enter public telemetry.

Rollback only this review by restoring the ten listed files from the review2 copies, preserving the earlier accepted migration and first review. No database rollback or research-data deletion is required. Known limits remain live-provider variance and future cross-provider state/policy support. CURRENT stays V4.8. No V4.8.4, V4.9, V5.x or V6.0 work was started; stop after these scoped corrections.
