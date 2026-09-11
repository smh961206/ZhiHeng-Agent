# Current Implementation Map

## V4.8 regression and loading optimization — CURRENT

Existing src/components/ResearchPages.jsx now also owns the lazy workbench boundary; App retains form/draft state and requests focus only after an explicit start action. Existing shared/research-export is loaded on download. Existing research-decision.css owns the compact summary-to-report gap. No model/research/schema boundary changes. See [regression report](../releases/V4.8/V4_8-regression-optimization-report.md) for all 289 UI scenarios, isolated recovery/deployment evidence and offline/live acceptance distinction.

## V4.8 frontend alignment — CURRENT presentation

Screenshot follow-up: normal ready/loading KnowledgeStatus banners are removed from home/workbench/handbook; actionable errors and pending-revision notices retain their existing owner and creation gates. The global platform control provides version explanation and refresh. Handbook headings no longer present framework 4.7 as the current platform release; saved report/rule version metadata remains historical and is explicitly labeled. Existing workbench-layout styles own balanced step padding and icon alignment. See [follow-up report](../releases/V4.8/V4_8-frontend-review2-report.md). No framework version, Knowledge content, model routing or recovery rule is changed by this presentation work.

The user authorized platform copy, styling and interaction updates after the model foundation work. Existing React pages and research flows remain the owners. src/components/PlatformStatus.jsx consumes the existing public config hook, distinguishes configured/unknown/unconfigured state and exposes no health, cost or policy activation assertion. src/components/DocumentReadingSummary.jsx labels analysis/visual roles generically and shows only model names already saved in public job.modelRouting; configuration is not proof of a call. src/platform.css owns shared presentation, while existing domain layouts remain intact. The existing use-tab-autoplay hook now supports explicit pause/resume, alongside reduced-motion, focus and visibility guards. No server/shared/Knowledge behavior or schema changes. Tests: tests/platform-v48-ui-scenarios.mjs registered by the full UI runner. See [frontend report](../releases/V4.8/V4_8-frontend-completion-report.md).

V4.8.11 comparison executor review: existing scripts/model-comparison.mjs and scripts/model-comparison-worker.mjs own frozen input preparation, run/arm/input checkpoint binding and archived coverage replay. They reuse researchResume and Agent validation. Archived official report text and US XBRL core facts remain distinct; quotes, directories and shareholder-action disclosures cannot satisfy primary financial report coverage. See [second review](../releases/V4.8/V4_8_8-11-review2-report.md). This is CURRENT local executor safety, not live quality acceptance or production policy activation.

Status: CURRENT — calibrated during H0 against checkout `b7592abc4b888e218bbdfca958230366919ea3bb`.

## V4.8.11 isolated comparison executor — CURRENT; live acceptance pending

V4.8.8–.11 review: Agent attaches refreshed Vision material after restoring/rebuilding the active review messages, and updates the existing normalized material for subsequent transitions. The executor rejects non-string or case-insensitive colliding case IDs, binds each result to its run/corpus/input/arm, verifies the stored corpus during export, and checks the execution day before each new arm. See [review report](../releases/V4.8/V4_8_8-11-review-report.md). Paid pilot work remains deferred by the user; no live quality acceptance is claimed.

Owners: `scripts/model-comparison.mjs`, `scripts/model-comparison-worker.mjs`; tests: `tests/model-comparison.test.mjs`, `tests/fixtures/model-comparison-offline.json`. The CLI runs the existing Agent/Gateway/review path twice on identical frozen text material, with existing initial policy recommendations and private compatible checkpoints. It adds no provider endpoint, app API or production policy activation. Each HTTP attempt reserves an operator-estimated amount before dispatch, under a durable request-count limit; unknown actual cost remains null. Isolated processes use local artifacts, no MongoDB, no fresh acquisition/web sources. Missing original pages stay missing. Offline results cannot export acceptance; real results require a separate artifact-bound human review and the unchanged >=50-case rollout validator. Visual assets, dynamic collection and automatic semantic grading are outside this executor's scope. See [runbook](../releases/V4.8/model-comparison-runbook.md).

Runtime: React 19 / Vite 6, Node >=22.13, MongoDB / GridFS. `shared/research-framework.mjs` declares framework 4.7 and contract version 7. The Harness CURRENT pointer is separate from runtime/Knowledge versions. V4.8.4 completes Gateway migration for router and Vision as well as the synthetic diagnostic.

V4.8.1 added Catalog; V4.8.2 added Gateway; V4.8.3 integrated text research; V4.8.4 integrates the remaining callers. H0 and V4.8.0 inventories remain historical baselines, not current endpoint ownership.

## Status and evidence

CURRENT describes an implemented behavior; PARTIAL describes an existing predecessor of an incomplete target contract; FUTURE is a design reservation. DEPRECATED requires an approved migration: H0 newly deprecates nothing. Archived Knowledge and legacy readers remain compatibility assets.

