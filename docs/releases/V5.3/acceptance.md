# V5.3 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V53-01 — V5.3.0 Knowledge 现状盘点

- **Then:** 所有现有知识文件均被映射；运行行为变化=0。
- **Evidence:** 现有 Knowledge 全测试；manifest 完整性；同输入输出快照不变。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-02 — V5.3.1 Rule ID 基础

- **Then:** 没有重复 ID；旧快照仍能回放。
- **Evidence:** Rule ID 唯一性；旧 section→Rule 映射；snapshot 兼容。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-03 — V5.3.2 Constitution 抽取

- **Then:** 宪法短、稳定、始终加载；不包含公司现时观点。
- **Evidence:** Constitution 加载顺序；重复硬规则检测；跨模式加载。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-04 — V5.3.3 Ontology Foundation

- **Then:** 概念具有唯一 canonical ID；歧义不被强行映射。
- **Evidence:** FY/TTM/YTD/Instant；FCFF/FCFE；EV/Equity；歧义 alias。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-05 — V5.3.4 Knowledge Resolver Dry-run

- **Then:** 不得因为少加载而丢失硬规则；缺分类时安全回退。
- **Evidence:** A–F 六模式；未知 archetype；Bank/Commodity 等样例；pack diff。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-06 — V5.3.5 Context Compiler

- **Then:** 同一输入生成稳定 pack；运行中不热切 Knowledge。
- **Evidence:** 指纹稳定；重复消除；token 体积；resume pin。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-07 — V5.3.6 Knowledge Linter

- **Then:** Critical linter error 阻止新 K snapshot 发布。
- **Evidence:** 正例/重复/冲突/循环/过期规则 fixtures。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-08 — V5.3.7 Knowledge Regression

- **Then:** 修一个规则不能破坏相邻行业；每条关键规则至少有回归 ID。
- **Evidence:** 跨行业不误触发；旧 baseline 对比。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-09 — V5.3.8 K-Series & Pinning

- **Then:** 任务全程固定 K 版本；历史 snapshot 可精确读取。
- **Evidence:** 版本解析；新/旧 checkpoint；运行中升级 K 版本。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-10 — V5.3.9 Knowledge Change Proposal

- **Then:** 不能用改 Knowledge 掩盖 Retrieval/Tool/Model 错误。
- **Evidence:** KCP schema；Root Cause 必填；Debt lifecycle。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-11 — V5.3.10 Promote-to-runtime

- **Then:** 规则不会在 Prompt 和 Runtime 两套定义里产生相反行为。
- **Evidence:** Prompt vs runtime 一致性；非法 period/currency/value basis。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V53-12 — V5.3.11 Impact / Rule Decay

- **Then:** 发布前能列出受影响测试；过期规则不静默生效。
- **Evidence:** 过期规则；影响清单；时间适用。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
