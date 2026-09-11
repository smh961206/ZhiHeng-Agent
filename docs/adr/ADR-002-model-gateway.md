# Model Gateway

Status: ACCEPTED

## Decision

Business logic expresses capabilities/purpose. Model/provider identity and API differences live behind a gateway and adapters.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## H0 implementation assessment

Implementation Status: FUTURE. Direct provider/model configuration persists; V4.8 owns Gateway.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).

## V4.8.1 implementation assessment

Implementation Status: PARTIAL. ModelProfile v1 and legacy configuration Catalog now exist, reusing current configuration and Vision capability owners. No provider adapter or business-call migration has occurred. Model-name checks remain isolated legacy compatibility facts, not evidence that the target business boundary is enforced. The accepted decision is unchanged; later subreleases must extend this Catalog and the existing request/stream guards.

## V4.8.2 implementation assessment

Implementation Status: PARTIAL. The standalone complete() facade, legacy protocol adapter and safe result/error normalization now exist. The adapter reuses existing request/deadline/stream guards; business-call migration remains V4.8.3/V4.8.4. The accepted decision is unchanged. The static boundary test distinguishes the one authorized new adapter from four existing production transports, and rejects premature business imports.

## V4.8.3 implementation assessment

Implementation Status: PARTIAL. Research/review/followup delegate through a thin Agent completion wrapper to Gateway; the old Agent endpoint is removed. Adapter owns provider behavior, and the wrapper retains business format negotiation, shared logical-call deadline and legacy recovery-code compatibility. Private continuation remains explicit. Existing strict Gateway/SSE guards are retained; legacy text JSON may omit finish metadata, which remains unknown. Router/Vision migration and full policy/model-state boundaries remain future. No accepted decision or invariant is reversed.

## V4.8.6 implementation assessment

Implementation Status: PARTIAL for the full target. Gateway now owns opt-in shadow policy observation via `model-policy.mjs`, with no candidate feedback to dispatch. Agent sends only structured mode/history signals and does not select model slots or infer provider capabilities. Catalog/adapter retain execution ownership; persistent model state and production policy remain future. No accepted decision is reversed.

## V4.8.4 implementation assessment

Implementation Status: PARTIAL for the complete target; call-site migration is CURRENT. Path classification, security intent, Vision and the synthetic diagnostic now delegate to the same Gateway adapter. Catalog owns the legacy Vision capability predicate; business wrappers retain cache/fallback and visual processing without provider-name branches. Static endpoint/owner checks cover all mapped real callers, including diagnostics, while preserving historical provenance. Future policy, telemetry persistence and cross-provider state compatibility are not implied by this migration. The accepted decision is unchanged.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-v4-pro explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.
