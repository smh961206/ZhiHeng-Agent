# V4.8.0 — Current LLM call inventory

Status: CURRENT inventory. Baseline commit: `087e74ec3a5b5fcba4bb40ad0c9ad1a8a214c9ae` (accepted H0). Gateway, profiles and policy remain FUTURE. Runtime framework is still 4.7.

Machine-readable owners, purpose call sites, anchors and historical hashes: [inventory JSON](model-call-inventory.json). Acceptance: [V4.8.0 report](V4_8_0-completion-report.md).

## Discovery boundary

Inspected server, scripts, src and shared code, package dependencies, example environment files, model transport helpers, all direct endpoint matches and their callers. There are **four production endpoint construction sites**, **ten production purpose/caller entries**, and **one separate direct diagnostic request**. Repeated loop iterations are not new call sites. No additional provider SDK or alternate API-family call was found. Frontend API requests, market/filing providers, web search and DNS requests are not LLM calls. No real environment secret or live provider request was needed.

The static checker scans JavaScript files under all four roots for Chat Completions, Responses, Messages and generateContent candidates, and checks unique purpose anchors, completion/read-call counts, transport/purpose consistency and named regression tests. It also checks each declared request function and literal stream property (or its absence) against the owner source. Dynamic stream values or multiple declarations require manual review; this lexical check does not infer payload data flow. Scan roots/extensions are immutable and fixed independently of the inventory so neither document edits nor importing code can narrow coverage. Source paths reject dot segments, empty segments and noncanonical separators before reading the referenced file. The checker itself is the sole excluded script because it contains search expressions; all other scripts remain scanned. Comments, strings and unrelated Messages/Responses paths can produce candidates requiring review. This is a reviewed lexical baseline, not a whole-program guarantee against computed URLs, aliases or dynamically loaded SDKs. Future changes to network dependencies and call owners still require review; update the inventory when migrating a call rather than keeping a second implementation.

Reproducible read-only checks from the repository root:

```text
node scripts/check-model-call-inventory.mjs
node scripts/check-model-call-inventory.mjs --baseline
```

The first command needs only the checkout and Node; it neither changes MANIFEST nor calls a provider. The optional --baseline command also checks each transport's historical source hash against the pinned local Git commit (no fetch). Inventory hashes are SHA-256 of UTF-8 text after CRLF→LF normalization, making them independent of checkout line endings. A shallow checkout without that commit cannot run the optional provenance check; ordinary inventory/unit checks still work. The full one-subrelease file audit remains separate local evidence, not a claim made by this five-transport hash check.

## Production transports and parameters

All four currently append `/chat/completions` to the configured base, use JSON POST with Bearer authorization, and accept HTTPS or loopback HTTP. URL/response protections differ; do not silently discard them during migration.

| Owner | Model/config | Current request shape | Response/guards |
|---|---|---|---|
| server/agent.mjs completion → model-request.mjs fetchModel → model-stream.mjs readCompletion | modelRouting analysisModel/base/key from LLM_MODEL, LLM_BASE_URL, LLM_API_KEY | messages, stream=true; optional tools + tool_choice=auto; optional response_format. No explicit max_tokens, thinking or reasoning_effort; provider defaults remain effective. Images rejected before request. | SSE assembled by existing parser; non-SSE JSON compatibility branch. Idle/total deadlines, bounded pre-response network retries; review-format fallback only for recognized unsupported format responses. |
| server/research-path.mjs createPathResolver | LLM_ROUTER_MODEL or analysisModel; analysis base/key | stream=false, max_tokens=400, text messages; thinking.type=disabled only when model matches /^deepseek-/i. JSON requested in prompt, no response_format field. | 8s default timeout, 2 concurrent requests, 128-entry cache; finish_reason=stop, valid A–F mode and short reason required. Errors use rule recommendation unless caller aborted. |
| server/security-intent.mjs createSecurityIntentExtractor | Same router override/fallback as path resolver | stream=false, max_tokens=1200; same DeepSeek-specific thinking condition. Prompt-only JSON, no tools. | Independent 8s/2-concurrent/128-entry guards. Requires stop, exact user-text mentions and original market evidence; failure returns rules/empty semantic targets for directory resolution. |
| server/vision-model.mjs readVisionImages | visionModel/base/key via LLM_VISION_MODEL, LLM_VISION_BASE_URL, LLM_VISION_API_KEY, with analysis base/key fallbacks | stream=false, max_tokens=6000; text + user image_url blocks with detail=high; thinking disabled only for the exact legacy Vision model. | Explicit capability check, 1–12 images, 16 MiB request cap, redirect=error, URL credential rejection, 60s timeout, 512000-byte response cap, stop + nonempty text ≤18000 chars. Provider error bodies are not exposed. |

