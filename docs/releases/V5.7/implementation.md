# V5.7 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.7 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/job-checkpoints.mjs`
- `server/research-resume.mjs`
- `server/research-sensitivity.mjs`
- `valuation modules`
- `Fact/Claim/Assumption modules added by V5.5–V5.6`

## 本版本明确不做

- 不要输出真正仓位决策
- 不要做在线自学习
- 不要越级做 Portfolio

## 子版本实施矩阵

### V5.7.0 — Hypothesis Schema

**目标/改造：** 多竞争解释对象，关联 support/counter/alternative/affectedClaims；先用于利润/毛利变化等。

**必须测试：** 多 hypothesis；unresolved。

**完成判定：** 可同时保留多个合理解释。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.1 — Hypothesis Evaluation Loop

**目标/改造：** Agent 主动找区分性证据与反证，不以第一个合理解释直接收敛。

**必须测试：** discrimination；budget。

**完成判定：** 关键模糊问题至少检查替代解释。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.2 — Belief Schema

**目标/改造：** Claim 与 Belief 分离；prior/currentProbability/uncertainty/update history。

**必须测试：** probability range；claim linkage。

**完成判定：** 概率不替代 evidence status。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.3 — Uncertainty Runtime

**目标/改造：** data/model/structural/future/irreducible 分类并分别路由 retrieval/review/scenario/monitoring。

**必须测试：** 五类不确定性。

**完成判定：** irreducible 不无限搜。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.4 — Forecast Data Model

**目标/改造：** Forecast 具有 horizon/driver/fact inputs/assumption inputs/scenario；epistemic=forecast。

**必须测试：** lineage；period。

**完成判定：** 预测不可假装 Fact。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.5 — Revenue Forecast V1

**目标/改造：** 支持 simple growth 与可用时 volume×price×mix，不强制不存在的 driver。

**必须测试：** growth/volume-price/missing driver。

**完成判定：** 缺 driver 进入 assumption/unknown。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.6 — Margin/FCF Forecast V1

**目标/改造：** Margin 与 FCF driver；使用 verified history + explicit assumptions；沿用 Formula Registry。

**必须测试：** margin/FCF math。

**完成判定：** 预测可复现。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.7 — Scenario V1

**目标/改造：** Base/Bull/Bear 共享 base assumptions 并以 override 表达，不复制一堆不一致参数。

**必须测试：** scenario inheritance；valuation。

**完成判定：** 情景值可追 assumptions。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.8 — Reverse Valuation

**目标/改造：** Reverse DCF/PE 求市场隐含 assumptions；无解/多解必须报告。

**必须测试：** solve/no-solution/multiple。

**完成判定：** implied value 标记 Derived/Implied。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.9 — Research State Schema

**目标/改造：** 新 research_states：thesis/claims/beliefs/facts/assumptions/valuation/risks/catalysts/gaps/monitoring/versions。

**必须测试：** serialization/asOf/resume。

**完成判定：** State 能表达不确定和反证。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.10 — Research State Builder

**目标/改造：** 从结构化对象组装 State，不从 final markdown 反向解析。

**必须测试：** builder invalid/legacy。

**完成判定：** Report prose 不成为事实源。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.11 — State Renderer

**目标/改造：** behind flag 用 State 渲染 Markdown；与 legacy report 做 parity。

**必须测试：** sections/citations/gaps。

**完成判定：** 不用 LLM 重算已结构化事实即可出报告。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.12 — Research IR V1

**目标/改造：** target/asOf/mode/hypotheses/claims/evidenceRequirements/methods/constraints；从现有 plan 编译，不重写 workflow。

**必须测试：** IR serialize/resume/equivalence。

**完成判定：** IR 是 plan，不是 prompt dump/report。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.13 — Decision Readiness Inputs

**目标/改造：** 只计算 critical claim coverage/fatal gaps/uncertainty/valuation readiness，不做买卖建议。

**必须测试：** ready inputs。

**完成判定：** 本版本不越级进入 Decision Engine。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.14 — Calibration Capture

**目标/改造：** 保存可事后解析的 prediction target/resolution criteria/date/probability/state version。

**必须测试：** resolution spec；PIT。

**完成判定：** 未来可评估且不可 hindsight 改写。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.7.15 — Scenario Tree Reservation

**目标/改造：** 仅增加 parent/child/conditional probability schema 预留，不实现 Monte Carlo。

**必须测试：** schema。

**完成判定：** 不越级做高级情景模拟。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
