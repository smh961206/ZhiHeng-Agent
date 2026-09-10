# V5.8 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.8 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/web-evidence.mjs`
- `filing/data acquisition modules`
- `server/research-workflow.mjs`
- `server/research-create.mjs`
- `server/job-checkpoints.mjs`
- `ResearchState/DAG modules from V5.7`

## 本版本明确不做

- Event 不直接改 Thesis
- Scheduler 不得先于事件/Delta 稳定
- 不要做自动交易

## 子版本实施矩阵

### V5.8.0 — Event Schema

**目标/改造：** eventId/entity/type/eventTime/publishedAt/evidence，多个 source 可归并。

**必须测试：** dedup/time。

**完成判定：** EventTime 与 publishedAt 不混。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.1 — Event Classifier

**目标/改造：** earnings/guidance/dividend/buyback/capital_raise/management/contract/regulation；unknown 合法。

**必须测试：** 各 type/unknown。

**完成判定：** 不强行分类。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.2 — Event→Fact Impact

**目标/改造：** 事件只触发可能受影响 Fact 的 targeted refresh；不直接产生 Fact。

**必须测试：** earnings/dividend/management。

**完成判定：** Event 不绕过 Fact verification。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.3 — Materiality Engine

**目标/改造：** absolute/relative change + claim sensitivity + thesis importance + optional position weight → ignore/monitor/partial/full/critical。

**必须测试：** threshold/cases。

**完成判定：** 小事件不全量深研。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.4 — Research Delta

**目标/改造：** Fact/Claim/Belief/Assumption/Valuation/Risk/Gap 结构 diff。

**必须测试：** no-change/partial。

**完成判定：** 不是 Markdown diff。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.5 — Selective Revalidation

**目标/改造：** DAG+materiality 选受影响 subgraph，避免无关 Claims 重研。

**必须测试：** single fact/upstream/critical。

**完成判定：** 无关状态保持原验证版本。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.6 — Monitoring Metrics

**目标/改造：** Claim 绑定 metric/cadence/freshness/threshold。

**必须测试：** binding/freshness。

**完成判定：** 不存在行业数据不编造。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.7 — Leading Indicators

**目标/改造：** 独立于 official Fact 的 indicator registry，记录 source/quality/relationship。

**必须测试：** auto/bank/consumer。

**完成判定：** Leading indicator 不覆盖 official facts。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.8 — Thesis Fragility

**目标/改造：** 根据关键假设、变动频率、场景敏感度等形成可解释 fragility。

**必须测试：** stable vs fragile。

**完成判定：** 不是 LLM 单一形容词。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.9 — Research Priority

**目标/改造：** position optional + fragility + new info + valuation sensitivity + uncertainty，critical override。

**必须测试：** priority ordering。

**完成判定：** 低优先不屏蔽重大事件。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.10 — Scheduler V1

**目标/改造：** 幂等 scheduled checks、event dedup、research budget、retry/resume；只有前序稳定后开启。

**必须测试：** duplicate/retry/resume。

**完成判定：** 调度失败不改变当前 State。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.8.11 — Continuous Benchmark

**目标/改造：** 冻结事件序列，比 selective 与 full baseline 的 affected-claim recall/成本。

**必须测试：** event benchmark。

**完成判定：** 不得因省成本漏掉 critical Claim。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