Legacy defaults in model-routing.mjs are deepseek-v4-pro, deepseek-v4-flash-vision-exp and https://api.deepseek.com. These describe executable code, not a recommendation or a newly introduced provider contract. LLM_VISION_INPUT=off disables Vision; images opts in to another configured model; auto recognizes only the exact legacy Vision model. Provider/model-name branches are migration debt under ADR-002, not new capabilities.

## Purpose and actual invocation chain

| Purpose / entry | Invocation owner | Boundary to retain |
|---|---|---|
| router: path recommendation, plan and job creation | index.mjs → researchPathResolver.recommend/resolve → research-path.mjs | Manual choices, cached decision IDs, expiry, rule fallback and classification-only prompts. |
| router: company/security mention extraction | security-resolver.mjs → extractSecurityIntent → security-intent.mjs | Directory validation still owns identity; the semantic model must not invent symbols/markets. This is a second router purpose, not a second provider adapter. |
| research: tool loop | agent.mjs runAgent → requestCompletion → completion | Text-only analysis, current tools and budgets; private assistant/tool messages survive compatible resume. |
| research: budget-exhausted draft | same owner, separate finalMessage requestCompletion site | No tools; disclosure of unfinished verification; draft still requires independent review. |
| review: initial review, format/validation repair, supplementary tool rounds and re-review | agent.mjs review requestCompletion site | Up to five review attempts; supplementary tool rounds reuse this call site. Current review-format and validation/recovery loops remain in their owners. No new model-tier escalation. |
| followup: assess whether matched original evidence resolves a gap | evidence-followup.mjs invokes injected assess callback defined in agent.mjs | Uses analysis model through completion; no tools or response_format; prompt JSON parsed by assessor; 60s combined deadline. Evidence-followup owns provenance/quote validation, not provider transport. |
| vision: selective PDF enhancement | visual-reading.mjs enhancePDFWithVision → injected read=readVisionImages | Selected-page/job budgets, original text/OCR retained on failed enhancement, Vision blocks marked needsReview. |
| vision: image material transcription | visual-reading.mjs readImageMaterial → same read | Render/validate/asset archive; the result remains unverified material. |
| vision: original-page audit reread | agent.mjs refreshVisualContext → visualAuditContext → same read | 90s review window, six-page/12 MiB aggregate limits and asset/text binding; analysis receives text transcription, not images. |
| vision: targeted official PDF page read | agent-page-reader.mjs createAgentPageReader → injected readVision=readVisionImages | Already-collected URL and exact original hash, page limits, archived reading; visual observations cannot independently verify calculation inputs. |

material-vision.mjs and document-reader.mjs dispatch uploaded PDF/image material into these existing readers. PDF processing can enhance extracted pages through visual-reading.mjs. agent-execution.mjs builds execution context/budgets and validates public plans; it does not issue provider requests. server/router.mjs validates input, while actual semantic path calls are in research-path.mjs/index.mjs.

## Streaming, retry, review format and persistence

