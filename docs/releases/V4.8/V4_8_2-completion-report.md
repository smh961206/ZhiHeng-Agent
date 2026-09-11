# V4.8.2 Completion Report — Gateway request/response normalization

Date: 2026-09-10. Baseline: `de56872c3718371e086454a291d385f6992bcd24` (accepted V4.8.1). The worktree was clean at the start; preceding V4.8.1 work is committed and preserved. CURRENT remains V4.8; framework/Knowledge remains 4.7 and contract version 7.

## 1. Release / acceptance

V4.8.2 is accepted for the standalone internal complete() API, a single legacy protocol adapter, safe result/error normalization and opt-in parser metadata/validation. AC01 is exercised with mocked analysis, review/tool, router and Vision requests, private-reasoning isolation, stream/non-stream responses and failure/cancellation cases. Latest review: all 560 unit tests, five route-render scenarios and inventory/manifest checks pass. Business-call migration is not part of this acceptance; V4.8.3 is not started.

## 2. Modified files

- `server/model-stream.mjs`: optional usage/finish callbacks and strict completed-message validation; original caller defaults remain.
- `server/model-request.mjs`: shared network-error classification export used by Gateway body reads; existing fetch/retry behavior remains unchanged.
- `scripts/check-model-call-inventory.mjs`: explicit immutable V4.8.2 standalone-adapter addition and checks for shared guards/no business migration. The historical V4.8.0 inventory is preserved.
- `tests/model-call-inventory.test.mjs`: two new boundary regressions; one historical-status test title corrected, all original assertions retained.
- `docs/contracts/model-gateway.contract.md`: current complete/error/result contract, privacy, compatibility and limits.
- `docs/architecture/current-implementation-map.md`, `docs/architecture/04-model-system.md`: current standalone owners versus future migration.
- `docs/adr/ADR-002-model-gateway.md`, `docs/invariants/model.invariants.md`: implementation evidence, with decisions/obligations unchanged.
- `docs/releases/V4.8/README.md`, `DETAILED_INDEX.md`, `schema.md`, `migration.md`, `rollback.md`, `subreleases/V4_8_2-gateway-request-response-normalization.md`: progress and actual scoped boundaries.
- `MANIFEST.json`: updated packaged bytes/hashes and this report.

## 3. New files

- `server/model-gateway.mjs`: public-safe facade and explicit server-only continuation access.
- `server/model-adapter.mjs`: single standalone protocol adapter, private connection lookup and bounded/cancellable reads.
- `server/model-gateway-result.mjs`: error taxonomy, usage/billing and message normalization.
- `tests/model-gateway.test.mjs`: 22 API/compatibility/failure regressions with multiple scenarios per test, including seven regressions from two reviews.
- `docs/releases/V4.8/V4_8_2-completion-report.md`: this report.

Ignored audit/manifest helpers and logs under `artifacts/v4-8-2-*` are local verification evidence, not deliverable runtime files.

## 4. Removed files

None. No test is deleted, skipped or relaxed. No previous release inventory/report is rewritten as a new baseline.

## 5. Architecture / inspected owners

Inspected Catalog/routing, request retry, deadline, stream parsing, agent completion/execution, review-format negotiation, path/intent, Vision, evidence-followup, safe env templates and their tests. Current architecture maps, release specs, contract, model/research/Evidence invariants and ADR-002/012/014 were read.

The facade expresses purpose/profile capabilities; the adapter owns legacy model-name thinking switches and credentials. It reuses `modelRouting`, `fetchModel`, `createModelDeadline`, `readCompletion` and the existing unsupported-review-format predicate. There is no second SSE parser or parallel research orchestrator. All four old production transports and ten semantic callers remain; the one new adapter is standalone, not wired into them.

CURRENT: standalone Gateway normalization and bounded errors/readers. PARTIAL: full Gateway architecture because production callers are not migrated. FUTURE: caller migration, policy/complexity/health, telemetry persistence, escalation and checkpoint model-state compatibility. No new deprecation or global invariant enforcement claim.

## 6. Schema

No persistent schema/version change. Internal request/result/error fields are documented in the Gateway contract. Usage/price/provider unknowns remain null. Private continuation lives in a same-instance WeakMap, not response serialization or storage. ModelProfile v1 is unchanged.

## 7. Migrations

None. No DB/index/backfill, config transition or checkpoint rewrite. No import/call-site migration; V4.8.3/V4.8.4 own that work. V4.8.9 owns modelState compatibility.

## 8. Environment

No dependency, lock file, environment template, deployment configuration or installed service change. Tests use Node 24.19.0 / pnpm 11.19.0 on Windows, synthetic credentials and mocked responses. No live provider requests or real research databases are used.

## 9. Compatibility / runtime delta

