# V4.8.4 Completion Report — router/Vision migration

Date: 2026-09-10. CURRENT remains V4.8; runtime/Knowledge remains 4.7, contract version 7. **V4.8.4 implementation and scoped acceptance are complete. No V4.8.5 work is started.**

## 1. Release and baseline

V4.8.4 only: migrate path classification, security intent and Vision, plus the remaining real synthetic diagnostic request, behind Gateway. Before editing, all 1,386 tracked/unignored worktree files were hashed and copied to ignored `artifacts/v4-8-4-baseline.json` and `artifacts/v4-8-4-rollback/`. The starting commit is de56872c3718371e086454a291d385f6992bcd24, but the actual accepted baseline includes uncommitted V4.8.2/V4.8.3 and both V4.8.3 reviews. Those changes are preserved; HEAD is not a valid rollback baseline.

Baseline `pnpm test`: 574 passed, no failures/cancellations/skips/todo. The saved pre-migration implementations remain executable and generated the independent Router/Vision fixture.

## 2. Modified files

- `server/research-path.mjs`, `server/security-intent.mjs`: Gateway router calls, unchanged prompts/parsers, cache keys/TTLs, concurrency, caller timeout, manual choices and rule fallback; connection snapshot per request.
- `server/vision-model.mjs`: Gateway vision call, Catalog capability readiness, same image/message assembly and trimmed output; existing external cancellation and safe failure behavior.
- `server/model-catalog.mjs`: owns the unchanged exact legacy image-capability predicate; vision-model re-exports it, avoiding a Catalog ↔ Vision/Gateway import cycle.
- `server/model-gateway.mjs`, `server/model-adapter.mjs`, `server/model-stream.mjs`: factory-only legacy-router-vision compatibility for omitted JSON assistant role, with strict finish/refusal/content and default/SSE parsing retained.
- `server/model-gateway-result.mjs`: safe Vision error translation; no raw body/cause exposure.
- `scripts/dual-model-diagnostics.mjs`: the remaining explicit synthetic analysis request uses Gateway; still opt-in and never run against a live provider by this task.
- `scripts/check-model-call-inventory.mjs`, `tests/model-call-inventory.test.mjs`: one active provider endpoint, four migrated production owners and one diagnostic; immutable historical metadata/anchor mapping and strengthened negative checks.
- `docs/architecture/00-system-map.md`, `04-model-system.md`, `current-implementation-map.md`: actual ownership/capabilities and future policy limits.
- `docs/contracts/model-gateway.contract.md`, `docs/invariants/model.invariants.md`, `docs/adr/ADR-002-model-gateway.md`: compatibility and implementation evidence without weakening obligations or reversing decisions.
- `docs/releases/V4.8/README.md`, `DETAILED_INDEX.md`, `schema.md`, `migration.md`, `rollback.md`, `subreleases/V4_8_4-migrate-router-and-vision-calls.md`: release scope, progress, corrected future-template assumptions and rollback.
- `docs/releases/V4.8/subreleases/V4_8_3-migrate-research-review-followup-calls.md`: replace the stale "V4.8.4 not started" navigation note with its current specification link; the historical completion report is unchanged.
- `MANIFEST.json`: packaged document/checker/test hashes and this report.

## 3. New files

- `tests/router-vision-migration.test.mjs`: six golden cases and six boundary/lifecycle/diagnostic regressions.
- `tests/fixtures/router-vision-migration-scenario.mjs`: common deterministic workload executed against old and migrated owners.
- `tests/fixtures/router-vision-migration-baseline.json`: six results captured from saved executable V4.8.3, not from current implementation expectations.
- `docs/releases/V4.8/V4_8_4-completion-report.md`: this report.

Ignored artifacts contain local audit copies, test logs and helpers, not new product modules.

## 4. Removed files

None. The three direct production transports and diagnostic request are replaced in their existing modules. No test/fixture/assertion is removed or relaxed. Historical H0/V4.8.0 inventory and previous completion reports remain intact.

## 5. Architecture and inspected owners

Inspected model routing/Catalog/Gateway/adapter/results, request retry/deadline/stream, Agent purposes, both router owners, Vision, material/visual processing, original-page reads, diagnostic, static inventory and associated tests. Read current system maps, active normalized release, Gateway contract, model/research/Evidence invariants and ADR-002/012/014.

All discovered real model requests now dispatch through the one existing adapter. The four production owners preserve their business responsibilities; Catalog defines capability metadata and adapter maps provider options. No parallel parser/client/orchestrator is created. AC01 is supported by endpoint scanning, explicit dispatch/purpose checks and tests rejecting direct transport reintroduction, duplicate Gateway imports, adapter bypass and unmapped callers. Lexical scanning does not prove absence of arbitrary computed SDK endpoints.

