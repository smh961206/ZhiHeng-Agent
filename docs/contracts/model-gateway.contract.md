# Model Gateway Contract

## V5.0 unified configuration input

MODEL_CONFIG_FILE is optional. Without it, all legacy env defaults and role semantics remain. With it, the version-1 connections/profiles/roles document is the explicit source of model definitions; credentials are resolved only by apiKeyEnv and execution/promotion controls remain in the environment. Unknown/duplicate fields, invalid references and conflicting nonempty legacy definitions fail closed with a sanitized configuration error. A startup/first-use file snapshot is retained until process restart. Gateway captures effective values and credential references for each call; custom configuration cannot bypass existing ModelProfile validators or promotion gates.

External profile references do not replace legacy-analysis/main/pro/etc. internal IDs. Saved modelState versions and connection identity algorithms are unchanged. API config adds a boolean configurationError; file-invalid configuration returns configured=false/model=null while health and historical reads remain available. Missing required dispatch credentials cannot fall back to another role's key. See [runbook](../releases/V5.0/model-config-migration-runbook.md).

## V5.0 public configuration summary

GET /api/config adds modelSelection: mode, analysisModel, visionModel and candidatesEnabled. This is a read-only snapshot for new work using existing admission owners; it is not a job pin or health observation. Adaptive research modes omit a single analysis model; inactive Vision returns null. Unknown status remains unknown. No credentials, endpoints, policy paths, groups, approval identities or dormant candidate names are exposed. Existing fields and all execution/recovery gates remain unchanged.

## V5.0 current additions

Explicit MAIN ModelProfile v4 uses challenger-config, declared capabilities and adapter thinking omit/disabled/enabled; no business caller infers capabilities from model names. Structured candidate requests require explicit true capability. The default Catalog remains legacy. Private job modelState v3 freezes experiment policy/group/task/classifier/job time/profile/effort and both-arm configuration. No v2 escalation occurs. Approval binds complete research/grading code, active Knowledge, dependencies, effective review/deadline settings and connection identity; secret key rotation is permitted. New jobs require explicit matching enable/version/registry, and each v3 Gateway call rechecks retained policy and invalidation. Revocation pauses the next call, preserving progress; in-flight calls are not cancelled by file edits. Simulation and component extraction cannot authorize a research champion. Registry is a trusted operator-owned local record. See [V5.0 schema](../releases/V5.0/schema.md) and [runbook](../releases/V5.0/runbook.md).

V4.9 output clarification: the existing Vision system instruction preserves exact footnote markers and caller-requested field types / extraction scope. Benchmark cells require JSON null for absent or unreadable values and only table-associated marked footnotes; ordinary transcript callers keep their requested schema. This changes instructions, not response rewriting or grading. See [review](../releases/V4.9/vision-output-constraints-review-20260911.md).

V4.9 review clarification: capability status identifies the selected profile in the current context, while each canonical extraction identifies the actual response profile (including fallback). These meanings must not be conflated. Admission caching cannot preserve approval after relevant file/config/code identity changes or missing credentials. Local benchmark reservations and incomplete results are operational evidence only; unfinished runs cannot authorize routing.

## V4.9 current additions

Canonical request/result are described below. ModelProfile v3 is image-only configuration with explicit adapterOptions.thinking (omit/disabled); business modules cannot infer this from the model name. Independent Vision requests may opt into one quality-approved same-image fallback under a shared deadline. Cancellation, refusal, truncated output, authentication and successful unreadable content never trigger cycling; job pins forbid cross-model fallback.

Vision promotion uses the fixed 48-original corpus, measured outputs regraded deterministically, actual model/connection/configuration/code binding and separate artifact-bound operator review. FEATURE_VISION_ROUTING defaults false. Existing state shape is retained: new admitted jobs may pin vision-challenger, saved legacy IDs and historical absence remain legacy. Candidate jobs pause after admission rollback and can resume only with compatible identity. Public job model labels reflect the saved Vision profile; no actual historical profile is fabricated. V4.8 text policy quality remains deferred independently.

V4.8.11 local comparison boundary: a private checkpoint must match the expected run/arm job id, mode and complete frozen input before existing researchResume validation and any Gateway request. Archived collection replay must preserve the distinction between official report reads and US XBRL core facts; quotes/directories are not report reads. Tests: tests/model-comparison.test.mjs. No Gateway API, production acquisition or financial contract is changed; see [second review](../releases/V4.8/V4_8_8-11-review2-report.md).

V4.8.8–.11 review preserves the existing contracts: refreshed Vision audit material must remain attached after message restoration/model transitions and update the existing normalized context; completed comparison outputs must match their recorded run, corpus, input and arm. Case IDs are strings unique without case sensitivity to avoid filesystem aliases. Each new arm must retain the pinned execution day. These are compatibility/integrity fixes, not new provider APIs, financial definitions or production quality approvals. See [review](../releases/V4.8/V4_8_8-11-review-report.md).
Implementation Status: PARTIAL. V4.8.0–.10 are implemented and accepted for their stated scope. V4.8.11 has a closed rollout gate and offline safety coverage; live candidate quality acceptance is explicitly deferred by the user. Default execution remains legacy. The user activated CURRENT=V4.9 on 2026-09-11; V4.9.0 adds inventory evidence only, with no request/response contract change. Later V4.9 capability implementation remains pending.

