# V4.9 — Fully Normalized Detailed Index

最新：用户已正式批准第九批次真实质量验收，两侧 48/48，准入检查通过；生产路由尚未启用。见 [正式批准记录](vision-operator-approval-20260911.md)；下方为历史状态。

## 历史验证记录

批准前：输出约束已修正，候选真实复验 48/48，技术审核／回滚通过；当时待操作人批准。见 [审核报告](vision-output-constraints-review-20260911.md)。

用户恢复后的独立 Coding 接口真实批次已完成：候选 46/48、基线 41/48，未通过晋升门槛。见 [本轮记录](vision-live-coding-acceptance-20260911.md)。下方暂停段落保留前次时点。

2026-09-11 早期暂停：用户曾暂停真实模型质量验收；该阶段无自动付费续跑或生产晋升。智谱账户额度错误、部分比较结果和恢复条件见 [暂停记录](vision-live-acceptance-paused-20260911.md)。

Frontend follow-up: [platform copy, styling and interaction alignment](V4_9-frontend-completion-report.md). Public V4.9 labels and document/image guidance are synchronized; saved rules, extraction trust and model promotion gates remain unchanged.

At the original engineering handoff, live quality acceptance was still open. The user's “都一并修复” authorized all four [review repairs](V4_9-review-fixes-report.md), including the previously deferred cancel/retry lifecycle issue. CURRENT stays V4.9; this does not activate a future release or production candidate.

## 当前实现与执行顺序

Activated and subsequently authorized in full by the user on 2026-09-11. V4.9.0–.8 are implemented with offline validation; batch-nine live quality is operator-approved, while production activation remains pending. See [whole-release report](V4_9-completion-report.md) and the operator approval above. V4.8.11 paid text comparison stays deferred; CURRENT stays V4.9.

Every subrelease below follows `docs/development/NORMALIZED_RELEASE_STANDARD.md`.

Codex must execute them in order unless the user explicitly requests one specific subrelease.

- [V4.9.0 — Vision call inventory](subreleases/V4_9_0-vision-call-inventory.md)
- [V4.9.1 — Vision canonical request](subreleases/V4_9_1-vision-canonical-request.md)
- [V4.9.2 — Vision response normalization](subreleases/V4_9_2-vision-response-normalization.md)
- [V4.9.3 — Remove concrete model-name capability logic](subreleases/V4_9_3-remove-concrete-model-name-capability-logic.md)
- [V4.9.4 — Vision benchmark fixtures](subreleases/V4_9_4-vision-benchmark-fixtures.md)
- [V4.9.5 — Vision graders](subreleases/V4_9_5-vision-graders.md)
- [V4.9.6 — Vision challenger offline](subreleases/V4_9_6-vision-challenger-offline.md)
- [V4.9.7 — Vision fallback policy](subreleases/V4_9_7-vision-fallback-policy.md)
- [V4.9.8 — Vision primary promotion gate](subreleases/V4_9_8-vision-primary-promotion-gate.md)

Stage evidence: [V4.9.1](V4_9_1-completion-report.md), [V4.9.2](V4_9_2-completion-report.md), [V4.9.3](V4_9_3-completion-report.md), [V4.9.4](V4_9_4-completion-report.md), [V4.9.5](V4_9_5-completion-report.md), [V4.9.6](V4_9_6-completion-report.md), [V4.9.7](V4_9_7-completion-report.md), [V4.9.8](V4_9_8-completion-report.md).

回归优化：正式构建测试适配、历史/平台说明按需加载、统一发布检查，详见 [交付报告](V4_9-regression-optimization-report.md)。

第二轮整体回归：模板摘要、当前批准状态说明、创建测试超时诊断及新的全量验证，见 [第二轮回归报告](V4_9-regression-review2-report.md)。
