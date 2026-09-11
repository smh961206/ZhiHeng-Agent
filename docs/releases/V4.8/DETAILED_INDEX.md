# V4.8 — Fully Normalized Detailed Index

Latest maintenance: [V4.8.8–V4.8.11 review](V4_8_8-11-review-report.md) fixes review-context refresh and comparison integrity. The selected 贵州茅台 / 比亚迪 pilot with a combined RMB 100 budget is explicitly deferred by the user; it is not resumed by this review. Production remains legacy and live quality acceptance remains pending.

Every subrelease below follows `docs/development/NORMALIZED_RELEASE_STANDARD.md`.

Codex must execute them in order unless the user explicitly requests one specific subrelease.

Accepted: [V4.8.0 inventory](V4_8_0-completion-report.md), [V4.8.1 Catalog / Legacy Profiles](V4_8_1-completion-report.md), [V4.8.2 standalone Gateway normalization](V4_8_2-completion-report.md), [V4.8.3 text-call migration](V4_8_3-completion-report.md), [V4.8.4 remaining-call migration](V4_8_4-completion-report.md), and [V4.8.5 complexity utility](V4_8_5-completion-report.md). [V4.8.6 dry-run policy](V4_8_6-completion-report.md) and [V4.8.7 telemetry with completed deployment acceptance](V4_8_7-deployment-acceptance.md) are accepted. [V4.8.8 internal health routing](V4_8_8-completion-report.md) is accepted. [V4.8.9 pins](V4_8_9-completion-report.md) and [V4.8.10 internal escalation](V4_8_10-completion-report.md) are accepted. [V4.8.11](V4_8_11-completion-report.md) implements the offline gate, with live quality acceptance deferred and legacy retained. CURRENT remains V4.8; the complete release is not yet accepted.

- [V4.8.0 — LLM call inventory](subreleases/V4_8_0-llm-call-inventory.md)
- [V4.8.1 — Model Catalog + Legacy Profiles](subreleases/V4_8_1-model-catalog-legacy-profiles.md)
- [V4.8.2 — Gateway request/response normalization](subreleases/V4_8_2-gateway-request-response-normalization.md)
- [V4.8.3 — Migrate research/review/followup calls](subreleases/V4_8_3-migrate-research-review-followup-calls.md)
- [V4.8.4 — Migrate router and vision calls](subreleases/V4_8_4-migrate-router-and-vision-calls.md)
- [V4.8.5 — Complexity Evaluator V1](subreleases/V4_8_5-complexity-evaluator-v1.md)
- [V4.8.6 — Dry-run Model Policy](subreleases/V4_8_6-dry-run-model-policy.md)
- [V4.8.7 — Model usage telemetry](subreleases/V4_8_7-model-usage-telemetry.md)
- [V4.8.8 — Health routing V1](subreleases/V4_8_8-health-routing-v1.md)
- [V4.8.9 — Checkpoint modelState compatibility](subreleases/V4_8_9-checkpoint-modelstate-compatibility.md)
- [V4.8.10 — Safe Main→Pro escalation](subreleases/V4_8_10-safe-main-pro-escalation.md)
- [V4.8.11 — Policy mode rollout gate](subreleases/V4_8_11-policy-mode-rollout-gate.md)

Cross-stage maintenance: [V4.8.4–V4.8.6 review](V4_8_4-6-review-report.md). This does not authorize V4.8.7 or production policy.

Follow-up: [V4.8.4–V4.8.6 second review](V4_8_4-6-review2-report.md), preserving the same release boundary.

[V4.8.7–V4.8.9 review](V4_8_7-9-review-report.md): V4.8.7 preflight attribution and timeout classification fixed, enabled-telemetry golden coverage added; .8/.9 specifications calibrated against actual owners and risks. This review does not claim .8/.9 implementation or clear .7's pending Linux deployment acceptance.

[Second V4.8.7–V4.8.9 review](V4_8_7-9-review2-report.md): preserve the dispatched cancellation signal during telemetry finalization. Same release boundary and pending deployment gate; .8/.9 remain unimplemented.

2026-09-10 [deployment acceptance](V4_8_7-deployment-acceptance.md) closes the gate that was pending at both reviews. Deployment, upgrade, backup/rollback and fault-protection checks pass; .7 is accepted. This deployment task stops here, without implementing .8/.9.

[V4.8.7 post-deployment review](V4_8_7-review3-report.md) strengthens concurrency/deletion/aggregation coverage with no runtime changes or new confirmed blocking finding. V4.8.7 remains accepted; no next subrelease is implemented by the review.



Final authorized boundary: [V4.8.11 completion report](V4_8_11-completion-report.md). Offline implementation/testing is completed; real quality acceptance and production activation remain deferred. CURRENT stays V4.8; stop before V4.9.

User-authorized [V4.8 frontend alignment](V4_8-frontend-completion-report.md) updates platform copy, presentation, accessible model/configuration explanations and carousel controls. This does not activate MAIN/PRO policy, resume the paid pilot or advance CURRENT.

[Screenshot and version follow-up](V4_8-frontend-review2-report.md) removes repetitive normal-status banners, aligns the four workbench steps, and distinguishes platform 4.8 from rule/snapshot 4.7 in handbook and report copy. Historical metadata and safety gates remain intact.

[Second V4.8.8–V4.8.11 review](V4_8_8-11-review2-report.md): private comparison checkpoints are bound to the intended run/arm/input; frozen report coverage no longer counts quotes or filing directories as read reports. Paid pilot remains deferred; production remains legacy.

[Whole-release regression and loading optimization](V4_8-regression-optimization-report.md) verifies existing V4.8 behavior, defers workbench/export scripts and fixes report-first spacing. Legacy and the deferred live-quality gate remain unchanged.
# 后续整体回归

[第二轮整体回归与导出交互优化](V4_8-regression-review2-report.md)：重新验证完整测试与部署回滚，补齐异步导出等待、重复操作拦截及失败恢复，不改变模型准入状态。
