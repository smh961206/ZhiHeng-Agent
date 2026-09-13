# V5.2 execution evidence

User authorized the full V5.2 iteration on 2026-09-12. V5.1's existing uncommitted implementation is retained. CURRENT authorizes V5.2; it does not certify live quality or promotion. Baseline: 58/58 catalog/config/Gateway/context/review-recovery tests pass (`artifacts/v52-validation/baseline.log`).

Specification corrections: actual owners are flat `server/model-catalog.mjs`, `model-gateway.mjs`, `model-connection.mjs`, `agent.mjs`, `research-context.mjs`, `valuation-review.mjs` and existing benchmark modules. There is no `server/model-gateway/` directory. The release schema requires additive decision/escalation metadata despite subrelease template text saying no persistent change. Release-specific compatibility and recovery guards will own that addition; no canonical Claim subsystem is introduced.

## V5.2.0
ModelProfile v5 supplies explicit independent critical-review/judge roles with allow flags default false. Neither enters legacy, policy or benchmark research catalogs. Configuration extends existing optional roles; no transport or production enablement is introduced at this step. No persistent schema/migration or research pin change. Rollback removes unused optional roles. Validation recorded in step-0.log.

## V5.2.1
Deterministic eligibility requires two distinct validated review failures, sufficient evidence, no missing data/provider failure/pending tool, and non-routine mode. Exceptional complexity alone cannot escalate reviewer before repeated failure. Financial/reference/date/confidence failures remain outside the structural failure allowlist. Pure policy only; no persistent/schema or dispatch change. Step-1.log covers positive and negative eligibility plus prior scope regressions.

## V5.2.2
Independent context reuses the existing research-context packer with known original cutoff, verbatim source excerpts, complete tool receipts and completed conclusions; unknown publication times, future/missing evidence and omitted records fail closed. New private job receipt reserves durably before one independent call, validates output with the caller's existing review validator, and reuses completed outcomes only with exact input/profile/connection hashes. Unknown operations pause. At this step the executor is injection-only and not production-admitted; research session is never switched. Step-2.log verifies independent context, process-serialized resume, failure boundaries and existing review behavior.

## V5.2.3
Local L1/L2 comparison requires completed statements, exact explicit entity/period/currency/share/accounting/valuation basis, supporting and counter-evidence references. Only opposite core positions or nonoverlapping material valuation intervals qualify. Valuation values reuse `reviewValuationModels` on actual calculation receipts; no model-authored amount is accepted. Default relative interval gap is 20%, an engineering threshold awaiting live calibration. No Judge execution or persistent Claim object at this step. Step-3.log covers positive, nonmaterial, missing and incomparable cases.

## V5.2.4
Judge input reconstructs exact blocks through existing `evidenceBlocks`, rejects ambiguous/forged/OCR-only/future/unknown evidence, includes both completed conclusions plus all supporting and counter references, and recomputes the conflict signature. Calculation references require actual source/block lineage. Human overrides block automatic adjudication. No web/model continuation/research replay. Step-4.log covers packet integrity and previous review/valuation behavior.

## V5.2.5
Closed output schema accepts exactly accept_l1 / accept_l2 / insufficient_to_decide, fixed reason codes, input hash, selected original ID, evidence citations and reviewed tool IDs. No factual amounts, free-form replacement thesis, arbitrary fields or hidden reasoning. Insufficient output cannot carry a selection. Step-5.log tests the schema and compatible prior scope.

## V5.2.6
Deterministic validation binds exact packet/conflict hashes, original selection IDs, verbatim quotes covering all included evidence (including counter-evidence), and every actual tool ID. Unsupported selections leave the original conflict unresolved. Accepted selections are advisory-needs-review and cannot create verified facts or bypass final delivery. Human overrides remain untouched. Semantic truth of model interpretation still requires independent review/live acceptance. Step-6.log includes forged/missing/cross-packet/override regressions.

## V5.2.7
Existing ModelCall adds optional whitelisted conflict type and independent purpose attribution. Existing cost aggregation retains unknown usage/fees and all attempts; rare-call summary reports latency and conflict counts, never inferring decision value from a successful API response. Private session receipts may retain normalized usage/cost/performance. Existing storage/list/detail/SSE owners exclude flagshipState; resume validates its receipt shape, and incompatible retry cannot reacquire. No new collection/index/schema migration. Step-7.log covers telemetry, privacy and affected existing cost/recovery tests.

## V5.2.8
Existing benchmark graders/statistics now evaluate paired hash-bound Judge samples and actual cost receipts. Twelve frozen synthetic hard-conflict/negative cases exercise the contracts, baseline abstention and candidate oracle outcomes. This is deterministic safety verification, not a measured quality improvement. CLI makes zero model requests and refuses to overwrite artifacts. User explicitly continues pausing live-model acceptance. Step-8.log and judge-offline.json record results; live cost/correctness acceptance remains pending and rollout must stay closed.

## V5.2.9
Existing rollout owner requires raw paired live artifacts (20 distinct fixtures), deterministic regrading, no critical candidate errors, demonstrated improvement, complete observed same-currency costs, reviewed cost limit, 100-job rare-use observations, dry-run/rollback and exact artifact-bound human approval. Code/configuration hashes and immutable per-job authorizations are rechecked at each independent Gateway boundary. Existing adapter handles explicit flagship connections with one transport attempt and no tools/private continuation. Critical reviewer runs only after repeated structural failures and known absence of data gaps, through existing final validators; Agent optionally exposes valuation adjudication only for prior completed comparable calculation review receipts. Completed receipts reuse original outcomes; uncertain resume pauses before normal execution. Default flags remain off; user paused live acceptance. Step-9-gateway.log and step-9-agent-retest.log prove actual mocked Gateway and Agent behavior. Initial test fixture/URL assertion failures were corrected without weakening production validation.

## V5.2.10
Existing drift owner adds read-only exceptional usage/cost observations. Rate counts all attempted rare jobs including failed calls, retains unknown telemetry coverage/cost, and separates currencies. At least 100 known cohort jobs precede a 5% default rate check. Operator CLI writes a new observation artifact only; no hard quota, online policy edit, automatic replacement or recurring automation. Step-10.log verifies alerts, missing coverage, deduplication and cross-currency handling.
