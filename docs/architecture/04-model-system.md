# Model System

## V4.9 current boundary

V4.9.1–.8 implement canonical image requests/results, explicit Vision challenger configuration, 48 frozen originals, deterministic grading, a two-attempt independent fallback and a closed Vision promotion gate. Existing Gateway/adapter/connection and modelState remain owners. Vision admission is separate from text rollout to avoid cyclic state construction. New admitted jobs pin actual Vision identity; saved legacy and historical no-state jobs retain legacy, candidate pins pause after rollback. Real candidate quality remains unaccepted and FEATURE_VISION_ROUTING defaults false. See [V4.9 report](../releases/V4.9/V4_9-completion-report.md).

## Baseline

Research/review and Vision are configured separately. V4.8.4 completes Gateway migration of router/Vision and diagnostics. All provider requests use one adapter; existing connection identities, business guards and fixed legacy selection remain.

## Target

```text
Business capability request
→ Model Gateway
→ Capability Gate
→ Quality / Policy
→ Health
→ Cost (only after quality)
→ Provider Adapter
```

## V4.8.5 complexity utility — CURRENT

`evaluateResearchComplexity` is an isolated pure function with explicit, versioned workload weights and ordered reason codes. Unknowns remain unknown; missing-data/provider/format failures contribute zero. Runtime/review reasoning failures require separate caller classification. It has no Gateway dependency; V4.8.6 adds the shadow-policy caller below. No heuristic authorizes production selection without .11 live acceptance. Descriptive complexity levels are not V4.8.6 policy thresholds or empirical proof of a model's quality.

## V4.8.6 dry-run policy — CURRENT

Gateway invokes `server/model-policy.mjs` only for MODEL_ROUTING_MODE=dry-run. The policy reuses complexity V1 and logs prepared-attempt recommendations while dispatch uses the same legacy profile/request. Agent forwards mode/historyYears only; other signals stay unknown. Mode A is capped MAIN/low. Raw score bands 0–3/4–7/8–10/≥11 are uncalibrated and do not establish quality or permission for production selection. V4.8.10 now binds MAIN/PRO explicitly; dry-run continues to observe only. See the [contract](../contracts/model-gateway.contract.md).

## Stable executable slots — mixed implementation status

- ROUTER
- MAIN — CURRENT internal profile (GLM-5.3-Flash)
- PRO — CURRENT internal profile (DeepSeek-V4-Pro)
- VISION_PRIMARY
- VISION_FALLBACK
- JUDGE

Slots are stable. Concrete vendor/model names are replaceable.

## Permanent escalation rule

Data absence is not intelligence failure.

Provider outage is not intelligence failure.

Only repeatable capability/reasoning failures may justify model-tier escalation.

## H0 calibration

At H0: CURRENT provider-configured research/review, path classification, security intent, Vision and their distinct transport guards. Catalog/Gateway and policy slots were FUTURE. Do not enforce the target Gateway boundary against current call sites in H0.

The [V4.8.0 call inventory](../releases/V4.8/model-call-inventory.md) now records exact current transports, parameters, semantic callers, private state and guard differences. Static inventory checks track the existing direct endpoints until their authorized migration; they do not claim the target Gateway boundary is enforced.

## V4.8.1 configuration Catalog — CURRENT

`server/model-catalog.mjs` defines validated immutable ModelProfile v1 and generates three legacy profiles from existing env: analysis, router override, Vision. `model-routing.mjs` remains the connection/default owner. Since V4.8.4, Catalog owns the shared legacy image-capability predicate; vision-model re-exports it and uses profile capabilities for readiness. Catalog carries safe connection references instead of URLs/keys, with explicit capabilities and nullable provider/price/token-limit metadata. Capabilities reflect legacy usage, not certification of arbitrary provider endpoints.

This internal metadata layer does not itself send requests or pin jobs. Existing business transports and public model routing retain their behavior. See [contract](../contracts/model-gateway.contract.md) for current fields and future boundaries.

## V4.8.2 standalone Gateway — CURRENT

The internal complete() facade chooses a fixed compatible legacy profile and delegates to a single adapter using existing configuration, request/deadline and stream owners. It returns normalized safe messages, usage, latency/observed TTFT, nullable billing and error categories. Private continuation is explicit and excluded from serialization. At V4.8.2 acceptance, the adapter was not yet called by production business modules; V4.8.3 integration is described below.

At V4.8.2, caller migration and usage persistence remained FUTURE. Migration is now implemented through V4.8.4 and usage persistence through V4.8.7 below. V4.8.8–.10 now add health, pins and safe escalation. Cost-based selection and live policy quality acceptance remain unavailable.

## V4.8.3 research/review/followup integration

Agent's exported completion function is a thin compatibility wrapper over Gateway. It preserves the logical-call connection and idle/total budget across review-format negotiation, forwards safe retry/waiting notices and retrieves private continuation explicitly. Evidence followup assessment is injected from Agent; valuation review is deterministic, so neither needs another provider client. The new adapter replaces the old Agent endpoint: three legacy transports plus Gateway remain.

Existing hard research/Evidence/financial validation, tool execution, source cutoff and checkpoint records are unchanged. The narrowly scoped legacy-text option accepts omitted JSON finish metadata used by existing compatible responses while keeping that metadata unknown; standard Gateway and SSE remain strict. Router/Vision, persistent usage/modelState and policy flags remain future work. Final V4.8.3 acceptance is recorded separately in its completion report.

## V4.8.4 remaining-call integration

Path/intent, Vision and the explicit synthetic diagnostic now delegate to Gateway, leaving one provider endpoint. Router caches/manual choices/concurrency and rule fallback remain in the existing owners; Vision keeps image assembly, source validation and budgets. Catalog owns image capability; the adapter owns thinking options and transport bounds. Missing JSON role metadata is accepted only by scoped legacy-router-vision compatibility; finish/refusal/content validation stays strict. At .4 acceptance there was no telemetry/modelState/policy. Current .7–.11 additions are described below; no new image model is introduced. See the [V4.8.4 report](../releases/V4.8/V4_8_4-completion-report.md).

## V4.8.7 telemetry — CURRENT, accepted

Gateway emits safe ModelCall metadata through model-telemetry and existing storage; migration 2 adds the model_calls job/time index. Job attribution is scoped to existing execution, and summaries remain internal and on demand. No prompt, hidden reasoning, endpoint or credentials are persisted. The V4.8.4 paragraph describes its historical boundary; durable telemetry is now implemented, while health routing and checkpoint modelState remain unimplemented V4.8.8/.9 work. See the [review report](../releases/V4.8/V4_8_7-9-review-report.md) for fixes and enabled-writer golden tests, and [deployment acceptance](../releases/V4.8/V4_8_7-deployment-acceptance.md) for the now-passed Linux deployment gate.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-flash explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.

## 2026-09-11 模型名称配置更新

按用户明确要求，当前分析、PRO 档及默认视觉模型统一使用 `deepseek-flash`；MAIN 绑定与路由、升级和验收门槛不变。以上 CURRENT 绑定名称反映本次更新，不代表历史付费质量验证已完成。历史任务模型身份及验收记录不回写；详见 [变更报告](../releases/V4.9/model-name-unification-20260911.md).
