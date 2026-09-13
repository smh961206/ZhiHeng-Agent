# M-Series — Model Intelligence

- Model Gateway and provider adapters
- User-defined stage model assignment
- Fixed ordinary-stage routing and explicit exceptional model pools
- Runtime request/response contracts, health and cost controls
- Provider independence
- Pricing, cost and cache economics
- Flagship critical review and evidence adjudication

Track changes must remain compatible with the owning Core Release contracts and invariants.

## M1.0 — User-defined stage model pipeline (IMPLEMENTED)

M1.0 is scheduled after core release V5.2. It does not replace the already assigned V5.3 Knowledge Engineering release.

- Users define model connections and assign Input, Vision, Researcher, Writer, Evidence Verifier and Auditor.
- Users optionally define ordered Critical Reviewer and Judge model pools.
- All calls reuse V5.1 pricing, cost and cache owners; configurable research budgets are retired.
- Critical review and Judge reuse V5.2 eligibility, independent-context, receipt and output-validation owners.
- V4.8–V5.2 Gateway, multimodal, safe escalation, benchmark/statistics, historical Champion/A-B semantics, cost/cache, flagship review and Judge capabilities are preserved. Historical budget ledgers remain readable without enforcing limits.
- Batch paid trials, manual acceptance files, duplicated role credentials, Champion registry/version/invalidation maintenance and preview/rollback configuration copies are removed from the normal activation path.
- Historical task state, model-call records and release evidence remain readable and are not rewritten.
- Schema-v2 configuration and modelState v4 are active when `MODEL_CONFIG_FILE` points to a v2 document. Schema v1 and modelState v1-v3 remain read-compatible for existing deployments and tasks.

Detailed proposal: [Stage-oriented model pipeline redesign](../architecture/model-pipeline-redesign-proposal.md).

## M1.1 — Token-efficient stage contexts (CURRENT phase 1)

M1.1 reduces repeated model input while preserving evidence, calculation, missing-data, audit and recovery guarantees. It extends the existing research-context, Agent, Gateway cache and telemetry owners; it does not add a token budget, price-based routing, paid trials, Champion/A-B or a parallel evidence subsystem.

- Stage-specific contexts for Researcher, Writer, Evidence Verifier and Auditor.
- Complete mandatory evidence and calculation blocks with deterministic omission receipts.
- Incremental tool-boundary compaction and stable provider-cache prefixes.
- Read-only per-stage and per-validated-delivery Token metrics.
- Sequential subrelease rollout with hard quality gates and independent rollback.

M1.1.0–M1.1.3 are implemented for new schema-v2/modelState-v4 tasks pinned with `contextVersion=1`: an automatic context-footprint check, path-scoped tool/rule input, safe incremental Researcher compaction and a dedicated Writer context with deterministic integrity receipts. Historical modelState v1–v3 tasks and pre-M1.1 v4 tasks without the pin keep their original request wire and recovery behavior. Auditor repair-loop, stable-prefix and Vision-specific refinements remain deferred to later M1.1 phases.

Detailed proposal: [Model Token efficiency plan](../architecture/model-token-efficiency-proposal.md).

## M1.2 — Incremental research dependency graph (PLANNED)

M1.2 reuses unchanged verified research state across stages, reporting periods and later tasks. Evidence, verified facts, deterministic calculations, claims and report sections retain distinct identities and point-in-time semantics. Changed evidence invalidates only dependent nodes, while every final report still receives full deterministic validation and independent audit.

- Additive ResearchSnapshot and dependency identities without rewriting historical records.
- Exact reuse rules for security, period, currency, accounting scope, share basis, source hash and cutoff.
- Financial-update delta packets and affected-node recomputation.
- Program-rendered tables, calculations, source lists and missing-data sections.
- Claim-level review followed by complete final-report audit.
- No Token budget, price routing, paid trials, Champion/A-B or distributed Agent runtime.

Detailed proposal: [Incremental research and dependency graph](../architecture/model-incremental-research-proposal.md).
