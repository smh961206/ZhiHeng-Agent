# V5.4 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V54-01 — V5.4.0 Source Contract Adapter

- **Then:** 现有 connector 不受破坏；缺字段保持 unknown。
- **Evidence:** 各 connector；时间语义；rawHash。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-02 — V5.4.1 Evidence Contract

- **Then:** 现有报告 citation 不失效；Vision 来源可识别。
- **Evidence:** PDF/网页/Vision/表格 evidence；旧 citation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-03 — V5.4.2 BM25 Lexical

- **Then:** BM25 不导致 exact 财务命中退化。
- **Evidence:** 财务指标精确词；中文；page/source filter。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-04 — V5.4.3 Semantic Retrieval

- **Then:** 向量相似度不能创建 Verified Fact。
- **Evidence:** 管理层讨论/风险/商业模式；数字非权威测试。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-05 — V5.4.4 Hybrid Fusion

- **Then:** Exact/Page 结果不会因 vector score 被吞掉。
- **Evidence:** score normalize；duplicate collapse；source/security filters。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-06 — V5.4.5 Reranker

- **Then:** reranker failure 不导致研究失败或证据丢失。
- **Evidence:** 相关性；超时；跨证券污染。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-07 — V5.4.6 Retrieval Planner

- **Then:** “营收多少”不默认只走 semantic；管理层观点可走 hybrid。
- **Evidence:** query classifier；fallback；预算。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-08 — V5.4.7 Evidence Pack

- **Then:** 反证和缺口不会在 pack 编译中丢失。
- **Evidence:** counter evidence；gap；citation；pack size。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-09 — V5.4.8 Contradiction Registry

- **Then:** 无法解决时保持 conflicted。
- **Evidence:** 冲突分类；resolved/unresolved；保留双来源。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V54-10 — V5.4.9 Retrieval Benchmark

- **Then:** 提升语义 recall 不得以显著损害财务 exact accuracy 为代价。
- **Evidence:** benchmark repeatability；channel ablation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