The complete tracked code/test/active-Knowledge file inventory, hashes and lexical import/export index is [repository-inventory.json](../releases/H0/repository-inventory.json). It includes remaining frontend, shared, provider, worker and diagnostic files beyond the major owners below. This is an inventory, not a proof of every semantic property. [Audit findings](../releases/H0/audit-findings.md) records gaps and overlaps.

## Model calls and transport — CURRENT

Owners: `server/model-routing.mjs`, `server/model-request.mjs`, `server/model-deadline.mjs`, `server/model-stream.mjs`, `server/vision-model.mjs`.

Call sites: `server/agent.mjs` (research/review and followup assessment), `server/research-path.mjs` (path classification), `server/security-intent.mjs` (mention extraction), and Vision. `server/router.mjs` validates research input/modes; it is not a provider Gateway.

Environment-configured routing still selects fixed legacy models. Gateway's adapter owns all provider requests: research retains bounded pre-response retry; router/Vision retain one attempt, their own budgets and strict completion. Private reasoning remains in existing private messages/checkpoints. Path/intent still own caching, concurrency and rule fallback; Vision's wrapper retains image assembly, readiness and safe error translation, while Catalog/adapter own capability/wire guards.

Tests: `tests/model-request.test.mjs`, `tests/model-deadline.test.mjs`, `tests/streaming.test.mjs`, `tests/research-path.test.mjs`, `tests/security-intent.test.mjs`, `tests/visual-reading.test.mjs`.

CURRENT: internal health selection, new-job pins and safe escalation; PARTIAL: policy rollout with live quality gate still closed. FUTURE: V4.9 canonical Vision. Dry-run policy and V4.8.7 usage persistence are implemented below; .7 deployment acceptance has passed. Reuse existing transport protections, not a second stream parser. Cross-provider continuation is limited to the explicit acknowledged context-rebuild boundary; arbitrary private history cannot transfer.

V4.8.0 recorded [four production transports and ten purpose/caller entries](../releases/V4.8/model-call-inventory.md), including both router purposes, forced draft, supplementary review, four Vision readers and diagnostics. V4.8.3 replaces its Agent transport with model-adapter while retaining all ten caller anchors and the historical inventory/hash evidence.

## Model Catalog and Legacy Profiles — CURRENT; Gateway contract PARTIAL

Owner: `server/model-catalog.mjs` adds a pure internal metadata API and validated, immutable ModelProfile v1. It reuses `server/model-routing.mjs` for model defaults and, since V4.8.4, owns the shared legacy image capability predicate re-exported by `server/vision-model.mjs`. Gateway resolves all migrated calls through this Catalog. No parallel provider client, request parser or routing policy was added.

Three stable legacy identities describe analysis (research/review/followup), router (path and security intent, including its model override), and Vision. Router and analysis reference the same existing connection owner. Catalog serialization excludes credentials, connection URLs and unrelated environment fields. Capabilities describe configured usage; provider identity, optional structured/reasoning support, pricing and provider token limits remain unknown where not established. Vision readiness still separately requires credentials.

Tests: `tests/model-catalog.test.mjs`, `tests/visual-reading.test.mjs`, and the existing model/router/stream regressions. Catalog metadata is not a provider certification, health signal, job pin or working Gateway. Schema version 1 belongs to configuration; no research/checkpoint schema or runtime/framework version changes.

V4.8.1 review tightened metadata validation: dense purpose lists and enumerable data-only records prevent accepted values from changing or disappearing during copying/serialization. Accessor properties and array overrides are rejected; normal legacy profiles and transport behavior remain compatible.

CURRENT V4.8.2 normalizes requests/responses; V4.8.3 migrates text research; V4.8.4 migrates router/Vision; V4.8.7 implements telemetry persistence as detailed below. Credential resolution remains with `modelRouting`; future adapters must reuse these owners. V4.8.8–.10 add internal health selection, new-job model-state compatibility and explicit MAIN/PRO profiles. Production policy quality acceptance remains pending.

## Model Gateway — CURRENT; production policy quality acceptance pending

Owners: `server/model-gateway.mjs` exposes complete/explicit private continuation APIs; `server/model-adapter.mjs` owns the one new standalone provider endpoint and legacy wire compatibility; `server/model-gateway-result.mjs` normalizes safe errors, usage, nullable billing and public messages. Existing `server/model-stream.mjs` adds opt-in strict validation and metadata callbacks; its legacy defaults remain. The adapter reuses `model-request`, `model-deadline`, `modelRouting` and the existing review-format unsupported-format predicate.