V4.8.11 adds an isolated CLI comparison executor, reusing the Agent and Gateway with frozen text inputs. It does not change the production request/response contract. Request reservations are durable before transport and bound total attempted requests; operator-supplied monetary reservations are estimates, not guaranteed provider billing caps. Output quality fields remain unknown until separate human review; only actual completed live runs plus artifact-bound operator acceptance may be exported through the existing rollout validator. See [runbook](../releases/V4.8/model-comparison-runbook.md). Local artifact schema v1 is separate from Mongo/research schemas; no migration or endpoint is added.

## ModelProfile v1 — CURRENT

Owner: `server/model-catalog.mjs`. `createModelProfile(input)` validates a closed metadata shape, copies nested values and returns a deeply frozen profile. `createLegacyModelCatalog(env = process.env)` returns `{schemaVersion: 1, profiles}`. These are internal configuration APIs, with no HTTP route, persistence or request dispatch.

Profiles, capabilities and non-null pricing must be plain records with enumerable own data properties. Accessors and hidden required fields are rejected without invoking getters. Purposes must be a dense ordinary array with no custom properties or iterator overrides. Validation copies these data values before checking them, so accepted metadata survives a JSON round trip with the same required fields and values. Invalid metadata receives a generic error, without echoing caller values or executing property getters. This contract concerns configuration data, not sandboxing arbitrary JavaScript proxies.

| Field | Required semantics |
|---|---|
| schemaVersion / source | `1` / `legacy-env` |
| id / model | Nonempty configuration ID / opaque model ID; model value is preserved, not normalized |
| provider / protocol | Provider ID or `null`; generated legacy profiles use `null` / `openai-chat-completions`. Protocol does not establish provider identity |
| connectionRef | `legacy-analysis` or `legacy-vision`; resolve through existing `modelRouting(env)` on the server. No base URL, API key or full environment in metadata |
| tier | `legacy`; names such as “pro” do not establish an intelligence tier |
| purposes | Nonempty unique subset of `research`, `review`, `followup`, `router`, `vision`; no judge implementation |
| capabilities | All seven fields required: `textInput`, `imageInput`, `streaming`, `toolCalling`, `jsonObject`, `jsonSchema`, `reasoningControl`; each boolean or `null` |
| contextWindow / maxOutputTokens | Positive safe integer token limit or `null`; provider limits, not current per-request budgets |
| pricing | `null` when unknown; otherwise `{currency, unit: 'per-million-tokens', input, output, cacheRead}`. Currency is a three-letter uppercase code; each rate is a finite nonnegative number or `null`. Explicit zero is distinct from missing |

Capabilities describe configured legacy transport usage, not certification of an arbitrary endpoint. Analysis declares text/stream/tools, blocks raw images, and leaves structured-output/reasoning control unknown. Router declares text without streaming/tools. Vision image support follows the existing exact legacy model / explicit `images` opt-in / `off` rule, shared with `visionStatus`; missing credentials affect readiness, not declared image capability. Unsupported or unused legacy paths are false; unconfirmed optional provider support remains null. These declarations do not activate policy routing or weaken current request/validation guards.

Legacy profiles are `legacy-analysis` (research/review/followup), `legacy-router` (both path and security intent), and `legacy-vision`. The router reuses the analysis connection and preserves `LLM_ROUTER_MODEL || analysisModel`. Analysis/Vision model defaults and empty-string fallbacks reuse `model-routing.mjs`. No price, token limit or provider is inferred from a model name; generated pricing and limits are always null.

Connection refs are lookup instructions, not connections or pinned snapshots. The Catalog factory itself adds no credential resolver, dispatch or checkpoint pin. V4.8.2's adapter resolves the existing independent analysis/Vision base/key fallback privately through `modelRouting`. Existing business transports still read their original environment. Catalog is internal metadata, not a public configuration endpoint; callers must still avoid placing secrets in model/provider identifiers.

Tests: `tests/model-catalog.test.mjs` covers environment mapping, secret exclusion (including credential-bearing URLs), explicit/unknown capability semantics, immutable round trips, invalid schema/pricing, and legacy Vision request parity. Existing Vision/stream/router tests remain authoritative for actual transport behavior.

Connection tests independently pin the analysis/router/Vision identities to their expected connection refs; expectations must not be derived from the returned ref under test. Mocked requests from both path classification and security intent verify router override/fallback, analysis credentials/base, non-streaming mode, existing output budgets and legacy thinking options. These test existing owners without routing them through Catalog.

## Request — CURRENT V4.8.2

V4.9.1 additive request option: requiredCapabilities is a nonempty unique array of declared capability keys; each requested capability must be exactly true. Unknown/false cannot pass. Vision requests contain only system/user messages, images only in user content, and no tool/private continuation fields. createVisionRequest in the existing Vision owner emits the unchanged legacy wire with explicit imageInput requirement and validated local PNG/JPEG image/page/region input. This does not add persistence or change research callers.

`modelGateway.complete(request)` and the injectable `createModelGateway({env, catalog, fetchImpl, now, wait, setTimer, clearTimer, compatibility})` live in `server/model-gateway.mjs`. The only adapter is `server/model-adapter.mjs`. Agent, path/intent and Vision wrappers, plus the synthetic diagnostic, now delegate transport through it. Existing business owners remain.

Required: `purpose`, nonempty `messages` in existing chat-message form. Optional: `tools`, `responseFormat`, `reasoningEffort`, boolean `stream`, `signal` (AbortSignal), `routingContext.profileId`, positive integer `maxOutputTokens`, and `onDelta(text)`. The facade copies request messages/tools/format before dispatch. Extra top-level request fields are not forwarded as arbitrary provider options. Ordinary server-owned configuration and messages are expected; this API is not a JavaScript sandbox.

