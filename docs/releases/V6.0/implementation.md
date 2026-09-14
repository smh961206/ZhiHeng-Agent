# V6.0 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V6.0 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/storage.ts`
- `server/schema-migrations.ts`
- `API routes`
- `frontend`
- `all canonical domain collections`
- `scheduler/checkpoint modules`

## 本版本明确不做

- 不为“架构漂亮”提前上分布式
- 不让多租户便利破坏研究 invariants
- 不暴露 secrets/CoT

## 子版本实施矩阵

### V6.0.0 — Ownership Inventory

**目标/改造：** 先盘点全部 collection/API 的 user/global/workspace scope，再迁多用户。

**必须测试：** inventory。

**完成判定：** 不先做 auth 后补数据隔离。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.1 — Workspace/Tenant Schema

**目标/改造：** workspaceId/tenantId additive；现有数据映射 default workspace，先备份。

**必须测试：** migration/isolation。

**完成判定：** 单用户体验在 default workspace 保持。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.2 — RBAC V1

**目标/改造：** Owner/Researcher/Reviewer/Viewer 服务器端权限。

**必须测试：** role matrix/deny。

**完成判定：** 前端不能绕过 server permission。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.3 — Audit Ledger

**目标/改造：** Fact revision/K publish/Human Override/Research publish/Decision/Critical escalation append audit。

**必须测试：** append/refs/secrets。

**完成判定：** 关键变更有 audit event。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.4 — Data Classification

**目标/改造：** PUBLIC/PRIVATE/CONFIDENTIAL/RESTRICTED，默认规则且不可静默降级。

**必须测试：** classification/export。

**完成判定：** RESTRICTED 不送不允许 Provider。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.5 — Provider Governance

**目标/改造：** Workspace+Classification 决定 allow providers；在 cost routing 前 hard gate。

**必须测试：** restricted fallback。

**完成判定：** 成本不能突破数据治理。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.6 — Human Override Provenance

**目标/改造：** who/when/old/new/reason/status；模型 rerun 不静默覆盖。

**必须测试：** override/revoke。

**完成判定：** Override sticky 且 audit。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.7 — Human Research Workflow

**目标/改造：** Approve/Reject Fact、Pin Evidence、Override Claim、Add Assumption、Request Re-check、Comment。

**必须测试：** role/workflow/audit。

**完成判定：** 审批状态结构化。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.8 — Research Workbench Shell

**目标/改造：** Thesis/Claims/Beliefs/Facts/Assumptions/Valuation/Risks/Catalysts/Evidence/Timeline/Decision/Diff。

**必须测试：** routes/drilldown/legacy report。

**完成判定：** 核心对象不靠解析 Markdown 展示。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.9 — Lineage Drill-down

**目标/改造：** Fact→Evidence→Source/Page；Claim→support/counter/facts/calcs/assumptions。

**必须测试：** broken refs/permission。

**完成判定：** Explainability by construction。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.10 — Research Package

**目标/改造：** manifest+facts+claims+beliefs+assumptions+calculations+valuation+state+provenance+report，排除 secret/CoT。

**必须测试：** validator/roundtrip/redaction。

**完成判定：** Package 校验不依赖 report prose。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.11 — ZRP v1

**目标/改造：** Research Package interchange protocol、schema/version negotiation、forward compatibility。

**必须测试：** version/unknown fields。

**完成判定：** 可独立验证。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.12 — API/MCP Surface

**目标/改造：** 结构化 read/search/export 先行；write 需 RBAC+Audit+Validation。

**必须测试：** auth/version/rate limits。

**完成判定：** 外部系统不能绕过 invariants。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.13 — Worker/Queue

**目标/改造：** 只有实际多实例/Continuous load 需要时引入 idempotent jobs/lease/retry/DLQ/resume。

**必须测试：** crash/retry/duplicate。

**完成判定：** 重试不重复发布/计算。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.14 — Tenant-safe Continuous Research

**目标/改造：** workspace schedules/quotas/budgets/isolation。

**必须测试：** quota/isolation。

**完成判定：** 一个 workspace 不触发另一个研究。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V6.0.15 — Production Hardening/DR

**目标/改造：** backup/restore drill、schema recovery、SLO、retention、incident/provider outage。

**必须测试：** restore/outage。

**完成判定：** Research State+Provenance 可恢复。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 基础设施与数据架构增量规划

- 租户边界必须同时覆盖主数据库、对象存储、缓存键、搜索索引、队列消息、SSE 通道、审计日志和导出物；若采用 PostgreSQL，应用层隔离与 RLS 形成双层防护。
- PostgreSQL 切换只在 V5.5 接受的 ADR、双读/新写/回填验证和回滚演练全部通过后实施。若证据不足，V6.0 继续使用加固后的 MongoDB/GridFS。
- Redis 是可选的派生基础设施，仅用于经测量需要的热点缓存、限流、短期协调或多实例会话；规范状态不得只存在 Redis，分布式锁必须使用 fencing token、超时和幂等保护。
- V6.0.13 只有在真实多执行器、积压或隔离指标触发后才引入消息代理。默认候选为 RabbitMQ；Kafka 仅用于明确的高吞吐事件流/日志平台需求，RocketMQ 仅用于既有生态和事务消息需求。
- 消息发布采用事务 outbox，消费采用 inbox/幂等键、有限重试和死信处理；代理不得替代数据库事务或研究生命周期状态机。
- 独立向量数据库、对象存储、分析存储和读副本分别受容量、延迟、成本、恢复目标和运维成熟度 Gate 约束；所有派生系统都必须支持从规范状态重建。
- 生产化必须覆盖租户审计、密钥与最小权限、备份恢复、跨存储一致性校验、OpenTelemetry 追踪、指标/日志脱敏、依赖清单和供应链扫描。微服务、Kubernetes 和多地域部署只在明确组织与可用性需求下另行立项。

跨版本背景见 [V5.3 至 V6.0 基础设施与数据架构演进方案](../../architecture/infrastructure-data-evolution-plan-v5.3-v6.0.md)。本节及本版本子规格是 V6.0 的执行依据。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