Canonical responses exclude reasoning; a same-instance WeakMap-backed method returns private continuation messages only when explicitly requested. New-job model-state pins and internal health/escalation are implemented in .8–.10; no new public route is added. Production policy remains disabled by the .11 live-quality gate. V4.8.7 adds independent database ModelCall records below; V4.8.6 adds shadow observation. V4.8.4 has one provider endpoint in `model-adapter.mjs`; Agent, path, security intent and Vision delegate to Gateway, as does the diagnostic script. Ten production semantic callers remain, and historical baseline hashes are not rewritten.

Tests: `tests/model-gateway.test.mjs`, `tests/model-call-inventory.test.mjs`, `tests/router-vision-migration.test.mjs`, and existing streaming/request/deadline/router/Vision tests. Unknown optional capabilities/prices remain unknown; legacy explicit efforts remain restricted; v2 profiles require documented low/high/max. Non-stream TTFT is a receipt approximation; safe switches require acknowledged context rebuild. Durable telemetry now exists in V4.8.7 below. All callers now use Gateway's bounded reads/URL guards. See [contract](../contracts/model-gateway.contract.md) and [V4.8.4 report](../releases/V4.8/V4_8_4-completion-report.md).

V4.8.2 review closes the fetch-to-reader cancellation gap, rejects multiple/unexpected choice indexes in opt-in strict parsing, and enforces synchronous preview callbacks without unhandled promise failures. `model-request.mjs` exports a shared network-error classifier for body failures; existing retry behavior is unchanged. These corrections affect standalone Gateway execution, not current business callers.

A further V4.8.2 request-boundary review rejects invalid explicit profile selection, sparse tool lists, and null stream/token options before dispatch. Valid omitted-option defaults and explicit compatible profiles remain unchanged.

V4.8.3: `agent.completion()` calls Gateway with explicit research/review/followup purposes and returns private continuation only to the existing execution/checkpoint path. It retains format negotiation, waiting/retry notices, one logical-call deadline and existing recovery error codes. The adapter still owns provider configuration and strict parsing. A factory-only legacy-text compatibility option accepts missing JSON finish metadata without inventing it; SSE and standard Gateway guards stay strict. Missing credentials/unsafe URLs/malformed completed responses fail closed. `tests/model-migration.test.mjs` compares six modes against pinned pre-migration requests/results/events/checkpoints. Review, followup, valuation, financial/Evidence and resume business owners are unchanged. See [V4.8.3 report](../releases/V4.8/V4_8_3-completion-report.md) for acceptance and test limits.

V4.8.3 review preserves waiting callback error handling across the Agent bridge and stops buffered Gateway notifications immediately on cancellation. The existing wrapper/adapter remain the owners; no new subsystem or routing behavior is introduced. Regression evidence: `tests/model-migration.test.mjs` and `tests/model-gateway.test.mjs`.

A second V4.8.3 review consumes read rejections when cancellation happens synchronously inside reader.read(), and applies the shared synchronous callback guard to format-fallback notifications. `model-gateway-result.mjs` now owns that reused guard. Error normalization and cancellation handling change only in these failure paths; policy, parsing and business validation remain with their existing owners.

V4.8.4 keeps path/intent cache keys (question/model/base), TTLs (semantic 10 minutes, rules 30 seconds), manual choices, concurrency and exact security parsing in their existing modules. Vision keeps page/crop assembly, 12-image/16 MiB request and 512,000-byte/18,000-character response limits, 60-second deadline, visual budgets and source validation. Catalog owns the exact legacy image predicate; vision-model re-exports it for compatibility and consults the capability field. The scoped legacy-router-vision option only permits an omitted JSON assistant role; finish_reason=stop remains required by these callers. Six before/after wire/result comparisons and offline diagnostic coverage verify compatibility. No future policy/state/feature flags are introduced.

## Research complexity scoring — CURRENT utility with dry-run integration

`server/research-complexity.mjs` exports pure `evaluateResearchComplexity()` over explicit structured mode/company/market/currency/history/material/valuation/evidence/runtime/review signals. It returns versioned 0–100 score, descriptive level, ordered contribution codes, normalized signals and unknown paths. Weights are V1 engineering heuristics, not validated model-routing thresholds. Missing-data, provider-failure and format-failure counts retain zero-point reasons and never become reasoning failures. At V4.8.5 acceptance no production module imported the evaluator. V4.8.6 authorizes only the dry-run consumer below; create/workflow, execution budgets and review gates remain unchanged.

Existing data owners remain `shared/research-framework.mjs` (mode/plan/history), `server/agent-execution.mjs` (execution receipts/status), Agent review validation and existing Evidence/calculation/visual modules. No job-to-signal collector is built in V4.8.5: distinct company versus listing counts, workload and classified reasoning failures must be established by a future caller; unknowns stay null. `tests/research-complexity.test.mjs` covers six fixtures, A–F, normalization, thresholds, missingness, failure separation and an executable no-integration boundary. Policy decisions belong to V4.8.6 and persistent telemetry/modelState to later releases.