## 6. Schema

No persistent schema, public HTTP API, research payload, checkpoint/modelState or version change. The compatibility flag is internal and factory-only. It permits omitted JSON role for router/Vision; missing finish metadata remains invalid for these purposes. Default Gateway and legacy-text semantics remain unchanged.

## 7. Migration

Code-only transport migration; no database/index/backfill or environment migration. Cache identity still uses question/model/base; default models and independent analysis/Vision key/base fallback remain. The old image predicate moves into Catalog and retains its compatibility export. Generic specification text about persisted usage/modelState was corrected to V4.8.7/V4.8.9, and policy flags to later rollout.

## 8. Environment

Node 24.19.0 / pnpm 11.19.0, Windows host. Dependencies, lockfile, runtime config and environment templates are unchanged. Unit/golden/diagnostic tests use synthetic keys and mocked fetch, with no live provider request. The diagnostic regression executes the real script with relocated imports/output in its own temporary directory, invokes real image rendering, then removes only that temporary output.

MongoDB tests used temporary mongo:8.0 container `zhiheng-v484-test-mongo`, loopback port 27029 and test-owned UUID databases. The existing port-27017 research service was not used. After testing, the temporary container was stopped/auto-removed, with a filtered Docker listing confirming its absence. UI used loopback Vite 5193 and existing external Playwright/Edge, UI_TEST_FILTER unset, with artifact/document writes excluded from watching. The Vite session was interrupted after all scenarios completed. No project dependency setup or production deployment changed.

## 9. Compatibility and runtime impact

Router/Vision valid request bodies, prompts, models, credentials, output budgets, default thinking and returned decisions/text match six cases from the saved V4.8.3 executable. Hashes compare all request-body values, URL/method/headers and stable results with sorted object keys; path decisionId is omitted from hashing only after validating its UUID shape and identical cache/resolve reuse. No business response field or financial/Evidence value is removed from comparison. Router success TTL is 10 minutes; rules TTL is 30 seconds. No-key and capacity fallbacks, manual mode and exact security mention/market parsing remain local.

Intentional failure-path hardening: Gateway rejects redirects, credentials/query/fragment in endpoint URLs, unexpected candidates/roles/refusals and oversized/malformed responses; router body reads are now bounded/cancellable, including non-cooperative transports. Router's adapter budget is at most 8 seconds with shorter caller timeouts honored. Vision retains 12 images, 16 MiB request, 512,000-byte and 18,000-character output bounds and 60 seconds. HTTP/network errors do not retry Router/Vision or switch models. The diagnostic explicitly requests stream false rather than omitting the field, preserving non-stream behavior, and unsupported explicit reasoning-off now fails closed.

Runtime behavior change is not zero: transport ownership and failure protection change. Investment-research prompts, rules, financial definitions, Evidence/visual verification requirements and successful golden outputs are unchanged. Missing data is not an escalation trigger.

## 10. Resume/recovery and provenance

No checkpoint or tool history is edited. Original cutoff, private continuation, completed work, Knowledge snapshots and source archives remain with existing owners. The existing six research-mode golden hashes and real-process MongoDB resume regression verify reviewed delivery without repeating completed tools. Visual transcript/page checks, OCR fallback and non-verified evidence labels are untouched. Router cancellation propagates the original caller reason without caching a cancelled decision and releases capacity.

## 11. Feature flags

None added. Existing env selection and Vision input mode remain. MODEL_ROUTING_MODE, policy and durable model-state controls belong to later subreleases and are not rollback mechanisms here.

## 12. Tests executed