`onDelta` is synchronous and captured at request preparation. Throwing or returning a promise/thenable produces `callback_error`; rejected returned promises are consumed so they cannot become unhandled process errors. Asynchronous callback completion is not part of this preview protocol.

The shared internal guard `syncModelCallback` lives with safe error normalization in `model-gateway-result.mjs`. Gateway and Agent's format-negotiation notification reuse it; no second callback-error policy is maintained in business code.

V4.8.3 adds optional synchronous `onRetry`, `onActivity` and `onHeartbeat` callbacks with the same capture/error rules. Retry emits only `{attempt,maxAttempts,delayMs}` from the existing connection retry owner; activity and heartbeat carry no payload. Reasoning content, requests, credentials and raw errors are never passed to these callbacks. They preserve existing connection/waiting notices and the logical-call deadline across review-format negotiation; they are not durable telemetry.

Default profile selection maps purpose to its single legacy profile. An explicit profile ID must exist and support the purpose; ambiguous matches fail. This is fixed legacy mapping, not policy routing. A custom Catalog is validated/copied at construction. The default factory generates metadata from current env at each call, resolving credentials synchronously from the same env; this is not job pinning or a credential snapshot.

When supplied, routingContext must be a non-null object, not an array; its profileId must be a nonempty string or undefined. Invalid types/empty IDs fail with invalid_request before dispatch, rather than silently selecting a default. Unknown or purpose-incompatible nonempty IDs fail with configuration. An omitted/undefined profileId retains purpose selection. Stream and output-token defaults likewise apply only to omitted/undefined options; null is invalid for those boolean/integer fields. Tools must form a nonempty dense list of function definitions; empty slots are rejected before JSON serialization can turn them into null entries.

Analysis defaults to streaming and no explicit output budget or thinking field. Router defaults to non-streaming / 400 output tokens (security intent explicitly requests 1200); Vision defaults to non-streaming / 6000. Tools require explicit tool capability and use existing `tool_choice: auto`. Images require image capability; Vision requires 1–12 images. Structured format support may be unknown and explicitly negotiated with the provider, but a declared false capability is rejected. No automatic format downgrade occurs in Gateway; Agent retains review negotiation and hard validation.

## Purpose
router | research | review | followup | vision | future: judge

## Reasoning
The canonical values are off | low | medium | high | max. Omission preserves provider defaults for analysis. Legacy v1 profiles implement explicit `off` only for the existing DeepSeek thinking-compatible family; other explicit v1 efforts are rejected. Explicit policy v2 profiles require low/high/max, mapped to thinking enabled plus reasoning_effort; unset/off/medium are rejected. Omitted router reasoning retains the existing DeepSeek prefix switch; omitted Vision reasoning retains the exact legacy Vision switch. These provider-name compatibility checks live in the adapter, not the facade. Future adapters must explicitly map additional efforts after capability verification.

## Response — CURRENT V4.8.2

V4.9.2: readVisionResult returns an in-memory version-1 extraction envelope with trimmed text, actual Gateway profile/provider/model, nullable usage/performance/billing, and extraction {method:'vision',trust:'unverified',needsReview:true,pages,images:[{page,region,sha256}]}. The image hash covers decoded image bytes and is captured before dispatch. It contains no raw images, messages, credentials or reasoning. Errors remain ModelGatewayError; readVisionImages retains the legacy safe-error/string facade. No persistence or historical identity backfill is introduced; source dates remain owned by existing document records.

`{message, profile, provider, model, tier, finishReason, usage, performance, billing}`. `profile` is the profile ID; provider remains null for unknown compatible endpoints. Public `message` only contains assistant role/content and normalized function tool calls. Finish reason must be `stop` or `tool_calls`, with valid corresponding content/tool fields.

`usage = {inputTokens, outputTokens, totalTokens, cachedInputTokens}`. Counters are finite nonnegative safe integers or null. Both current cached-token representations are recognized; conflicting/invalid counts remain unknown. Missing usage is not fabricated, and contradictory totals are null. `billing` is null unless necessary counts/rates are known; otherwise `{currency, estimatedCost}` uses explicit per-million-token prices, including cached input where reported. Unknown cached counts/rates are not treated as free; equal input/cache prices can establish a total without a cache split. No pricing lookup or usage persistence occurs.

`performance = {latencyMs, ttftMs}` uses a monotonic clock and covers the adapter call including network retries/body reading. TTFT is the first content/reasoning/tool activity observed by the existing parser; heartbeats do not count. For a non-stream response this is observed completion receipt, not an exact provider token timestamp. Missing activity leaves TTFT null.

Reasoning is excluded from response serialization, deltas and metadata. A same-Gateway server-only `getContinuationMessage(response)` returns a fresh private assistant message, including reasoning needed by the existing continuation protocol. Storage uses a WeakMap, not an enumerable/private response field. The method rejects responses from other Gateway instances. This is not cross-provider history validation: callers must retain same-profile context, and .9–.11 model-state compatibility governs accepted switches. This private accessor itself adds no persistence.

## Error taxonomy — CURRENT V4.8.2

Errors are `ModelGatewayError`, with fixed safe message, `code: model_gateway_<category>`, `category`, nullable HTTP `status`, and `retryable`. No raw provider body, request/URL, original exception cause, key, image or reasoning is attached.

