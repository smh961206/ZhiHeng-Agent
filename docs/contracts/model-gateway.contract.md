# Model Gateway Contract

Implementation Status: CURRENT.

## Configuration

The gateway reads a schema-v2 JSON document with:

- `models`: named adapter entries containing `model`, `baseUrl` and `apiKeyEnv`;
- `pipeline`: purpose-to-model-entry mappings.

Pipeline purposes include input, vision, researcher, writer, evidence verification, auditor, critical reviewer and judge. Business code supplies a purpose; it does not supply a provider endpoint or infer capability from a model name.

## Optional independent stages (V5.3 migration supplement)

`criticalReviewer` and `judge` are implemented, but empty stage arrays disable dispatch. Explicit nonempty assignments are pinned with the job. The application reserves a durable private session before calling either purpose; the gateway requires the selected profile pin, disables streaming, and permits only one transport attempt with no post-dispatch failover. Usage uses the existing job-scoped telemetry and unknown-price semantics.

Critical review is admitted only in modes B–F after ordinary bounded audit repair fails and at least two attempts have classified JSON-format or isolated allowed-action failures. Evidence, financial, cutoff, missing-data and provider failures never justify escalation. Independent input requires complete, uniquely bound evidence with valid source publication dates no later than the original cutoff; truncated and unverified evidence is rejected. The same delivery validator must accept the result.

Judge receives two completed comparable conclusions, all positive and counter-evidence, and actual calculation receipts. Entity, period, currency, share basis, accounting scope and valuation basis must agree. Claim positions must oppose; valuation intervals must be nonoverlapping with gap/max-absolute-endpoint at least 0.2. Model-supplied new valuation numbers cannot substitute for program output. Every evidence block must be quoted verbatim and every tool ID acknowledged. Output selects L1, L2 or insufficient evidence; it is advisory and undergoes another final audit. Human overrides block judge dispatch.

The audit model may emit an optional typed `judgeRequest` with `l1` and `l2`; the orchestrator consumes it before public result delivery. This is a local comparison request, not a canonical Claim/Fact schema or a replacement for evidence validation. See [migration and rollback](../releases/V5.3/independent-review-migration.md).

Missing files, invalid schema, unknown model entries and missing credentials fail explicitly. Secret values are resolved from environment variables and are never returned by public status APIs.

## Request and response

A request contains a purpose, ordered messages, stream preference, bounded output-token limit and optional safe Prompt context. The Prompt context is provider-neutral execution metadata and is never forwarded as model content. The selected adapter sends an OpenAI-compatible chat-completions request with bounded connection and overall timeouts.

A non-stream response returns assistant content. A stream yields only valid content deltas and ignores malformed or terminal framing lines. Transport and configuration failures remain failures; they cannot be converted into facts, evidence or successful research output.

## Governance

- Candidate selection requires declared purpose, enablement and health.
- Eligible candidates sort by quality, stable priority and key.
- Non-finite quality values are invalid.
- Repeated failures may temporarily block a candidate.
- Usage accounting preserves input/output token provenance.
- Cost is calculated only when both usage and price are known; otherwise status is `unknown`.
- Request fingerprints bind purpose, messages and contract version.
- Registered Prompt metadata binds the internal Prompt version and manifest fingerprint without copying message bodies.

These helpers do not authorize automatic model promotion, paid evaluation, Champion registries or A/B rollout.

When a research budget is active, a logical model resource is reserved and persisted before transport. Known usage is settled against point-in-time pricing; missing usage or pricing remains unknown. Enforced cost limits fail closed when a safe reservation cannot be calculated.

## Persistence and privacy

Public model projections may expose configuration availability, selected display names and aggregate Prompt efficiency statistics. They must not expose credentials, endpoints, prompts, source bodies, hidden reasoning or private checkpoint state.

Persisted tasks retain their original research cutoff, Knowledge identity and execution compatibility. Configuration edits cannot silently rewrite historical records, replay uncertain work or replace a human override.

## Compatibility

Provider/model configuration may change without changing business contracts when the purpose and capability boundary remains compatible. An incompatible checkpoint or execution change must pause or start a new task according to the recovery contract.

See the [Prompt Manifest contract](prompt-manifest.contract.md), [model system](../architecture/04-model-system.md), [research-state contract](research-state.contract.md) and [ADR-002](../adr/ADR-002-model-gateway.md).