## V4.8.6 dry-run policy — CURRENT; production selection gated in .11

Second review hardens the existing evaluator's internal record copies against inherited field values/getters. Omitted fields and null nested groups remain unknown even if Object.prototype has been extended elsewhere in the process. No scoring weights or public result shape change; `tests/research-complexity.test.mjs` and `tests/model-policy.test.mjs` reproduce and cover this input-isolation boundary. No such prototype write path was identified in this review. See the [second review report](../releases/V4.8/V4_8_4-6-review2-report.md).

`server/model-policy.mjs` consumes the unchanged pure evaluator and computes MAIN/PRO effort candidates. `server/model-gateway.mjs` observes these only when MODEL_ROUTING_MODE=dry-run; default/unknown values retain legacy without observations. In dry-run, actual profile/effort remain legacy and separate from recommendations. V4.8.10 binds explicit MAIN/PRO Catalog profiles; .11 permits new-job selection only after a matching real quality report. No adapter, transport or parallel routing system is added.

Agent forwards only known job mode and plan historyYears for research/review/followup. Remaining signals stay unknown; router/Vision are not tier scored. The V4.8.5 no-caller boundary above describes its acceptance baseline; authorized consumption now occurs only in policy, with executable dependency checks. `tests/model-policy.test.mjs` verifies thresholds, Main/low Mode A cap, missing/provider/format invariance, observer failure isolation and all six pinned research wire/delivery/event/checkpoint hashes with dry-run enabled. Existing model migration and router/Vision suites remain.

Limits at V4.8.6 acceptance: raw 0–100 complexity is compared directly to 0–3/4–7/8–10/≥11 policy bands, with no undocumented conversion or weight change. B plus five years already recommends PRO/max. These remain uncalibrated recommendations, not quality evidence. V4.8.7 subsequently added persistent telemetry, .8 health observation, .9 modelState, and .10 explicit failure classification/internal escalation. Full job signal collection and cost selection remain absent; .11 production policy stays gated on real quality acceptance.

Review of V4.8.4–V4.8.6: Gateway now snapshots env once per complete() before policy observation; Catalog and adapter reuse this snapshot so logger-triggered configuration reload cannot mix an old model with a new connection/key/budget. Later calls still see new configuration. This is in-memory per-call consistency, not V4.8.9 modelState. Router/Vision now have six dry-run golden/cache comparisons in addition to legacy comparisons. See the [review report](../releases/V4.8/V4_8_4-6-review-report.md).

## Research orchestration — CURRENT

Owners: `server/index.mjs`, `server/router.mjs`, `server/research-create.mjs`, `server/research-path.mjs`, `server/agent.mjs`, `server/agent-execution.mjs`, `server/research-workflow.mjs`, `server/research-context.mjs`, `server/research-baseline.mjs`.

Shared rules: `shared/research-framework.mjs`, `shared/research-approach.mjs`, `shared/deep-research.mjs`, `shared/earnings-update.mjs`, `shared/company-comparison.mjs`, `shared/execution-discipline.mjs`.

Six A–F paths cover quick screen, company research, earnings update, comparison, portfolio/execution review and shareholder return. One orchestrator uses evidence/tools and independent review. Creation has submission identity, duplicate and concurrency guards. Public plans require real returned tool references for completed steps; this does not independently verify facts. Context compaction waits for pending tool calls. Current portfolio inputs/action output are not canonical Mandate/Decision/Portfolio engines.

Tests: `tests/agent.test.mjs`, `tests/research-create.test.mjs`, `tests/research-pipeline.test.mjs`, `tests/research-framework.test.mjs`, `tests/earnings-update.test.mjs`, `tests/company-comparison.test.mjs`, `tests/execution-discipline.test.mjs`, `tests/jobs-create.integration.mjs`.

FUTURE: V5.7 Research State/IR builds on jobs, context and public receipts; it must not silently replace them.

## Checkpoint, retry and recovery — CURRENT

Owners: `server/job-checkpoints.mjs`, `server/research-resume.mjs`, `server/research-retry.mjs`, `server/calculation-recovery.mjs`, `shared/research-recovery.mjs`, `shared/calculation-progress.mjs`.

Private version-1 checkpoints retain messages, evidence, tool results, review and web/followup state. Compatible resume reuses saved sources/marketData and runs only pending calls. Legacy recovery may reconstruct context from saved tool receipts. Invalid checkpoints or incompatible framework/Knowledge can reject resume: retry then reacquires data under the same job ID and discloses a restart reason. Thus not every retry preserves cutoff, and not every historical job is resumable. Preserving initially collected market data does not establish a universal publishedAt filter for later followup.

Tests: `tests/research-resume.test.mjs`, `tests/research-retry.test.mjs`, `tests/research-recovery.test.mjs`, `tests/review-recovery.test.mjs`, `tests/input-checkpoints.test.mjs`, `tests/research-resume.integration.mjs`, `tests/jobs-retry.integration.mjs`.

