# Current Implementation Map

Status: CURRENT — calibrated during H0 against checkout `b7592abc4b888e218bbdfca958230366919ea3bb`.

Runtime: React 19 / Vite 6, Node >=22.13, MongoDB / GridFS. `shared/research-framework.mjs` declares framework 4.7 and contract version 7. The Harness CURRENT pointer is separate from runtime/Knowledge versions. No Model Gateway exists.

## Status and evidence

CURRENT describes an implemented behavior; PARTIAL describes an existing predecessor of an incomplete target contract; FUTURE is a design reservation. DEPRECATED requires an approved migration: H0 newly deprecates nothing. Archived Knowledge and legacy readers remain compatibility assets.

The complete tracked code/test/active-Knowledge file inventory, hashes and lexical import/export index is [repository-inventory.json](../releases/H0/repository-inventory.json). It includes remaining frontend, shared, provider, worker and diagnostic files beyond the major owners below. This is an inventory, not a proof of every semantic property. [Audit findings](../releases/H0/audit-findings.md) records gaps and overlaps.

## Model calls and transport — CURRENT

Owners: `server/model-routing.mjs`, `server/model-request.mjs`, `server/model-deadline.mjs`, `server/model-stream.mjs`, `server/vision-model.mjs`.

Call sites: `server/agent.mjs` (research/review and followup assessment), `server/research-path.mjs` (path classification), `server/security-intent.mjs` (mention extraction), and Vision. `server/router.mjs` validates research input/modes; it is not a provider Gateway.

Environment-configured routing is provider/model centric. Research transport has bounded pre-response network retry, idle/total deadlines, stream completeness and tool-fragment validation. Private reasoning can remain in model messages/checkpoints for continuation; public deltas and checkpoints exclude it. Path/intent each own caching, concurrency/timeouts and rule fallback. Vision has separate capability, request/response size and error guards; these paths do not all share the research transport.

Tests: `tests/model-request.test.mjs`, `tests/model-deadline.test.mjs`, `tests/streaming.test.mjs`, `tests/research-path.test.mjs`, `tests/security-intent.test.mjs`, `tests/visual-reading.test.mjs`.

FUTURE: V4.8 Gateway, policy/health/tier/usage platform; V4.9 canonical Vision. Reuse existing transport protections, not a second stream parser. Cross-provider continuation is not currently guaranteed.

V4.8.0 refines this baseline with [four production transports and ten purpose/caller entries](../releases/V4.8/model-call-inventory.md), including both router purposes, forced-draft completion, supplementary review, four Vision readers and separate live diagnostic requests. This is inventory completion, not Gateway implementation; runtime owners remain unchanged.

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