- model-request.mjs retries only transient failures before any response, at most three attempts with 1s/2s waits. It does not retry HTTP statuses or replay partial streams/tool execution. All analysis-format attempts share a deadline; each may use the transport retry helper.
- model-deadline.mjs defaults to 300s idle and 1800s total. LLM_TIMEOUT_MS clamps to 30–600s and LLM_MAX_DURATION_MS to 30–3600s. Content/tool/reasoning activity and recognized keep-alive comments refresh idle timeout, not total duration.
- model-stream.mjs limits SSE bytes to 8000000, validates tool-fragment indices and assembled identity, and requires finish + DONE. It rejects truncation/refusal and incomplete streams. The non-SSE branch has different completeness/size behavior; record that difference rather than asserting equivalent protection.
- review-format.mjs selects json_schema by default, json_object or text by explicit LLM_REVIEW_FORMAT. Auto fallback can step schema → object → text on supported error classification; current hard review/Evidence/finance validation remains mandatory after parsing. Review with supplementary tools omits response_format for that request.
- reasoning_content is retained only in private model messages/checkpoints for continuation; public deltas emit content only. job-stream.mjs excludes checkpoint state. No common ModelCall record, normalized usage/TTFT/cost, pinned profile/policy or cross-provider state compatibility exists. Usage in provider responses is not a canonical telemetry record.
- research-resume.mjs checks scope/framework/Knowledge and reconstructs pending tool calls. It does not pin provider/model identity in resumeScope. Changing environment config between attempts is therefore a future compatibility concern. Compatible resume retains saved evidence/market data; rejected checkpoints may restart acquisition as already documented in H0. V4.8.0 changes neither branch.

## Diagnostics, exclusions and tests

scripts/dual-model-diagnostics.mjs first calls the existing image reader, then directly POSTs to the analysis endpoint with thinking disabled, max_tokens=256, json_object and stream omitted under a 90s combined signal. It is a synthetic live connectivity probe, not a production research or benchmark path. scripts/vision-input-diagnostics.mjs indirectly exercises existing Vision PDF reading. Neither was executed here; no billable/live model validation is claimed.

Other network owners reviewed: market-request.mjs (market/filing HTTP), web-search-provider.mjs (search), web-evidence-request.mjs (DNS/public lookup), longbridge workers/clients (broker data), src/lib/api.js (own backend), scripts/report-smoke.mjs (saved job read). OCR/parser workers are not model API adapters. Current dependency manifests include no LLM SDK. Tests inject model responses/fetch implementations and are not additional production endpoints.

Baseline tests: model-request, model-deadline, streaming, research-path, security-intent, visual-reading, research-resume and review-format: 62 passed. model-call-inventory.test.mjs now includes nine tests, covering live inventory validation and rejection of missing endpoints, reduced/mutated scan scope, duplicate/misclassified callers, empty or ambiguous anchors, nonexistent/misplaced named test evidence, mismatched request/stream metadata and noncanonical source paths. Budget-exhausted synthesis and targeted visual page reading are both covered in agent-capabilities.test.mjs, not research-pipeline.test.mjs or agent.test.mjs respectively. These names establish traceability, not automated proof of every test's semantics. Full node:test suite is recorded in the completion report. Existing H0 MongoDB/UI/deployment results remain historical; they are not reported as newly executed V4.8.0 tests.

## Scope and handoff

V4.8.0 implements inventory only. ModelProfile/Legacy Profiles belong to V4.8.1; normalization to V4.8.2; analysis call migration to V4.8.3; both router purposes and Vision to V4.8.4. MODEL_ROUTING_MODE is FUTURE, not a usable rollback switch at this baseline. Checkpoint modelState/usage persistence and benchmark/policy rollout in the generic template are later-subrelease requirements, not permission to implement them here.

No schema/API/environment/feature flag or runtime changes. Rollback restores only inventory/docs/static tests and manifest entries. Later migration must reuse model-request/deadline/stream and preserve each call-specific guard rather than introduce parallel completion parsers. No real routing quality/cost comparison or ≥50-case policy benchmark is claimed by this zero-runtime-change subrelease.