FUTURE: V5.11 complete replay/version pinning; V4.8 model-state compatibility. H0 changes none of these branches.

## Knowledge, excerpts and snapshots — CURRENT

Owners: `server/knowledge.mjs`, `server/knowledge-excerpt.mjs`, `server/knowledge-snapshots.mjs`, `shared/knowledge-index.mjs`, `shared/knowledge-search.mjs`, `shared/knowledge-loading.mjs`, `shared/research-knowledge.mjs`.

Active source: `knowledge/ENTRY.md`, `knowledge/modules.json` (schema 2), `knowledge/modules/rules/`. `scripts/backup-knowledge.mjs` and `scripts/index-knowledge.mjs` preserve/check it. Historical publishing/splitting/deduplication scripts are maintenance history; `knowledge/versions/` remains preserved. Do not recreate CORE/FULL dual runtime content.

New jobs pin complete validated snapshots; valid same-version revisions apply to new jobs while queued/running/restored sessions keep original snapshots. Invalid updates retain the last valid snapshot and disclose pending validation. Delivered rule sections have hash/line/truncation provenance. Saved excerpt API checks receipts and rejects arbitrary paths. Startup compatibility exports coexist with job-pinned sessions.

Tests: `tests/knowledge-modules.test.mjs`, `tests/knowledge-snapshots.test.mjs`, `tests/knowledge-backup.test.mjs`, `tests/research-knowledge.test.mjs`, `tests/knowledge-api.integration.mjs`.

PARTIAL: indexed module/section predecessors of KnowledgeRule. FUTURE V5.3: stable Rule IDs, ontology, K-Series governance and broader regression. Existing indexing, lazy loading and snapshot pinning must not be described as absent.

## Evidence search, page read, followup and web — CURRENT

Owners: `server/evidence-search.mjs`, `server/evidence-followup.mjs`, `server/agent-page-reader.mjs`, `server/agent-disclosures.mjs`, `server/web-research.mjs`, `server/web-search-provider.mjs`, `server/web-evidence.mjs`, `server/web-evidence-request.mjs`, `server/research-references.mjs`.

Source-filtered, alias-expanded lexical/page retrieval shares block identity with calculation gates, including vendor rows and XBRL. Duplicate/poor-quality references remain ambiguous. Page/disclosure followup retains limits and receipts. Web candidates require body/authority checks; snippets are not authoritative evidence. Public URL/DNS/redirect/size checks protect fetching. Budgets and web receipts survive checkpoints. Lexical scoring is not BM25, vectors or learned reranking.

Tests: `tests/evidence-integrity.test.mjs`, `tests/evidence-followup.test.mjs`, `tests/web-research.test.mjs`, `tests/web-evidence-reuse.test.mjs`, `tests/research-references.test.mjs`.

PARTIAL: Source/Evidence canonical contracts. FUTURE V5.4: normalization, hybrid retrieval and Evidence Pack, preserving exact financial evidence and fetch restrictions.

## Document / OCR / Vision — CURRENT

Owners: `server/document-reader.mjs`, `server/document-layout.mjs`, `server/document-integrity.mjs`, `server/filing-text.mjs`, `server/pdf-extractor.mjs`, `server/pdf-processing.mjs`, `server/pdf-options.mjs`, `server/pdf-ocr.mjs`, `server/ocr-image.mjs`, `server/material-vision.mjs`, `server/visual-assets.mjs`, `server/visual-reading.mjs`.

Worker boundaries: `server/pdf-worker.mjs`, `server/report-page-worker.mjs`, `server/visual-render-worker.mjs`. Shared text/material handling: `shared/document-text.mjs`, `shared/reference-materials.mjs`.

Extraction preserves page/table/cell metadata, quality and truncation. PDF text/OCR, targeted original-page reading and Vision complement each other. Visual assets have integrity/size/budget controls. OCR alternatives and Vision readings are observations requiring review; alignment never supplies missing values. Parser version: evidence-10. Local workers are not a distributed queue.

Tests: `tests/document-parsing.test.mjs`, `tests/document-routing.test.mjs`, `tests/pdf-extractor.test.mjs`, `tests/pdf-ocr.test.mjs`, `tests/pdf-recovery.test.mjs`, `tests/ocr-image.test.mjs`, `tests/material-processing.test.mjs`, `tests/visual-reading.test.mjs`.

## Security and data acquisition — CURRENT

Identity owners: `server/security-resolver.mjs`, `server/security-intent.mjs`, `server/security-exchanges.mjs`, `server/sec-directory.mjs`, `shared/security-input.mjs`, `shared/security-display.mjs`.

