# V5.9 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.9 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `ResearchState`
- `Claim/Belief/Forecast/Valuation modules`
- `server/research-sensitivity.ts`
- `market/security data`
- `new Mandate/Decision modules`

## 本版本明确不做

- 不执行交易
- 不忽略 Portfolio 约束并假装个股评级=仓位
- 不允许 LLM 绕过 Mandate

## 子版本实施矩阵

### V5.9.0 — Investment Mandate

**目标/改造：** objective/horizon/minExpectedReturn/minMOS/risk/maxPosition/sector-country/liquidity/cash constraints + version pin。

**必须测试：** different mandates。

**完成判定：** 同一 Research State 可给不同 mandate 不同行动。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.1 — Decision Readiness

**目标/改造：** critical claims/gaps/uncertainty/valuation → ready/conditional/not_ready + reasons。

**必须测试：** fatal gap/ready。

**完成判定：** not_ready 不输出 HighConviction。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.2 — Expected Return Decomposition

**目标/改造：** earnings growth/dividend/buyback/multiple/FX，明确 horizon/annualization。

**必须测试：** sum/FX/dividend。

**完成判定：** 预期回报可复现。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.3 — Opportunity Set

**目标/改造：** 多标的 + Cash，同 horizon/mandate 比较；stale/not_ready 显式。

**必须测试：** cash/incomparable/stale。

**完成判定：** Cash 可以排名第一。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.4 — Decision Policy V1

**目标/改造：** Reject/Watch/Starter/Normal/HighConviction/Reduce/Exit + policy version；LLM 只解释。

**必须测试：** hard constraints。

**完成判定：** 模型不能文字覆盖 max position 等硬约束。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.5 — Robustness Shock

**目标/改造：** Revenue/Margin/WACC 等明确 shock templates；输出 robust/fragile。

**必须测试：** shock cases。

**完成判定：** robustness 来自实际重算。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.6 — Permanent Loss Risk

**目标/改造：** leverage/refinancing/liquidity/covenants/survival，缺数据降低 readiness。

**必须测试：** high leverage/cash-rich/missing debt。

**完成判定：** 不把 volatility 等同永久损失。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.7 — Optionality Separation

**目标/改造：** Core Value / Verified Optionality / Speculative Optionality 分离。

**必须测试：** option/no-value。

**完成判定：** speculative upside 不混入 base intrinsic value。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.8 — Decision Sufficiency

**目标/改造：** critical resolved + readiness threshold + no fatal gap + information gain low 时停止研究并披露剩余问题。

**必须测试：** stop/fatal/low-value。

**完成判定：** 不追求无穷完整。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.9 — Value of Information

**目标/改造：** 决策敏感度×不确定性×可获得性/成本的可解释启发式排序。

**必须测试：** high/low VOI。

**完成判定：** 低价值问题不抢占 critical budget。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.10 — Decision Audit Renderer

**目标/改造：** 展示 mandate、readiness、expected return、downside、robustness、opportunity cost、gaps，不展示 CoT。

**必须测试：** traceability。

**完成判定：** 用户能复核结构化理由。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.9.11 — Decision Benchmark

**目标/改造：** 冻结 mandate/opportunity cases，测 constraint violation、premature action、cash/no-action correctness。

**必须测试：** benchmark。

**完成判定：** 质量 gate 优先于“更积极/更便宜”建议。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 基础设施与数据架构增量规划

- Decision Journal 采用追加式、不可变记录，固定 mandate、策略版本、Research State、市场/数据截止时间、证据包、模型/规则版本和人工审批信息。
- 目标价格、仓位、风险预算和约束值使用 Decimal 与显式币种/估值口径；任何派生值必须能从固定输入复算。
- 草稿更新使用乐观并发控制；批准、拒绝、撤销、替代和人工覆盖形成独立审计事件，不能原地擦除历史决定。
- 决策查询可使用投影和缓存加速，但规范决策及其证据链必须保存在主存储中；缓存失效不能改变决策语义。
- 本版本只形成决策与审计对象，不执行交易或向外部交易系统写入指令。

跨版本背景见 [V5.3 至 V6.0 基础设施与数据架构演进方案](../../architecture/infrastructure-data-evolution-plan-v5.3-v6.0.md)。本节及本版本子规格是 V5.9 的执行依据。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
