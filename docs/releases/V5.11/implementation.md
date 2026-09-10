# V5.11 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.11 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `Research State`
- `Knowledge snapshots`
- `Model Policy`
- `Fact/Evidence snapshots`
- `Formula Registry`
- `Decision/Portfolio modules`
- `storage/migrations`

## 本版本明确不做

- 不使用未来信息评估过去
- 不在线自动发布 Knowledge/Policy
- 不把赚钱自动等同研究正确

## 子版本实施矩阵

### V5.11.0 — Research Snapshot

**目标/改造：** 冻结 App/MP/K/Ontology/Retrieval/Formula/Evidence/Fact/Market refs；legacy 不可恢复字段标 unknown。

**必须测试：** completeness/hash。

**完成判定：** 绝不伪造历史快照。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.1 — Point-in-time Replay

**目标/改造：** 只加载 original cutoff 前 published evidence + 当时可用 Facts/K/Policy/Market。

**必须测试：** future leakage/restatement/old K。

**完成判定：** 无法精确 replay 时显式 partial。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.2 — Research Provenance ID

**目标/改造：** canonical manifest serialization + hash，不含 secrets/CoT。

**必须测试：** same inputs same hash。

**完成判定：** 行为相关输入改变则 provenance 改。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.3 — Failure Registry

**目标/改造：** Failure ID/category/severity/root cause/fix/regressionCase/release。

**必须测试：** lifecycle/root cause。

**完成判定：** Critical resolved failure 必须绑定 regression。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.4 — Decision Journal

**目标/改造：** 固定当时 Action/Reason/ExpectedReturn/Assumptions/Invalidation/Horizon/StateVersion。

**必须测试：** immutability。

**完成判定：** 未来结果不能改写当时理由。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.5 — Outcome Model

**目标/改造：** market/business/claim-resolution outcome 分离，带 source/time。

**必须测试：** types/resolution。

**完成判定：** Outcome 不覆盖 Decision。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.6 — Return Attribution

**目标/改造：** earnings/multiple/dividend/buyback/FX/unexpected/residual，和 realized return 对账。

**必须测试：** reconcile。

**完成判定：** 残差可 unknown。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.7 — Belief Calibration

**目标/改造：** Brier/log loss/calibration bins，仅 clear resolution criteria + point-in-time predictions。

**必须测试：** resolved/unresolved/hindsight guard。

**完成判定：** 模糊 outcome 不强行计分。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.8 — Decision Calibration

**目标/改造：** 按 Watch/Starter/Normal/HighConviction 等统计 IRR/hit/drawdown/horizon；小样本警告。

**必须测试：** sample size。

**完成判定：** 不把少量样本当因果。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.9 — Research Genealogy

**目标/改造：** parentStateId/reason/event：Initial→Earnings→Thesis Revision；历史 parent immutable。

**必须测试：** branch/parent。

**完成判定：** 新 State 不修改旧 State。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.10 — Structured Diff

**目标/改造：** Fact/Claim/Belief/Assumption/Valuation/Risk/Decision diff + materiality。

**必须测试：** no-change/partial。

**完成判定：** 不依赖 Markdown 文本差异。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.11 — Institutional Memory

**目标/改造：** Research/Failure/Conflict/Decision 结构化索引，不吸收自由聊天为事实。

**必须测试：** search/source links。

**完成判定：** Memory 结果保留 provenance/version。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.11.12 — Offline Knowledge/Policy Learning

**目标/改造：** 从 failure/outcome 提 KCP/Policy Candidate；必须 Benchmark+Human Approval。

**必须测试：** no-autopublish。

**完成判定：** Production 不能自行改 live K/MP。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
