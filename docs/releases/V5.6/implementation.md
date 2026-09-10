# V5.6 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.6 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/calculations.mjs`
- `server/cashflow-bridge.mjs`
- `server/normalized-earnings.mjs`
- `server/reinvestment.mjs`
- `server/research-sensitivity.mjs`
- `server/valuation-snapshot.mjs`
- `server/valuation-history.mjs`
- `server/valuation-review.mjs`
- `server/shareholder-return.mjs`
- `server/agent-execution.mjs`
- `server/research-output.mjs`

## 本版本明确不做

- 不要重新发明已有财务公式
- 不要引入概率 Belief
- 不要用 Claim 替代 Evidence

## 子版本实施矩阵

### V5.6.0 — Calculation Inventory

**目标/改造：** 盘点 calculations/cashflow-bridge/normalized-earnings/reinvestment/sensitivity/valuation/shareholder-return，冻结当前数值 baseline。

**必须测试：** 所有 calculation golden tests。

**完成判定：** 运行数值完全不变。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.1 — Formula Registry

**目标/改造：** 给 ROIC/FCF/PE/PB/DCF/DDM/SOTP/TSR 稳定 formulaId/version；语义改变必须 bump version。

**必须测试：** ID/Version/Golden outputs。

**完成判定：** 同 formula version 行为稳定。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.2 — Calculation Record

**目标/改造：** 输出 calculationId/formula/inputFactIds/inputCalculationIds/assumptionIds/result/unit/currency，兼容旧 tool payload。

**必须测试：** roundtrip/recovery/legacy。

**完成判定：** 结构化路径启用时所有 material calculation 可复现。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.3 — Assumption Registry

**目标/改造：** 假设独立对象：value/unit/horizon/evidence/sensitivity/invalidation/affects；不得和 Fact 混。

**必须测试：** Fact vs Assumption；resume；valuation binding。

**完成判定：** Assumption 永不静默 Verified。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.4 — Claim Schema V1

**目标/改造：** Deep Research 先结构化核心 Claim：statement/category/horizon/status/support/counter/facts/calcs/assumptions/gaps/invalidation。

**必须测试：** 状态机；bad evidence ref；legacy report。

**完成判定：** 未解决 Claim 显式存在。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.5 — Counter Evidence First-class

**目标/改造：** supportingEvidenceIds 与 counterEvidenceIds 分离；review 检查反证处理。

**必须测试：** 反证保留；报告遗漏检测。

**完成判定：** 材料反证不会因与结论冲突被丢弃。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.6 — Claim Dependencies

**目标/改造：** dependsOn + cycle rejection + horizon warnings。

**必须测试：** cycle、ordering、跨周期。

**完成判定：** 硬 dependency graph 无环。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.7 — Dependency DAG V1

**目标/改造：** 连接 Fact→Calculation→Claim；上游 revision 先标 stale/needs_revalidation，不自动重算。

**必须测试：** stale propagation；idempotency；resume。

**完成判定：** Fact 修订后旧 Calculation 不能继续当 fresh 发布。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.8 — System Invariants Runtime

**目标/改造：** 把 Verified Fact lineage、Calculation lineage、Published Claim state、period/currency compatibility 作为 hard blockers。

**必须测试：** 非法对象；transition exceptions。

**完成判定：** 结构化非法状态不能通过正式发布。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.9 — Causal Mechanism Metadata

**目标/改造：** Claim 可记录 mechanism/cause/effect/alternative explanations，禁止强因果无证据。

**必须测试：** alternative explanation；serialization。

**完成判定：** 叙事不能自动升级成因果事实。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.10 — Narrative Discipline

**目标/改造：** Review 增加 narrative-risk：强叙事、少 Fact/Mechanism 时降级。

**必须测试：** story-heavy 与 evidence-backed fixtures。

**完成判定：** 模型“讲得漂亮”不能替代证据。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.11 — Claim Renderer Sidecar

**目标/改造：** UI/API 展示 Claim status/support/counter/gaps，不替换 legacy report。

**必须测试：** renderer/citation。

**完成判定：** 结构化 Claim 与 storage 一致。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.6.12 — Claim Benchmark

**目标/改造：** 建立 supported/conflicted/refuted/insufficient/stale/counter-evidence fixtures。

**必须测试：** benchmark regression。

**完成判定：** unsupported high-confidence claim 不增加。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