Acquisition owners: `server/market-data.mjs`, `server/market-request.mjs`, `server/market-cache.mjs`, `server/bounded-reads.mjs`, `server/data-provider-config.mjs`, `server/official-reports.mjs`, `server/report-periods.mjs`, `server/hkex-disclosures.mjs`, `server/capital-evidence.mjs`, `server/shareholder-data.mjs`.

Adapters/workers: `server/tushare-client.mjs`, `server/tushare-financials.mjs`, `server/longbridge-quotes.mjs`, `server/longbridge-worker.mjs`, `server/longbridge-fundamentals.mjs`, `server/longbridge-fundamental-worker.mjs`.

A/H/US directories verify mentions and market hints. Semantic extraction must use user text and cannot invent identity. Quotes, official reports/attachments, capital/shareholder events and vendor financials disclose missing coverage. Structured provider fields are not filing body coverage. SEC lookup and exchange lookup share upstream provider territory but return distinct information.

Tests: `tests/security-resolver.test.mjs`, `tests/security-intent.test.mjs`, `tests/security-display.test.mjs`, `tests/market-data.test.mjs`, `tests/market-resilience.test.mjs`, `tests/data-providers.test.mjs`, `tests/data-completeness.test.mjs`, `tests/shareholder-data.test.mjs`.

PARTIAL: stable identity contract. FUTURE V5.5: canonical Issuer/Security/Listing/ShareClass and corporate-action history. Extend existing resolvers rather than building disconnected security masters.

## Financial observations and verification — CURRENT; Fact contract PARTIAL

Owners: `server/financial-observations.mjs`, `server/financial-input-verification.mjs`, `server/data-basis.mjs`, `server/inline-xbrl.mjs`, `shared/financial-coverage.mjs`, plus provider adapters above.

Observations preserve source/period/unit context. Original-number verification checks unique usable source/block, continuous quote/label, signed/scaled numeric tokens and bounded alternative location recovery. Success is `matched-needs-review`, not a verified Fact: column, period, currency, scope and authenticity still need review. Data-basis checks disclose coverage/currency/share/period limitations. The XBRL parser is bounded, not a complete taxonomy validator. Canonical factId/issuerId/metricId verification/revision machinery does not exist.

Tests: `tests/evidence-integrity.test.mjs`, `tests/data-completeness.test.mjs`, `tests/data-providers.test.mjs`, `tests/byd-agent-alignment.test.mjs`, `tests/calculations.test.mjs`.

FUTURE V5.5: typed facts and restatement history. Preserve current missing-data and verification boundaries.

## Calculations and valuation — CURRENT; formal lineage PARTIAL

Owners: `server/calculations.mjs`, `server/quick-screen.mjs`, `server/cashflow-bridge.mjs`, `server/normalized-earnings.mjs`, `server/reinvestment.mjs`, `server/research-sensitivity.mjs`, `server/valuation-snapshot.mjs`, `server/valuation-history.mjs`, `server/valuation-review.mjs`, `server/shareholder-return.mjs`, `server/company-comparison.mjs`, `shared/valuation-policy.mjs`, `shared/screen-evidence-rules.mjs`.

DCF/dividend/normalized earnings, snapshots, sensitivity, cashflow bridge, reinvestment and shareholder-return arithmetic are implemented. Agent calculation gates retain basis/source/block/tool references; direct math exports are not a universal Fact type system. FCFF/FCFE, scope, A/H market-cap interpretation, period/currency/share basis and missing data remain explicit constraints. Valuation history acquires vendor history; valuation review compares returned models. Sensitivity/dividend scenarios reuse calculations, not a canonical Scenario Engine.

Tests: `tests/calculations.test.mjs`, `tests/cashflow-bridge.test.mjs`, `tests/quick-screen.test.mjs`, `tests/valuation-policy.test.mjs`, `tests/deep-research.test.mjs`, `tests/deep-cash-return-alignment.test.mjs`, `tests/company-comparison.test.mjs`, `tests/shareholder-data.test.mjs`.

FUTURE V5.6: formula registry/versioned records/dependency DAG. FUTURE V5.7: canonical forecast/scenario. Reuse arithmetic without redefining financial meaning.

## Storage, migration and archives — CURRENT

Owners: `server/storage.mjs`, `server/schema-migrations.mjs`, `server/migrate.mjs`, `scripts/migrate-mongodb.mjs`, `server/data-archive.mjs`.

MongoDB job summaries point to private GridFS payloads. Old payloads remain for concurrent readers; this is not a Fact revision ledger. Tombstones prevent deleted-job resurrection. Cache TTL and hashed parsed archives support reuse/integrity, not immutable historical replay. Schema v1 adds indexes; migration locking/sequential versions reject downgrades. Legacy JSON import differs from schema migration. MongoDB failure has no file-storage fallback.

