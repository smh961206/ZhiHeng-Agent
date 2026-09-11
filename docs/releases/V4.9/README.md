# V4.9 — Unified Multimodal Layer

最新状态：第九批次两侧均 48/48，用户已正式批准真实视觉质量验收，当前代码／配置准入检查通过。生产路由保持关闭。见 [正式批准记录](vision-operator-approval-20260911.md)；下方保留历史批次。

当前代码的整体回归与发布维护见 [第二轮回归报告](V4_9-regression-review2-report.md)。

## 历史验证记录

批准前审核：输出约束修正后的真实批次候选 48/48、基线 47/48，逐图技术审核与回滚检查完成；当时正式操作人批准待确认。见 [修正与审核报告](vision-output-constraints-review-20260911.md)。

早期完整批次：用户恢复后的独立 Coding 接口真实对照完成 96 次调用；候选严格通过 46/48、基线 41/48，候选两例脚注标记不满足现有门槛，当时未批准晋升。见 [本轮记录](vision-live-coding-acceptance-20260911.md)。

2026-09-11：真实模型质量验收已尝试，因智谱余额／资源不足未形成完整对照；用户明确要求暂时搁置。暂停期间不自动发起付费调用或启用候选路由。部分结果、未知请求和恢复条件见 [暂停记录](vision-live-acceptance-paused-20260911.md)。以下“未运行”描述保留原工程交付时点含义。

At the original engineering handoff, live quality acceptance was still open. The user-authorized [review fixes](V4_9-review-fixes-report.md) cover durable comparison progress, selected-model status, cancel/retry finalization and safe admission caching. The retry failure has a deterministic repair and regression check. Earlier [acceptance results](V4_9-acceptance-report.md) remain historical evidence; implementation coverage is not real-model quality acceptance.

## 当前实现范围

Implementation Status: CURRENT for V4.9.0–.8 implementation and offline validation; real candidate quality is operator-approved, while production activation remains pending. The user authorized the entire V4.9 on 2026-09-11. See [whole-release report](V4_9-completion-report.md) and [comparison runbook](vision-comparison-runbook.md). CURRENT remains V4.9; V5.0 is not authorized.

This work does not accept V4.8.11 live model quality or resume its deferred paid pilot. Legacy remains the production default. Vision has its own closed admission gate, 48 frozen synthetic originals and deterministic grading; simulated calls cannot qualify for promotion.

## Goal

Make Vision a capability-routed Gateway workload; benchmark and optionally introduce primary/fallback models without changing Vision evidence trust rules.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V4.9.0 — Vision request normalization:** All Vision model requests use Model Gateway with imageInput capability.
- **V4.9.1 — Vision fixture harness:** Create frozen financial-table/screenshot/scanned-PDF benchmark.
- **V4.9.2 — Vision challenger:** Add second image-capable profile offline.
- **V4.9.3 — Primary/fallback policy:** Provider/capability failure fallback; unreadable input is not repeated blindly.
- **V4.9.4 — Rollout:** Switch primary only if benchmark passes; preserve old profile as fallback.

## Scope lock

Only the items described by this release and its subreleases are in scope.

Future release concepts may be referenced for compatibility, but may not be implemented opportunistically.

## Required read-before-code

- `AGENTS.md`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- relevant contracts
- relevant invariants
- relevant ADRs
- current repository implementation/tests