Existing business request behavior change = 0. Existing runtime changes are model-stream's optional callbacks/opt-in strict mode and model-request's additional shared classification export; current agent/router/Vision callers are unedited and retain their original parsing/retry paths. The new API adds standalone behavior, so this is not a claim that no runtime API was implemented.

Legacy model/base/key mapping, analysis stream/tool/format/default-thinking behavior and router/Vision thinking/budgets are reproduced. Analysis paths reuse bounded pre-response network retries; router/Vision retain a single network attempt. No HTTP retry, stream replay, escalation or automatic output-format downgrade is introduced. Future migration must explicitly retain existing review negotiation and business guards.

Gateway additionally rejects malformed finished messages, bounds JSON and stream responses, closes readers on cancellation, disables redirects and rejects unsafe URL forms. These protections are scoped to the new API and are not silently imposed on unmigrated callers. All investment-research, financial, Evidence, Knowledge, collection and public UI logic is unchanged.

## 10. Resume / recovery / point-in-time

No research checkpoint/cutoff/evidence/tool-state change. Private continuation preserves the existing assistant reasoning field when explicitly requested from the same Gateway instance. This does not prove cross-provider state isolation or job pinning; callers must retain same-profile context until V4.8.9 adds compatibility rules. No old record is changed.

## 11. Feature flags

None. MODEL_ROUTING_MODE is not implemented. Business callers still use their original transports; standalone API acceptance is not production policy rollout.

## 12. Tests executed

| Command | Actual result | Local log |
|---|---|---|
| `node --test tests/model-catalog.test.mjs tests/model-request.test.mjs tests/model-deadline.test.mjs tests/streaming.test.mjs` | Baseline 38 passed / 0 failed/skipped | `artifacts/v4-8-2-baseline-tests.log` |
| `node --test tests/model-gateway.test.mjs` | First implementation 15 passed / 0 failed/skipped | `artifacts/v4-8-2-gateway-tests.log` |
| `node --test tests/model-gateway.test.mjs tests/model-call-inventory.test.mjs tests/streaming.test.mjs tests/model-deadline.test.mjs tests/model-request.test.mjs` | Related subset 49 passed / 0 failed/skipped | `artifacts/v4-8-2-targeted-tests.log` |
| `pnpm test` | 73 test files / 553 passed, 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-2-unit-tests.log`; final verification `artifacts/v4-8-2-final-unit-tests.log` |
| `pnpm test:routes` | Five route-render scenarios passed; exit 0 | `artifacts/v4-8-2-routes.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | Four production transports / ten callers / one diagnostic / one standalone adapter; historical UTF-8/LF hashes verified; exit 0 | `artifacts/v4-8-2-inventory.log` |
| `node artifacts/v4-8-2-audit.mjs` | Initial acceptance: 15 tracked files changed / 1,361 unchanged, with five new files and none removed; review audit below includes the additional shared classifier export | `artifacts/v4-8-2-change-audit.json` |
| `git -c core.safecrlf=false diff --check` | No whitespace errors; exit 0 | Local command result |

Harness manifest refresh (`node artifacts/v4-8-2-manifest.mjs`) records 459 packaged files; full-suite Harness tests verify exact bytes/hashes and documentation links. Counts from repeated subsets are not added together as distinct tests. MongoDB, UI-browser and Linux deployment suites are not claimed as newly executed for this standalone API; no database/UI/deploy owner is modified.

## 13. Results / change audit

Initial acceptance passed 553 tests. The first review reproduced four defects before correction (15 passed / 4 failed in the Gateway suite); the second reproduced three request-validation defects (19 passed / 3 failed). Final acceptance passes all 536 pre-existing tests and 24 new tests (22 Gateway plus two architecture boundary cases), with 0 failures/skips and no weakened assertion. Coverage includes JSON/SSE, split UTF-8, tool fragments, private reasoning, wire options, capabilities, safe configuration, HTTP failures, format negotiation errors, purpose-specific retries, malformed/truncated/refused responses, limits, cancellation handoff, timeouts, callback errors, candidate isolation, body connection loss, explicit profile validation, sparse tool lists, omission-only defaults, input serialization and nullable billing. Unknown error categories/statuses are normalized instead of copied into public errors.

Start hashes of all 1,376 tracked files were captured in `artifacts/v4-8-2-baseline-hashes.json`. Review comparison shows exactly the 16 listed tracked modifications, 1,360 byte-identical tracked files, five additions and zero removals. Catalog, legacy routing/agent/Router/Vision request owners, financial/Evidence/Knowledge/collection/recovery modules, dependencies, configs and CURRENT are unchanged. Existing parser defaults and fetch retry paths are preserved. No existing financial/Evidence/business-test assertion is weakened. Historical transport hashes are provenance, not a freeze on the new adapter.

## 14. Benchmark