Tests: `tests/storage.integration.mjs`, `tests/schema.integration.mjs`, `tests/jobs-delete.integration.mjs`, `tests/jobs-retry.integration.mjs`, `tests/web-evidence-reuse.test.mjs`.

H0 has no schema/migration change. Future persistent objects must evolve these owners additively.

## Review, validation, delivery and public views — CURRENT

Owners: `server/review-format.mjs`, `server/research-output.mjs`, `server/research-references.mjs`, `server/research-delivery.mjs`, `server/job-stream.mjs`, `server/access.mjs`, `shared/research-delivery.mjs`, `shared/research-record.mjs`, `shared/report-warnings.mjs`, `shared/research-export.mjs`.

JSON-schema review negotiation/fallback, deterministic contract/reference validation and repair precede formal output. Terminal delivery waits for durable storage; save retries do not rerun models/data. Unsaved results stay private, but pending delivery is in-memory and is not promised across process loss. SSE reconnects with snapshots, not replayed events. Public projection excludes checkpoint/draft/submission. Current records contain reports plus structured review/job fields; canonical Research State is FUTURE.

Tests: `tests/review-format.test.mjs`, `tests/research-contract.test.mjs`, `tests/research-references.test.mjs`, `tests/report-citations.test.mjs`, `tests/review-recovery.test.mjs`, `tests/research-delivery.test.mjs`, `tests/jobs-delivery.integration.mjs`, `tests/streaming.test.mjs`, `tests/access.test.mjs`.

## Frontend/shared views — CURRENT

Entrypoints: `src/main.jsx`, `src/App.jsx`, `src/components/ResearchDetail.jsx`, `src/components/ResearchKnowledge.jsx`, `src/components/ResearchExecutionChecks.jsx`, `src/components/ExecutionReview.jsx`. Other components/styles/helpers are in the inventory.

Routes show workbench/history/detail/handbook, inputs, coverage, public receipts, saved rule excerpts, reports/exports and recovery. Similar server/shared filenames often separate orchestration from client-safe presentation; they are not automatically competing systems. Current portfolio/execution UI is not an autonomous allocation/trading engine.

Tests: `tests/routes.integration.mjs`, `tests/workspace-ui.integration.mjs` and imported UI scenario modules; `tests/research-record.test.mjs`, `tests/research-knowledge.test.mjs`, `tests/research-preparation.test.mjs`, `tests/report-preview.test.mjs`.

## Tests, fixtures, diagnostics and benchmarks

CURRENT pre-H0 baseline: 69 unit-test files / 505 cases, eight MongoDB integration files, five route-render checks, Playwright/Edge UI with imported scenario modules, Linux/Docker `tests/deploy.integration.sh`. `package.json` test:mongodb covers only six files; also run `tests/knowledge-api.integration.mjs` and `tests/research-resume.integration.mjs`. Final counts including Harness tests belong in the completion report.

`tests/fixtures/` contains synthetic document/review/provider/runtime fixtures. `scripts/` includes explicit diagnostic and smoke probes, some with live model/data calls. They are not automatically offline regressions or frozen quality benchmarks.

FUTURE: `benchmark/README.md`, `benchmark/contracts/case-schema.md`, `benchmark/RED_TEAM_PLAN.md` are design materials only. No unified runner/graders/champion-challenger platform exists; V5.0 owns that system. Preserve existing fixtures when adding it.

See [testing](../development/testing.md) and [architecture fitness](../development/architecture-fitness.md). Full acceptance requires every existing suite, not just pnpm test.

## V4.8.7 ModelCall telemetry — CURRENT implementation

V4.8.7 adds ModelCall started/terminal records through the existing Gateway, a process-local AsyncLocalStorage job attribution scope in the existing server execution path, and MongoDB model_calls storage with an on-demand internal job usage summary. No prompts, messages, source bodies, hidden reasoning, endpoint URLs or credentials are retained. Default production telemetry is enabled; MODEL_TELEMETRY_ENABLED=false disables the writer without changing routing. Standalone Gateway/CLI consumers need an injected onModelCall sink or configured writer; no database is opened implicitly by the Gateway. Acceptance is tracked in the V4.8.7 completion report.

Owners: `server/model-telemetry.mjs`, `server/model-gateway.mjs`, `server/index.mjs`, `server/storage.mjs`, `server/schema-migrations.mjs`. Tests: `tests/model-telemetry.test.mjs`, `tests/model-telemetry.integration.mjs` and existing storage/schema/API/resume suites. Per-call metadata is separate from canonical research, public events and checkpoint modelState. Health and persistent profile pinning remain V4.8.8/.9.

The historical V4.8.7 review added `tests/model-telemetry-migration.test.mjs` for twelve existing golden scenarios with asynchronous telemetry enabled. Known preflight attribution and deadline cancellation classification were corrected in the existing Gateway/recorder owners; no second transport or state store was introduced. See the [V4.8.7–.9 review report](../releases/V4.8/V4_8_7-9-review-report.md) for checks at that time. Deployment acceptance and V4.8.8/.9 implementation were pending then and have since been completed as recorded below.