| Command | Actual result | Evidence |
|---|---|---|
| `pnpm test` before edits | 574 passed / 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-4-baseline-unit.log` |
| `node --test tests/research-path.test.mjs tests/security-intent.test.mjs tests/visual-reading.test.mjs tests/model-catalog.test.mjs tests/model-gateway.test.mjs tests/model-migration.test.mjs` | 75 passed; exit 0 | `artifacts/v4-8-4-first-targeted.log` |
| `node --test tests/model-call-inventory.test.mjs` | 11 passed; exit 0 | `artifacts/v4-8-4-inventory-tests.log` |
| `node artifacts/v4-8-4-golden.mjs` | Six old-owner cases captured, 12 request/result hashes; exit 0 | `artifacts/v4-8-4-golden-baseline.log` |
| `node --test tests/router-vision-migration.test.mjs` | 12 passed, including all six golden cases and offline actual diagnostic; exit 0 | `artifacts/v4-8-4-migration-tests.log` |
| `pnpm test:mongodb` with isolated MONGODB_URI | 7 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-4-mongodb.log` |
| `node --test tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs` with isolated MONGODB_URI | 2 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-4-extra-integration.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 1 production transport / 10 production callers / 0 direct diagnostics / 1 adapter / 4 migrated business owners / 1 migrated diagnostic; historical hashes verified; exit 0 | `artifacts/v4-8-4-inventory.log` |
| `pnpm test` after migration | 75 files / 586 passed / 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-4-unit.log` |
| `pnpm test:routes` | 5 route-render scenarios passed; exit 0 | `artifacts/v4-8-4-routes.log` |
| `pnpm test:ui` with external Playwright/Edge and UI_BASE_URL loopback | 271/271 passed, unfiltered, exit 0; API traffic used in-memory fixtures | `artifacts/v4-8-4-ui.log`, `artifacts/v4-8-4-ui/ui-results.json` |
| `node --test tests/harness.test.mjs` after documentation/manifest refresh | 7 passed / 0 failed/skipped; 461 packaged entries; exit 0 | `artifacts/v4-8-4-harness.log` |
| `node artifacts/v4-8-4-audit.mjs` and `git -c core.safecrlf=false diff --check` | 25 changed / 1,361 byte-identical / 4 added / 0 removed; no whitespace errors | `artifacts/v4-8-4-change-audit.json` and final local check |

All listed checks passed. The full unit run includes the seven Harness checks and all new migration cases; repeated subsets are not counted as additional distinct tests. Deployment integration was not rerun for this transport-only subrelease; no deployment, dependency or persistent schema file changed. The prior V4.8.3 deployment pass remains historical evidence, not a fresh V4.8.4 result.

## 13. Results and failure analysis

All 574 existing unit tests and 12 new tests pass (586 total), with no failures, cancellations, skips or todo. The nine database/API/process-resume tests, five routes and 271 UI scenarios also pass. No test setup, validation budget, financial meaning or Evidence constraint was weakened. Existing fixtures omit JSON assistant role in valid router/Vision responses; scoped compatibility preserves this behavior while keeping explicit invalid roles, missing/invalid finish, refusal and malformed/multiple candidates rejected. Default Gateway is still strict. All earlier V4.8.3 callback/cancellation regressions are retained.

Operational notes: an initial read used an incorrect guessed spec filename; the actual indexed `V4_8_4-migrate-router-and-vision-calls.md` was then read. A read-only Docker listing under the sandbox could not access the daemon; the scoped temporary test-container launch succeeded using the tool's approved elevated execution. Neither was a product/test failure or bypass of a rejection. Hash verification confirms 25 changed files, 1,361 byte-identical baseline files, four additions and no removals. Agent's existing text behavior, financial/Evidence/Knowledge/collection/frontend code, persistent schema, dependencies and prior completion reports are unchanged from the accepted V4.8.3 worktree. AC01 and scoped V4.8.4 acceptance pass.

## 14. Benchmark

The six Router/Vision cases compare actual prior and new default/custom model wiring and returned results, including prompt text, image/page detail, separate key/base fallback and cached decision reuse. All 12 hashes match. The six existing research-mode cases compare their 24 request/delivery/event/checkpoint hashes against the original pre-text-migration executable. These are synthetic deterministic compatibility gates, not live model quality, cost, accuracy or throughput measurements. No live provider benchmark is claimed.

## 15. Security/privacy

Provider calls and thinking-name switches are isolated behind Gateway/Catalog/adapter. Research does not receive raw images; diagnostic analysis receives only Vision transcription. Missing image input capability is not inferred from arbitrary model names. Private reasoning remains outside public results and telemetry; Gateway errors and Vision compatibility messages do not expose provider bodies, keys or images. New bounded cancellation closes readers and late bodies. No real financial dataset or user document was sent externally.

## 16. Rollback

Restore only modified files listed in section 2 from the V4.8.4 start snapshot, remove only the four additions in section 3, and restore its manifest. Preserve all pre-existing accepted work, including both V4.8.3 reviews; do not reset to HEAD or delete research records. Saved old router/Vision implementations remain executable and generated the matching golden fixture. No database, configuration, schema or research-data rollback is needed.

## 17. Known limitations

- No live model quality/cost certification or production load benchmark.
- Lexical endpoint scanning covers known patterns and reviewed owners, not arbitrary dynamically constructed clients.
- Full cross-provider state compatibility, policy and durable telemetry remain unimplemented.
- Default strict response guards deliberately reject malformed outputs previously ignored by legacy wrappers; compatibility only covers omitted role metadata.
- Linux deployment was not rerun; previous acceptance evidence is identified as historical.

## 18. Deferred work and stop

V4.8.4 is accepted. V4.8.5 Complexity Evaluator is the next eligible subrelease and requires separate user authorization. Policy, telemetry persistence, health routing, modelState, escalation, new image providers and all V4.9/V5.x/V6.0 capabilities remain deferred. CURRENT stays V4.8. This task stops at V4.8.4.
