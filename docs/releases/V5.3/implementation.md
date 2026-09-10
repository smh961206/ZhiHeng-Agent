# V5.3 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.3 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/knowledge.mjs`
- `server/knowledge-excerpt.mjs`
- `server/knowledge-snapshots.mjs`
- `knowledge/`
- `server/research-context.mjs`
- `tests/`

## 本版本明确不做

- 不要改财务算法
- 不要引入向量数据库
- 不要建立 Fact Engine
- 不要修改公司具体结论

## 子版本实施矩阵

### V5.3.0 — Knowledge 现状盘点

**目标/改造：** 扫描 knowledge/、knowledge.mjs、knowledge-excerpt.mjs、knowledge-snapshots.mjs；建立 module/section/hash/加载关系清单；只记录，不改变运行行为。

**必须测试：** 现有 Knowledge 全测试；manifest 完整性；同输入输出快照不变。

**完成判定：** 所有现有知识文件均被映射；运行行为变化=0。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.1 — Rule ID 基础

**目标/改造：** 从 Evidence/Period/Currency/Valuation/Audit/Prohibitions 中选择 20–50 条高影响规则，增加稳定 Rule ID、type、scope、severity、rationale、tests；保留原 Markdown。

**必须测试：** Rule ID 唯一性；旧 section→Rule 映射；snapshot 兼容。

**完成判定：** 没有重复 ID；旧快照仍能回放。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.2 — Constitution 抽取

**目标/改造：** 从 overview/prohibitions/principles 中抽取最高优先级且跨行业稳定的研究宪法；建立 precedence；不增加新的投资观点。

**必须测试：** Constitution 加载顺序；重复硬规则检测；跨模式加载。

**完成判定：** 宪法短、稳定、始终加载；不包含公司现时观点。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.3 — Ontology Foundation

**目标/改造：** 建立 Period/Currency/Metric/Security/ShareBasis/AccountingScope/ValuationBasis 第一版 canonical IDs 与 aliases；歧义 alias 必须带条件。

**必须测试：** FY/TTM/YTD/Instant；FCFF/FCFE；EV/Equity；歧义 alias。

**完成判定：** 概念具有唯一 canonical ID；歧义不被强行映射。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.4 — Knowledge Resolver Dry-run

**目标/改造：** 输入 mode/archetype/claim/method，输出最小 Knowledge Pack；先与 legacy 加载结果并行比较，不改变真实 prompt。

**必须测试：** A–F 六模式；未知 archetype；Bank/Commodity 等样例；pack diff。

**完成判定：** 不得因为少加载而丢失硬规则；缺分类时安全回退。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.5 — Context Compiler

**目标/改造：** 按 Constitution→Ontology→Methodology→Playbook→Contract 排序编译 context；按 Rule ID 去重；生成 pack fingerprint。

**必须测试：** 指纹稳定；重复消除；token 体积；resume pin。

**完成判定：** 同一输入生成稳定 pack；运行中不热切 Knowledge。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.6 — Knowledge Linter

**目标/改造：** 检查重复 ID、未定义 ontology、硬规则冲突、循环依赖、孤儿规则、缺 scope、缺 tests、失效时间。

**必须测试：** 正例/重复/冲突/循环/过期规则 fixtures。

**完成判定：** Critical linter error 阻止新 K snapshot 发布。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.7 — Knowledge Regression

**目标/改造：** 为银行 FCF、周期正常化、FCFF→EV、期间/币种、缺数诚实建立正例和反例回归。

**必须测试：** 跨行业不误触发；旧 baseline 对比。

**完成判定：** 修一个规则不能破坏相邻行业；每条关键规则至少有回归 ID。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.8 — K-Series & Pinning

**目标/改造：** 启用 K1.0.0；新 Job 固定 knowledgeVersion/fingerprint；旧 Job 继续 legacy snapshot。

**必须测试：** 版本解析；新/旧 checkpoint；运行中升级 K 版本。

**完成判定：** 任务全程固定 K 版本；历史 snapshot 可精确读取。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.9 — Knowledge Change Proposal

**目标/改造：** 定义 KCP：来源、Root Cause、affected rules、proposed change、risk、positive/negative tests；增加 KnowledgeDebt。

**必须测试：** KCP schema；Root Cause 必填；Debt lifecycle。

**完成判定：** 不能用改 Knowledge 掩盖 Retrieval/Tool/Model 错误。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.10 — Promote-to-runtime

**目标/改造：** 增加 enforcement=prompt/validator/engine/hybrid；把已有代码已能确定执行的少量硬规则绑定 runtime validator，解释文本仍留 Knowledge。

**必须测试：** Prompt vs runtime 一致性；非法 period/currency/value basis。

**完成判定：** 规则不会在 Prompt 和 Runtime 两套定义里产生相反行为。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.3.11 — Impact / Rule Decay

**目标/改造：** 建立 Rule→Mode/Archetype/Claim/Benchmark 影响图；支持 effectiveFrom/effectiveTo/jurisdiction/lastValidatedAt/needs_review。

**必须测试：** 过期规则；影响清单；时间适用。

**完成判定：** 发布前能列出受影响测试；过期规则不静默生效。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