Categories: invalid_request, configuration, unsupported_capability, authentication (401/403), rate_limit (429), provider_unavailable (5xx), provider_request, format_unsupported, network, timeout, aborted, malformed_response, truncated, refusal, response_too_large, callback_error. Retryable marks network/timeout/rate-limit/unavailable classes; it is descriptive and does not trigger switching or HTTP retries.

Analysis/review/followup reuse `fetchModel`'s bounded pre-response network retry. Router/Vision keep one network attempt, matching their current owners. No partial response is retried or appended to a second stream. Unsupported output formats are distinguished with the existing review-format predicate, without exposing details or lowering validation. Explicit abort and deadline expiry remain distinct.

## Guard reuse / compatibility

`model-stream.mjs` supplies optional usage/finish callbacks and opt-in strict validation; existing callers keep its original default behavior. Gateway opts into strict completed messages, reuses SSE UTF-8/tool-fragment/size/DONE checks, and bounds/cancels both JSON and stream reads. Gateway caps responses at 8,000,000 bytes, Vision at 512,000 bytes / 18,000 output characters, and request JSON at 16 MiB. Gateway URL validation rejects userinfo/query/fragment and permits HTTPS or loopback HTTP with redirects disabled. These added checks apply to the standalone API; existing transports are not migrated implicitly.

Strict mode expects a single choice (index 0 or an omitted index for compatible responses). Unexpected indexes or multiple candidates are rejected before their text is emitted, preventing candidate streams from being mixed. Usage-only chunks remain accepted. Known socket/connection errors during body reading reuse `model-request` classification and become `network`, whereas invalid JSON/message shapes remain `malformed_response`. No body failure is replayed.

Deadlines reuse `createModelDeadline`: env-configured analysis idle/total bounds, router 8 seconds, Vision 60 seconds. Keepalive resets idle only; abort/timeout closes readers and disposes timers. Cancellation remains bounded even with a non-cooperative injected fetch/reader. Public deltas are previews, not validated delivery; later business integration retains review/delivery gates.

The adapter retains ownership of any received response until final cleanup, closing the response even when cancellation wins between fetch completion and reader acquisition. Responses arriving after cancellation are closed by the late-response handler. Regression tests sweep the handoff timing as well as active body reads.

The abortable-read helper also consumes an already-created read promise when reader.read() synchronously triggers cancellation before the helper receives that promise. Cancellation/timeout remains the returned error, while a simultaneous read rejection cannot become an unhandled process exception. Strict-unhandled-rejection child-process tests cover JSON/SSE, explicit cancellation and TimeoutError, without replaying the request.

V4.8.3 review adds cancellation checks immediately before and after content/activity/heartbeat callbacks. If a callback cancels the request, parsing stops before any later notification, including frames already buffered in the same network chunk. JSON activity cancellation likewise prevents the subsequent content preview. The adapter still closes the reader; it never replays a partial response.

Tests: `tests/model-gateway.test.mjs` covers the canonical API and guards. Since V4.8.3, `tests/model-call-inventory.test.mjs` checks the active adapter, migrated Agent boundary and absence of premature router/Vision imports, preserving historical inventory/hash validation and strengthening the endpoint/owner assertions for the migration.

## V4.8.3 text-call compatibility and migration

`agent.completion()` is a thin wrapper with no provider endpoint, credential lookup, response parser or model-name switch. It calls Gateway complete() and explicitly retrieves the private continuation message for existing checkpoint/tool history. Research/forced draft use purpose research; initial/supplemental review use review; the evidence-followup assessment uses followup. The latter is an injected callback owned by Agent, not a second transport in evidence-followup. Valuation review remains deterministic and is not an LLM call.

The wrapper freezes an in-memory env copy for one logical completion, preserving model/base/key identity across format negotiation, as the previous completion function did. This is not cross-job profile pinning. It retains one outer idle/total deadline across up to three format attempts. Activity/keepalive callbacks refresh that outer idle timer; neither fallback nor keepalive restarts the total budget. Each adapter call retains its own bounded reader/deadline cleanup. Shorter followup/caller deadlines remain authoritative.

The waiting-notice bridge returns the synchronous onWaiting result to the Gateway heartbeat guard. Returning a promise therefore fails with callback_error and consumes any rejection, matching the other lifecycle callbacks instead of silently discarding asynchronous failures. Existing synchronous waiting notices retain their payload and timing.

Factory-only `compatibility: 'legacy-text'` permits omitted/null finish_reason in non-stream JSON for research/review/followup, which existing compatible responses and fixtures used before migration. It validates message/tool/refusal shape using the corresponding content form, but reports finishReason as null rather than inventing provider metadata. Explicit invalid/truncated/filtered finish reasons, SSE completion/DONE requirements, single-choice validation, response bounds and hard business validation remain enforced. The default Gateway does not enable this option, and compatibility instances reject router/Vision requests. This option is a transport compatibility setting, not a routing policy mode.

The wrapper alone retains existing opt-in review negotiation: json_schema → json_object → text on normalized format_unsupported, using the existing predicate in the adapter. It preserves evidence and does not spend review validation/format-repair budgets on capability negotiation. Schema errors, authentication, 429/5xx, refusals and partial responses do not trigger this fallback. Review JSON parsing, provenance/financial checks, repair counts, followup limits and delivery gates stay with their existing owners.

`onFormatFallback` is a synchronous notification. Invalid callback types fail with invalid_request before dispatch; throwing or returning a promise fails with callback_error and stops before the next format attempt. Rejected promises are consumed and callback exception text/causes are not exposed. Successful synchronous notifications retain the existing format sequence, payload and review-repair budgets.