The [second review](../releases/V4.8/V4_8_7-9-review2-report.md) fixes terminal cancellation checking to reuse the dispatched signal instead of rereading a mutable caller request after telemetry awaits. Three regression cases exercise removed/replaced signals and getter errors; existing async-telemetry golden coverage remains. No health/state implementation, schema, public API or investment rule change.

V4.8.7 [deployment acceptance](../releases/V4.8/V4_8_7-deployment-acceptance.md) is now complete: the unchanged Linux integration script passes deployment, upgrade, data preservation, backup/rollback, health/stopped-backup and injected build/migration failure checks. The .7 status is accepted; earlier review reports retain their historical pending status. No .8/.9 capability is implied.

The [post-deployment review](../releases/V4.8/V4_8_7-review3-report.md) adds four test cases for duplicate/concurrent ModelCall writes, job deletion/isolation, late writer rejection and zero/unknown multi-currency summaries. Existing telemetry/storage owners pass without runtime changes; V4.8.7 acceptance is retained and .8/.9 remain unimplemented.

## V4.8.8 accepted health boundary

CURRENT internal: server/model-health.mjs owns bounded recent availability outcomes and cooldown; server/model-gateway.mjs selects only explicitly quality-approved same-tier candidates after request capability checks; server/model-adapter.mjs remains the sole endpoint/identity owner. Default legacy/dry-run routing stays unchanged. Tests: tests/model-health.test.mjs plus legacy migration goldens. Explicit pins and any assistant/tool/private continuation block switching; failures/partial responses are not replayed. Availability never becomes reasoning escalation. No accepted ADR or Evidence/research rule changes. Production fallback and measured candidate quality remain unavailable until explicitly configured and accepted; no tier is inferred from names. Full modelState enforcement remains .9.

## V4.8.9 modelState — CURRENT

Owners: server/model-state.mjs, server/model-connection.mjs, existing research-create/resume/retry, Agent/Gateway and private storage/public filters. New jobs/checkpoints pin mode/policy, profile/model/opaque endpoint identity and effort with empty escalation history. Absence alone retains historical legacy reads; corrupt or incompatible present state throws before dispatch/tool/retry acquisition. Key rotation does not change identity. Gateway verifies custom Catalog dispatch against pins; process-local job scopes isolate concurrent calls. No cross-provider escalation or canonical ResearchState is introduced. New jobs with unusable checkpoints refuse automatic reacquisition. Tests: tests/model-state.test.mjs and tests/model-state.integration.mjs, including actual process exit/restart with MongoDB and public-list exclusion. Current profile metadata is not hidden reasoning and is nevertheless private. Historical TARGET gaps remain distinguished from these local enforced pin guards.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-v4-pro explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.

## V4.8.11 rollout gate — PARTIAL release acceptance

CURRENT code: server/model-rollout.mjs validates an operator-owned live-model-comparison report against exact model/connection/configuration and model-owner code fingerprints. At least 50 unique live cases, all six modes, passing candidate delivery/citations, zero critical fact errors, dry-run and rollback acceptance are required. Offline fixtures, missing credentials/report, changed model/code, duplicate or incomplete cases fail closed to legacy. A trusted local report is operator attestation, not cryptographic proof of honest evaluation.

Only an accepted new policy job consumes existing complexity recommendations; Mode A stays MAIN/low, unknown complexity stays legacy. An optional initial field in modelState v2 pins the initial step; absence retains .10 MAIN/low. Escalation receipts must be contiguous from that step. Business callers still do not select provider names, and all endpoint traffic stays in the single Gateway adapter. Existing policy checkpoints pause after production rollback; they are not rewritten or resumed on a different model. Public routing labels reflect the actual active analysis profile without exposing private state.

Offline validation: tests/model-rollout.test.mjs and tests/fixtures/model-routing-offline-cases.json run 60 baseline/candidate transport safety comparisons plus gate/rollback tests. They are not research-quality evidence. User deferred all paid comparison and required legacy; live acceptance and production rollout therefore remain pending. A one-command legacy server entry exists: pnpm start:legacy after stopping the previous server instance. It overrides inherited mode without editing .env or deleting records. No V4.9 or unified V5 benchmark platform is implemented.
V4.8 第二轮回归补充：App 继续拥有异步下载请求，以浏览器内存状态及同步锁防止资源加载期间重复导出；ResearchDetail 与 ResearchExecutionChecks 共享等待反馈，手机操作面板在下载准备期间保持可见。原 shared/research-export.mjs、持久化对象、模型策略及恢复语义不变。证据见 [第二轮回归报告](../releases/V4.8/V4_8-regression-review2-report.md)。
