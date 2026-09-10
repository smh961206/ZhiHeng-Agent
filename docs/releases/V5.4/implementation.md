# V5.4 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.4 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/evidence-search.mjs`
- `server/evidence-followup.mjs`
- `server/web-evidence.mjs`
- `server/data-archive.mjs`
- `server/document-reader.mjs`
- `server/pdf-processing.mjs`
- `server/research-context.mjs`

## 本版本明确不做

- 不要把 Vector RAG 变唯一检索
- 不要创建 Verified Fact
- 不要改估值算法

## 子版本实施矩阵

### V5.4.0 — Source Contract Adapter

**目标/改造：** 围绕现有 web/document/XBRL/provider connector 建 SourceRecord adapter；区分 eventTime/effectiveAt/publishedAt/retrievedAt；未知不猜。

**必须测试：** 各 connector；时间语义；rawHash。

**完成判定：** 现有 connector 不受破坏；缺字段保持 unknown。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.1 — Evidence Contract

**目标/改造：** 统一 sourceId/page/block/table/cell/extractionMethod/uncertainty；旧 evidenceId 继续可解析。

**必须测试：** PDF/网页/Vision/表格 evidence；旧 citation。

**完成判定：** 现有报告 citation 不失效；Vision 来源可识别。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.2 — BM25 Lexical

**目标/改造：** 在 evidence-search 现有 exact/alias/page 上增加 BM25；精确命中保留优先权。

**必须测试：** 财务指标精确词；中文；page/source filter。

**完成判定：** BM25 不导致 exact 财务命中退化。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.3 — Semantic Retrieval

**目标/改造：** 增加 embedding provider/index，只提高定性语义 recall；记录 embedding model/version。

**必须测试：** 管理层讨论/风险/商业模式；数字非权威测试。

**完成判定：** 向量相似度不能创建 Verified Fact。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.4 — Hybrid Fusion

**目标/改造：** 合并 Exact/BM25/Semantic/Page/Table candidates，保留每个 channel provenance。

**必须测试：** score normalize；duplicate collapse；source/security filters。

**完成判定：** Exact/Page 结果不会因 vector score 被吞掉。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.5 — Reranker

**目标/改造：** 统一 reranker interface；失败回退 fused candidates；reranker 不得创造新 Evidence。

**必须测试：** 相关性；超时；跨证券污染。

**完成判定：** reranker failure 不导致研究失败或证据丢失。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.6 — Retrieval Planner

**目标/改造：** 分类 fact/exact/semantic/hybrid/page/table query；财务数字优先 exact/structured。

**必须测试：** query classifier；fallback；预算。

**完成判定：** “营收多少”不默认只走 semantic；管理层观点可走 hybrid。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.7 — Evidence Pack

**目标/改造：** ResearchContext 改为结构化 primary evidence/counter evidence/gaps/source metadata；控制 token budget。

**必须测试：** counter evidence；gap；citation；pack size。

**完成判定：** 反证和缺口不会在 pack 编译中丢失。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.8 — Contradiction Registry

**目标/改造：** 持久化 data/period/scope/definition/revision/source 冲突；禁止自动平均。

**必须测试：** 冲突分类；resolved/unresolved；保留双来源。

**完成判定：** 无法解决时保持 conflicted。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.4.9 — Retrieval Benchmark

**目标/改造：** ≥100 frozen queries，数字/页码/定性/多文档/冲突分组；Recall@K、MRR、page accuracy、citation hit。

**必须测试：** benchmark repeatability；channel ablation。

**完成判定：** 提升语义 recall 不得以显著损害财务 exact accuracy 为代价。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