Live model-routing quality/cost benchmark is not applicable yet: no business request is routed through the new Gateway, no model policy or tier choice changes. Mocked wire/response regression and existing investment-research tests preserve the baseline. No live-provider compatibility or quality score is claimed. Production policy still requires later release benchmark gates.

## 15. Security / privacy

Public result fields/deltas exclude hidden reasoning and arbitrary provider metadata. Explicit private continuation is separate, cloned and instance-bound. Errors use fixed messages and safe category/status/retryability fields, never raw provider detail, original cause, URL, credential or image. Bounded reads, safe URL policy, no redirects and mandatory image/tool gates protect the standalone API.

TTFT measures first parser-observed content/reasoning/tool activity; heartbeats do not count, and JSON timing is receipt-based. Pricing/usage are optional estimates, not billing authority. Server-owned metadata/message identifiers must still avoid secrets; this API is not a JavaScript sandbox or cross-provider history validator.

## 16. Rollback

Revert this subrelease's five additions and listed modifications to the V4.8.1 baseline, preserving all prior work. Existing business transports remain usable throughout. No database/config/environment migration or data rollback is required; do not delete research/evidence records. Parser opt-in/default compatibility and unmigrated caller checks make the rollback boundary explicit.

## 17. Known limitations / document corrections

- Only the existing compatible chat protocol is implemented, not additional provider SDKs or endpoint families.
- Explicit reasoning efforts other than the known legacy `off` mapping are rejected; omitted defaults are preserved.
- Router cache/rule fallback, review negotiation and Vision document processing remain with current business owners.
- Private continuation does not establish provider switching/model-state safety. Telemetry is returned in memory, not persisted.
- New Gateway JSON/URL/strict-message guards exceed some legacy checks; future integration must assess these explicitly.
- Generic template references to immediate modelState/usage persistence and routing-mode rollout were corrected to their actual later subreleases. ADR decisions and invariant obligations are unchanged.

## 18. Deferred / stop

Next is V4.8.3 research/review/followup migration after authorization. V4.8.4 router/Vision migration, policy, health, usage persistence, state compatibility, escalation, rollout and all V4.9/V5.x/V6.0 work remain deferred. CURRENT stays V4.8. This subrelease does not begin V4.8.3.

## V4.8.2 review — cancellation ownership and error integrity

The review reproduced and corrected four P2 defects:

| Finding | Consequence | Correction / regression |
|---|---|---|
| Cancellation between fetch receipt and reader acquisition left a body open | The caller saw an abort while the response resource remained live | Adapter tracks every received response through final cleanup; late arrivals are still cancelled. A regression covers 13 microtask handoff timings, including the failing window |
| Strict parsing fell back to a nonzero choice index | Unrelated candidate text could be appended to the same response | Strict single-choice validation rejects unexpected indexes and multiple candidates before emitting their text, for both JSON and SSE; legacy defaults remain unchanged |
| Promise-returning delta callbacks were not awaited or rejected | Callback failures could become unhandled promise rejections while complete() appeared successful | Explicit synchronous callback contract; promise/thenable returns become safe callback_error and rejected promises are consumed |
| Socket loss while reading a body became malformed_response | A transport failure was mislabeled as invalid model output | Reuse existing network-code ownership through a pure model-request classifier export; both JSON/SSE body failures become network without retrying the response |

The initial Gateway baseline passed 15/15 tests. Adding the four regressions produced 15 pass / 4 fail / 0 skip before fixes, as recorded in `artifacts/v4-8-2-review-repro.log`. After fixes, all original assertions remain and the new regressions pass. A local ignored cancellation probe also located the handoff gap; no live service was contacted.

Review changes are limited to `server/model-adapter.mjs`, `server/model-gateway.mjs`, `server/model-stream.mjs`, `server/model-request.mjs`, `tests/model-gateway.test.mjs`, Gateway contract, implementation map, this report and `MANIFEST.json`. No new deliverable file or subsystem is created by the review. The subrelease's five additions remain as listed above.

No new persistent schema, migration, dependency/environment change, feature flag, public route, business-call migration or research resume behavior. Security/privacy improves through resource closure, candidate isolation and safe callback/transport failure handling. Existing investment-research behavior remains unchanged. Benchmark applicability and deferred work remain sections 14 and 18. Review rollback is limited to these implementation/test/documentation changes; there is no data or runtime-configuration rollback.