`legacyCompletionError()` translates normalized HTTP, truncation, refusal, network and timeout errors to the codes used by existing Agent recovery. Only safe fixed text/status is exposed; raw provider details and causes are not restored. The wrapper preserves its outer deadline's original timeoutKind and cancellation reason. Missing credentials now fail locally rather than sending Bearer undefined; unsafe URL forms/redirects and strict malformed responses also fail closed through Gateway. These transport changes are intentional; evidence requirements and financial definitions do not change.

Tests: `tests/model-migration.test.mjs` pins all six modes against the saved V4.8.2 executable baseline (full request/result/event/checkpoint hashes with object keys canonically sorted), validates missing-finish compatibility isolation, safe lifecycle callbacks, fixed connection identity and the shared fallback deadline. Existing review, followup, stream, resume and financial tests remain in force. Static inventory expects three unmigrated production transports plus one active Gateway adapter, rejects Agent provider calls/adapter bypasses, and leaves router/Vision migration reserved for V4.8.4.

## V4.8.4 router/Vision and diagnostic migration

Path classification and security intent use purpose router, stream false, and their unchanged 400/1200 token budgets. Their model/base cache keys and readiness still use the existing configuration owner; no model-name capability inference remains in the wrappers. Cache TTLs, active-call limits, manual overrides, original-question validation, rule fallback and cancellation propagation remain local. Each call snapshots env so the cache identity and dispatched connection agree. Gateway bounds router transport to 8 seconds; an explicitly shorter existing caller timeout remains authoritative. HTTP/network failures use one attempt and fall back to rules, never another model.

Vision uses purpose vision, stream false and 6000 output tokens. `visionStatus` reads Catalog imageInput and existing credential readiness; the exact supported legacy name / images override / off predicate moves into Catalog without changing its truth table and remains re-exported by vision-model. Provider thinking mappings stay in the adapter. The wrapper retains identical system/user prompts, page/region/image detail and trimmed output. Existing visual budget, OCR fallback, transcript/page validation, source archives and non-verified Evidence semantics are untouched. Image/request/response limits and 60-second bound remain enforced; received and late responses are closed on cancellation. `legacyVisionError` preserves safe HTTP status and incomplete/oversize notices without raw provider errors.

Factory-only compatibility `legacy-router-vision` permits an omitted JSON message.role, which the prior callers ignored and existing compatible fixtures omit. The public response still has canonical assistant role. Explicit invalid roles, missing/invalid finish reasons, refusal, multiple choices and malformed content remain rejected. This option only accepts router/vision purposes and is separate from legacy-text's missing-finish allowance; neither loosens the default Gateway. Router/Vision consumers still require stop, not tool_calls. SSE parsing remains strict.

The explicit synthetic diagnostic also calls Gateway for analysis with purpose research, non-streaming, 256 tokens, json_object and reasoning off. It keeps Vision transcription before analysis and does not send raw images to analysis. Explicit false stream replaces the old omitted field (both request non-stream output). Unsupported reasoning controls now fail closed through the adapter; no live provider certification is claimed.

AC01 is checked by scanning server/scripts/src/shared for known endpoint patterns: one active adapter, four migrated production owners, ten semantic production callers and one migrated diagnostic. Historical V4.8.0 inventory/hashes stay immutable; the checker maps retired anchors to current Gateway calls and rejects reintroduced direct transports, provider-name branches or adapter bypasses. The lexical scan is not a proof against arbitrary computed SDK endpoints.

No persistent ModelCall/modelState, profile pin, pricing lookup, policy switch or new image model is introduced. Six saved V4.8.3 wire/result hashes, actual cache/timeout/size tests and an offline run of the real diagnostic script provide acceptance evidence. Redirect rejection, bounded router reads and strict malformed-output handling are explicit transport hardening; successful business prompts/results remain unchanged.

## V4.8.5 research complexity — CURRENT isolated utility

Owner: `server/research-complexity.mjs`, synchronous `evaluateResearchComplexity(input = {})`. This pure utility does not import Gateway, read environment/time, call providers, mutate jobs, persist results or select models. No production owner imports it in V4.8.5; an executable isolation check enforces that boundary until authorized integration. It is a versioned workload heuristic, not a calibrated estimate of model ability, research quality or financial truth. Policy thresholds and RoutingDecision remain V4.8.6 work.

The input is a closed structured record. Optional fields may be omitted, undefined or null; they remain null in normalized signals. Counts must be nonnegative safe integers with no coercion. Extra keys and non-data/accessor records are rejected with safe `TypeError`, code `invalid_complexity_input`, message `Invalid research complexity input`; no caller value or exception is echoed. Ordinary server-owned data is expected; this is not a JavaScript proxy sandbox.

Second V4.8.4–V4.8.6 review: internal validated records now have no prototype, including the empty record used for omitted/null groups. Only own input data properties may supply observations. An extended Object.prototype cannot fill missing company/failure counts or invoke inherited field getters during evaluation. Public result objects remain ordinary JSON-compatible records; weights, score/version, thresholds and accepted input types are unchanged. Regression tests cover both evaluator results and policy's unknown-candidate behavior. This is defensive isolation, not evidence of an existing prototype-pollution entry point or a general JavaScript sandbox.

