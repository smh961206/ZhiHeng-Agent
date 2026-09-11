# Quality Before Cost

Status: ACCEPTED

## Decision

Routing order is Capability → Quality → Health → Cost. Cheap but materially worse models cannot become Champion.

## Consequences

- Future releases must preserve this decision unless explicitly superseded.
- Codex must not “simplify” the architecture by violating this decision.
- If a current implementation cannot yet satisfy the decision, mark it PARTIAL/FUTURE and implement only in the owning release.

## V4.8.5 implementation assessment

Implementation Status: PARTIAL supporting utility; policy/Champion selection remains FUTURE. Deterministic research complexity scoring now exists independently of runtime selection. Its V1 weights are engineering heuristics with explicit unknowns and failure categories, not measured model quality or a price optimization rule. No score selects or upgrades a provider/model, and no accepted priority is reversed. Empirical quality gates and policy integration require their own authorized release work.

## V4.8.6 implementation assessment

Implementation Status: PARTIAL. Dry-run recommendations now exist, with actual execution fixed to existing legacy profiles. Raw workload thresholds are not empirical quality/capability evidence and cannot select a Champion or authorize rollout. Mode A follows Main/low; missing-data/provider failures do not upgrade candidates. No price/health routing is added. Accepted capability → quality → health → cost order is unchanged; executable policy and its gates remain later releases.

## H0 implementation assessment

Implementation Status: FUTURE. Current fixed provider/config routing is not capability-quality-health-cost selection or Champion promotion.

The ACCEPTED decision above is unchanged. Implementation status describes evidence, not permission to reverse the decision. See [implementation map](../architecture/current-implementation-map.md) and [gap register](../releases/H0/audit-findings.md).

## V4.8.8 accepted health boundary

CURRENT internal: server/model-health.mjs owns bounded recent availability outcomes and cooldown; server/model-gateway.mjs selects only explicitly quality-approved same-tier candidates after request capability checks; server/model-adapter.mjs remains the sole endpoint/identity owner. Default legacy/dry-run routing stays unchanged. Tests: tests/model-health.test.mjs plus legacy migration goldens. Explicit pins and any assistant/tool/private continuation block switching; failures/partial responses are not replayed. Availability never becomes reasoning escalation. No accepted ADR or Evidence/research rule changes. Production fallback and measured candidate quality remain unavailable until explicitly configured and accepted; no tier is inferred from names. Full modelState enforcement remains .9.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-v4-pro explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.

## V4.8.11 rollout gate — PARTIAL release acceptance

CURRENT code: server/model-rollout.mjs validates an operator-owned live-model-comparison report against exact model/connection/configuration and model-owner code fingerprints. At least 50 unique live cases, all six modes, passing candidate delivery/citations, zero critical fact errors, dry-run and rollback acceptance are required. Offline fixtures, missing credentials/report, changed model/code, duplicate or incomplete cases fail closed to legacy. A trusted local report is operator attestation, not cryptographic proof of honest evaluation.

Only an accepted new policy job consumes existing complexity recommendations; Mode A stays MAIN/low, unknown complexity stays legacy. An optional initial field in modelState v2 pins the initial step; absence retains .10 MAIN/low. Escalation receipts must be contiguous from that step. Business callers still do not select provider names, and all endpoint traffic stays in the single Gateway adapter. Existing policy checkpoints pause after production rollback; they are not rewritten or resumed on a different model. Public routing labels reflect the actual active analysis profile without exposing private state.

Offline validation: tests/model-rollout.test.mjs and tests/fixtures/model-routing-offline-cases.json run 60 baseline/candidate transport safety comparisons plus gate/rollback tests. They are not research-quality evidence. User deferred all paid comparison and required legacy; live acceptance and production rollout therefore remain pending. A one-command legacy server entry exists: pnpm start:legacy after stopping the previous server instance. It overrides inherited mode without editing .env or deleting records. No V4.9 or unified V5 benchmark platform is implemented.