| Review command | Actual result | Evidence |
|---|---|---|
| `node --test tests/model-gateway.test.mjs` | Baseline 15 pass; reproduction 15 pass / 4 expected regression failures before fixes | `artifacts/v4-8-2-review-baseline.log`, `artifacts/v4-8-2-review-repro.log` |
| `node --test tests/model-gateway.test.mjs tests/model-request.test.mjs tests/model-deadline.test.mjs tests/streaming.test.mjs tests/model-call-inventory.test.mjs` | 53 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-2-review-targeted.log` |
| `pnpm test` | 73 files / 557 passed, 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-2-review-unit.log` |
| `pnpm test:routes` | Five route-render cases passed; exit 0 | `artifacts/v4-8-2-review-routes.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | Four production transports / ten callers / one diagnostic / one standalone adapter; historical hashes verified; exit 0 | `artifacts/v4-8-2-review-inventory.log` |
| `node artifacts/v4-8-2-audit.mjs` | 16 tracked modifications / 1,360 unchanged; five additions, no removals | `artifacts/v4-8-2-review-change-audit.json` |
| `node --test tests/harness.test.mjs` | Final documentation/459-file manifest validation: 7 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-2-review-harness.log` |

`git -c core.safecrlf=false diff --check` passes. MongoDB, browser UI and Linux deployment suites are not newly run or claimed. No unresolved finding from this review blocks the scoped V4.8.2 acceptance. CURRENT stays V4.8; V4.8.3 is not started.

## V4.8.2 second review — request validation before dispatch

This review inspected the facade's request preparation, adapter cancellation/callback ownership, usage normalization and billing calculations. It reproduced and fixed three request-validation defects:

| Finding | Consequence | Correction / regression |
|---|---|---|
| Falsy explicit profile IDs were treated as absent; malformed routingContext was ignored | An invalid selection could dispatch through the default model instead of failing | Validate context shape and nonempty string IDs before selection. Tests require zero fetches for invalid input, preserve default/explicit valid selection, and distinguish unknown IDs as configuration errors |
| Array.some skipped empty tool slots | A supposedly validated tool list serialized with null entries and reached the provider | Iterate every tool position, including holes. Tests reject leading/trailing/all-hole lists and null/undefined entries before fetch, while retaining valid tools |
| Null stream/output-token options used nullish defaults | Invalid boolean/integer fields silently changed into stream or budget defaults | Apply defaults only to omitted/undefined options. Tests reject null before fetch and retain omitted defaults, explicit false and a positive token budget |

The baseline Gateway suite passed 19 tests. New regressions then produced 19 pass / 3 fail / 0 skip, each failing because an expected rejection did not occur. Fixes retain every preceding test and assertion. No additional defect was established in usage/billing or the earlier callback/resource corrections; those implementations remain unchanged in this review.

This review modifies six existing worktree files: `server/model-gateway.mjs`, `tests/model-gateway.test.mjs`, `docs/contracts/model-gateway.contract.md`, `docs/architecture/current-implementation-map.md`, this report and `MANIFEST.json`. It adds/removes no deliverable files. Overall V4.8.2 remains 16 tracked modifications / 1,360 unchanged tracked files / five additions / no removals against the original baseline.

Architecture ownership, ModelProfile/persistent schemas, migrations, dependencies, environment, feature flags and resume/recovery behavior are unchanged. Only malformed inputs to the standalone Gateway change behavior. Existing investment-research callers, financial/Evidence/Knowledge/data collection logic and valid Gateway defaults remain unchanged. Invalid requests now fail locally, preventing unintended default-model dispatch and malformed outbound tool payloads. Benchmark applicability remains section 14; no live-provider certification is claimed. Rollback for this review restores only its facade/test/documentation changes, with no data migration. Deferred work remains section 18.

| Second-review command | Actual result | Evidence |
|---|---|---|
| `node --test tests/model-gateway.test.mjs` | Baseline 19 pass; reproduction 19 pass / 3 regression failures before fixes | `artifacts/v4-8-2-review2-baseline.log`, `artifacts/v4-8-2-review2-repro.log` |
| `node --test tests/model-gateway.test.mjs tests/model-request.test.mjs tests/model-deadline.test.mjs tests/streaming.test.mjs tests/model-call-inventory.test.mjs` | 56 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-2-review2-targeted.log` |
| `pnpm test` | 73 files / 560 passed; 0 failed, cancelled, skipped or todo; exit 0 | `artifacts/v4-8-2-review2-unit.log` |
| `pnpm test:routes` | Five route-render cases passed; exit 0 | `artifacts/v4-8-2-review2-routes.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | Four production transports / ten callers / one diagnostic / one standalone adapter; historical hashes verified; exit 0 | `artifacts/v4-8-2-review2-inventory.log` |
| `node artifacts/v4-8-2-audit.mjs` | Same 16 tracked modifications / 1,360 unchanged tracked files | `artifacts/v4-8-2-review2-change-audit.json` |
| `node --test tests/harness.test.mjs` | Final documentation / 459-file manifest: 7 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-2-review2-harness.log` |
| `git -c core.safecrlf=false diff --check` | No whitespace errors; exit 0 | Local command result |

MongoDB, browser UI and Linux deployment suites are not newly executed by this review. No live model calls or dependency/environment changes occur. CURRENT remains V4.8; V4.8.3 is not started.