| Input | Meaning and source boundary |
|---|---|
| mode | Explicit A–F, corresponding to shared/research-framework; no question parsing or implicit B default |
| companyCount | Distinct companies in the declared scope; not automatically the number of security listings |
| markets | Dense list of CN/HK/US; trimmed, uppercase, deduplicated, sorted |
| currencies | Dense list of syntactic three-letter codes, normalized as markets; no currency-registry/FX validation or inference from markets |
| historyYears | Declared research horizon from plan; not the number of available observations |
| materials.documentCount / pageCount / imageCount | Caller-supplied distinct document/page/image workload; no reading text, counting crop duplicates or source archival side effects |
| valuation.methodCount / scenarioCount | Declared distinct valuation methods/scenarios; existing calculation/valuation owners retain all math and verification |
| evidence.conflictCount / missingCount | Explicit conflict/missing-data counts; the evaluator does not establish a conflict or validate facts |
| runtime.reasoningFailureCount / providerFailureCount / dataGapCount | Separately classified runtime observations; generic tool errors/retry counts must not be relabeled as reasoning failures |
| review.reasoningFailureCount / formatFailureCount / dataGapCount | Separately classified review observations; aggregate review attempts include format and evidence issues and must not be copied into reasoning failures |

Collections are limited to 32 entries before deduplication. Empty collections and explicit zero are distinct from unknown. No job-to-signal collector is implemented: research-framework, Agent receipts, researchStatus and review validation remain the factual input owners. A future caller must map known facts explicitly, preserve unknowns and classify failures before supplying these counts. User text, credentials, source bodies, reasoning text, timestamps and arbitrary error objects are not accepted inputs.

Output: `{version:1, score, level, reasons, signals, unknownSignals}`. Signals follow the input shape with all defined fields populated. Reasons are stable `{code,points}` entries in the fixed order below; code is the corresponding signal path. Positive scoring contributions are listed; positive non-scoring failure/missing counts are listed with points 0. Unknown signal paths are listed separately in the same deterministic order. Score is the sum of contributions, bounded 0–100. All-scoring-signals-unknown gives level unknown; otherwise low <25, moderate 25–49, high ≥50. With partial inputs, score and level describe only known contributions, not assurance that unknown workload is simple. These descriptive level boundaries are not model-routing thresholds.

| Signal, in reason order | V1 contribution (maximum) |
|---|---|
| mode | A 0, B/C 8, D 16, E/F 12 (16) |
| companyCount | 4 per company beyond the first, capped at three extras (12) |
| markets | 4 per distinct market beyond the first, capped at two extras (8) |
| currencies | 5 per distinct currency beyond the first, capped at two extras (10) |
| historyYears | 0 below 5, 4 at 5–7, 8 at ≥8 (8) |
| materials.documentCount | 0 below 4, 3 at 4–9, 6 at ≥10 (6) |
| materials.pageCount | 0 below 50, 2 at 50–199, 4 at ≥200 (4) |
| materials.imageCount | 0 at 0, 2 at 1–5, 4 at ≥6 (4) |
| valuation.methodCount | 4 per method beyond the first, capped at two extras (8) |
| valuation.scenarioCount | 3 per scenario beyond the first, capped at two extras (6) |
| evidence.conflictCount | 4 per explicit conflict, capped at three (12) |
| evidence.missingCount | 0; missing data is not a model failure |
| runtime.reasoningFailureCount | 1 per classified failure, capped at two (2) |
| runtime.providerFailureCount / dataGapCount | 0; service failures and missing data are not intelligence failures |
| review.reasoningFailureCount | 2 per classified failure, capped at two (4) |
| review.formatFailureCount / dataGapCount | 0; format/evidence repair is not proof of reasoning failure |

The maximum contributions sum to 100. These are explicit initial engineering weights because no prior scoring contract or empirically calibrated weights existed. Changes require a reviewed version/fixture update before policy consumption. Six hand-authored fixtures and boundary, uncertainty, failure-separation, normalization, immutability and isolation tests provide deterministic acceptance; they are not predictive-quality certification. No model upgrade, price comparison, health routing or review-validation decision may be inferred from the existence of this utility.

## V4.8.6 RoutingDecision — CURRENT shadow policy

`server/model-policy.mjs` is the new policy owner, reusing the unchanged V4.8.5 evaluator. `evaluateModelPolicy(signals = {})` returns `{policyVersion:1, complexity, candidate, reasons}` without I/O or model lookup. Candidate is null for unknown scoring inputs; otherwise `{slot: MAIN|PRO, reasoningEffort: low|high|max}`. These slots are recommendations, not executable ModelProfiles, and do not imply known capability, quality, health or price. Catalog still contains only legacy profiles.

Thresholds apply directly to the existing integer 0–100 score: 0–3 MAIN/low, 4–7 MAIN/high, 8–10 PRO/high, ≥11 PRO/max. Mode A always caps the candidate to MAIN/low, as required by MG-004. No score rescaling or V4.8.5 weight change is introduced. The spec did not define a conversion; consequently B alone scores 8 and B with five planned years scores 12. These uncalibrated thresholds readily saturate PRO/max and must not authorize production rollout. Missing-data/provider/format counts never add points; existing classified reasoning signals remain explicit only. Partial scores describe known contributions, not complete workload. Unknown scoring inputs yield no candidate instead of treating unknown work as simple.

Gateway supports `MODEL_ROUTING_MODE=dry-run` and `legacy` (default). Empty, unknown and unsupported `policy` values safely use legacy with no policy observation. The factory accepts optional `onRoutingDecision(decision)`; default writes one JSON record to the server console. Its sink is trusted server code, best effort and not awaited: throws/rejected promises do not fail or replay research. This observer differs deliberately from mandatory preview/format callbacks. No storage service or public telemetry route is added.

In dry-run only, Gateway consumes optional internal `routingContext.complexitySignals`. Agent supplies only `job.mode` and `job.plan.historyYears` to research/review/followup. Other counts, currencies, companies and failure classifications stay unknown; no listing-count inference, text analysis, live failure classifier or evidence scan is added. Router/Vision are not research-tier scored and log null candidates. Missing context logs unknown; invalid signals log null with `invalid_complexity_input`, never raw values/errors. Legacy ignores this optional observation data.

RoutingDecision is an in-memory/log schema, version 1: `event=model_routing_decision`, `routingMode=dry-run`, `executionMode=legacy`, purpose, actual `executionProfile` ID, nullable `executionReasoningEffort`, policyVersion, complexity, candidate and ordered reason codes. Null execution effort means omitted provider default, not inferred low/off. Candidate reasons are `complexity_unknown`, `mode_a_cap`, `score_0_3`, `score_4_7`, `score_8_10`, `score_11_plus`; non-scored purposes use `purpose_not_scored`. Decisions describe a prepared attempt before adapter validation/dispatch, not proof of a provider call or success. Format negotiations can emit multiple attempts; transport retries do not create a new decision. No job ID, wall time, tokens, cost, URL, model name, credentials, source text, prompts or hidden reasoning is logged. Durable correlation/ModelCall telemetry is V4.8.7 work.

Gateway still prepares the explicit/purpose-selected legacy profile and passes the identical request/profile to the existing adapter. Candidate fields are never fed back into request selection, effort, messages, budgets or public/private results. A pre-aborted or facade-invalid request emits no decision; adapter rejection can follow a prepared-attempt record. Mode changes never pin/switch models, change cutoff, persist checkpoint fields, bypass validation or refresh sources. There is no new modelState, migration or external API.

V4.8.4–V4.8.6 review: each Gateway complete() captures an in-memory environment snapshot before preparing its profile and notifying the dry-run observer. Catalog selection, routing mode, adapter connection/credentials and deadline options use that same snapshot. A trusted logging hook that reloads configuration cannot mix the old model with a new endpoint/key or alter this call's budget. The next complete() sees the updated environment; this is not a job-level pin or modelState. The regression reproduces the previous mismatch and checks both calls plus deadline settings. Six additional router/Vision dry-run golden comparisons preserve requests, results and cache behavior. See the [review report](../releases/V4.8/V4_8_4-6-review-report.md).

Tests: `tests/model-policy.test.mjs` covers thresholds, Mode A, uncertainty/failure separation, safe observation, explicit profile/effort preservation, HTTP failures and six original golden wire/result/event/checkpoint cases under dry-run. Static tests restrict complexity consumption to policy and policy consumption to Gateway. These lexical checks support the boundary, not arbitrary dynamic-code proof. Live model-quality comparisons and production policy remain deferred.

## Forbidden
- business logic branching on concrete model name;
- leaking API keys;
- exposing reasoning_content;
- cross-provider hidden state;
- sending images to profiles without imageInput.

## H0 implementation evidence

Current owners are model-routing/model-request/model-deadline/model-stream, agent completion, research-path, security-intent and vision-model. Direct provider configuration and model-name capability checks remain. This request/response API is FUTURE; H0 must not introduce it.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.

## V4.8.7 ModelCall / usage — CURRENT implementation

Gateway's optional factory onModelCall(record), or configureModelTelemetry(writer), observes one UUID per complete() call. A prepared profile emits started before adapter execution, followed by succeeded/failed/cancelled under the same UUID. Preflight failures retain a valid known purpose, snapshotted routing mode, and the profile already selected before subsequent request validation failed. Unresolved profile/purpose remain null; an unknown requested profile ID is never recorded as a selected profile. Preflight failures emit only a terminal record, without claiming an adapter attempt. Outside a withModelCallContext(jobId, run) scope, jobId is null; parallel scopes are isolated. Server index configures the existing storage writer and scopes research execution, including nested Vision/followup calls. Pre-job routing/uploads remain unassociated. No public API changes.

ModelCall v1 whitelist: id, nullable jobId/purpose/profile, routingMode and nullable policyVersion, status, startedAt/finishedAt, safe errorCategory/httpStatus, usage, per-field tokenSources, performance, nullable estimated billing. No environment/model connection, message/delta, raw exception, prompt, output, hidden reasoning or raw RoutingDecision signals. Normalization occurs again at storage. Each token field is provider or unknown; no tokenizer estimate is fabricated. Explicit provider zero stays zero. Billing source estimated exists only when the existing Gateway knows counts and prices. Missing/contradictory counts stay unknown. Provider metadata is not financial truth.

Successful latency/TTFT reuse Gateway adapter measurements; JSON TTFT remains receipt approximation. Failed/preflight calls use elapsed Gateway recorder time, including any bounded start write, and unknown TTFT/usage because the adapter exposes no validated partial-result metrics. A succeeded record describes completed transport; cancellation during its terminal write can still cancel the caller. Both TimeoutError and the existing deadline's model_timeout code remain timeout errors at this boundary, preserving legacy recovery classification; ordinary cancellation remains aborted. No response is replayed for telemetry errors.

The terminal cancellation check uses the validated signal reference captured for dispatch, including an originally absent signal. Reassigning/deleting the caller's request.signal or installing a getter while telemetry is pending cannot suppress the original cancellation, attach an unrelated cancellation, or inject a raw exception into finalization. This is per-call consistency, not persistent V4.8.9 modelState.

Mongo model_calls upserts by id. Started is insert-only so a late start cannot overwrite a terminal status; terminal retry of the same record is idempotent. A process crash can leave started, never falsely succeeded. Writer promises are awaited with a 1000ms bound per start/terminal; errors/timeouts emit a fixed safe warning and do not abort research. Timed-out writes may complete later; server job deletion rejects late writes through tombstone checks and removes matching telemetry. This is best-effort operational telemetry, not a lossless transactional audit ledger. No durable queue or automatic historical backfill.

storage.modelUsageSummary(jobId) queries records on demand without modifying jobs/public payloads. It returns call/status counts; for each token field knownTotal (null when none known/overflow) and unknownCalls; per-currency knownEstimatedCost plus unknownBillingCalls. It never treats missing calls/tokens as complete zero usage and never combines currencies. Summary completeness is limited to recorded calls, with no guarantee for disabled/unavailable writers. No old usage is inferred.

Schema migration 2, model_call_indexes, adds only jobId/startedAt index; Mongo _id supplies call uniqueness. Historical job/evidence data are unchanged. Rollback disables telemetry and retains the v2 migration definition; pre-v2 binaries reject the upgraded schema by existing downgrade protection. Do not delete migration records or research data to force an old binary to start. Checkpoint modelState belongs to V4.8.9, health selection to V4.8.8, and cost-based routing is not implemented.

## V4.8.8 health routing — CURRENT (internal)

Gateway factory healthRouting defaults to observe. Explicit fallback mode requires a validated custom Catalog and an ordered list of {primary, fallback, qualityApproved: true}; this is operator attestation, not a model-name inference or a measured quality score. Chained/cyclic, missing and cross-tier choices fail configuration. At .8 acceptance Catalog allowed legacy tiers only; .10 adds MAIN/PRO metadata, while health selection still rejects cross-tier pairs. Candidate purpose, actual request capabilities and known context limits precede cooldown selection; unsupported/unknown requested structured-output or effort support cannot be treated as certified. No safe alternate yields provider_unavailable.

Only fresh system/user requests without explicit profile or private/tool history can switch before dispatch. No retry/replay across models after any failure or partial output. Default business callers only observe. Recent logical-call rate_limit/provider_unavailable/network/timeout outcomes live in bounded expiring process-local memory independently of best-effort ModelCall writes. Health never modifies complexity/reasoning failure counters. Connection identity belongs to the adapter; it hashes protocol/endpoint/model without keys and is not public metadata. See tests/model-health.test.mjs and the .8 completion report for bounds and limits.

## V4.8.9 modelState — CURRENT

Owners: server/model-state.mjs, server/model-connection.mjs, existing research-create/resume/retry, Agent/Gateway and private storage/public filters. New jobs/checkpoints pin mode/policy, profile/model/opaque endpoint identity and effort with empty escalation history. Absence alone retains historical legacy reads; corrupt or incompatible present state throws before dispatch/tool/retry acquisition. Key rotation does not change identity. Gateway verifies custom Catalog dispatch against pins; process-local job scopes isolate concurrent calls. No cross-provider escalation or canonical ResearchState is introduced. New jobs with unusable checkpoints refuse automatic reacquisition. Tests: tests/model-state.test.mjs and tests/model-state.integration.mjs, including actual process exit/restart with MongoDB and public-list exclusion. Current profile metadata is not hidden reasoning and is nevertheless private. Historical TARGET gaps remain distinguished from these local enforced pin guards.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-flash explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.

## V4.8.11 rollout gate — PARTIAL release acceptance

CURRENT code: server/model-rollout.mjs validates an operator-owned live-model-comparison report against exact model/connection/configuration and model-owner code fingerprints. At least 50 unique live cases, all six modes, passing candidate delivery/citations, zero critical fact errors, dry-run and rollback acceptance are required. Offline fixtures, missing credentials/report, changed model/code, duplicate or incomplete cases fail closed to legacy. A trusted local report is operator attestation, not cryptographic proof of honest evaluation.

Only an accepted new policy job consumes existing complexity recommendations; Mode A stays MAIN/low, unknown complexity stays legacy. An optional initial field in modelState v2 pins the initial step; absence retains .10 MAIN/low. Escalation receipts must be contiguous from that step. Business callers still do not select provider names, and all endpoint traffic stays in the single Gateway adapter. Existing policy checkpoints pause after production rollback; they are not rewritten or resumed on a different model. Public routing labels reflect the actual active analysis profile without exposing private state.

Offline validation: tests/model-rollout.test.mjs and tests/fixtures/model-routing-offline-cases.json run 60 baseline/candidate transport safety comparisons plus gate/rollback tests. They are not research-quality evidence. User deferred all paid comparison and required legacy; live acceptance and production rollout therefore remain pending. A one-command legacy server entry exists: pnpm start:legacy after stopping the previous server instance. It overrides inherited mode without editing .env or deleting records. No V4.9 or unified V5 benchmark platform is implemented.

## 2026-09-11 模型名称配置更新

按用户明确要求，当前分析、PRO 档及默认视觉模型统一使用 `deepseek-flash`；MAIN 绑定与路由、升级和验收门槛不变。以上 CURRENT 绑定名称反映本次更新，不代表历史付费质量验证已完成。历史任务模型身份及验收记录不回写；详见 [变更报告](../releases/V4.9/model-name-unification-20260911.md).
