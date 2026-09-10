# V5.6 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V56-01 — V5.6.0 Calculation Inventory

- **Then:** 运行数值完全不变。
- **Evidence:** 所有 calculation golden tests。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-02 — V5.6.1 Formula Registry

- **Then:** 同 formula version 行为稳定。
- **Evidence:** ID/Version/Golden outputs。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-03 — V5.6.2 Calculation Record

- **Then:** 结构化路径启用时所有 material calculation 可复现。
- **Evidence:** roundtrip/recovery/legacy。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-04 — V5.6.3 Assumption Registry

- **Then:** Assumption 永不静默 Verified。
- **Evidence:** Fact vs Assumption；resume；valuation binding。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-05 — V5.6.4 Claim Schema V1

- **Then:** 未解决 Claim 显式存在。
- **Evidence:** 状态机；bad evidence ref；legacy report。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-06 — V5.6.5 Counter Evidence First-class

- **Then:** 材料反证不会因与结论冲突被丢弃。
- **Evidence:** 反证保留；报告遗漏检测。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-07 — V5.6.6 Claim Dependencies

- **Then:** 硬 dependency graph 无环。
- **Evidence:** cycle、ordering、跨周期。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-08 — V5.6.7 Dependency DAG V1

- **Then:** Fact 修订后旧 Calculation 不能继续当 fresh 发布。
- **Evidence:** stale propagation；idempotency；resume。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-09 — V5.6.8 System Invariants Runtime

- **Then:** 结构化非法状态不能通过正式发布。
- **Evidence:** 非法对象；transition exceptions。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-10 — V5.6.9 Causal Mechanism Metadata

- **Then:** 叙事不能自动升级成因果事实。
- **Evidence:** alternative explanation；serialization。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-11 — V5.6.10 Narrative Discipline

- **Then:** 模型“讲得漂亮”不能替代证据。
- **Evidence:** story-heavy 与 evidence-backed fixtures。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-12 — V5.6.11 Claim Renderer Sidecar

- **Then:** 结构化 Claim 与 storage 一致。
- **Evidence:** renderer/citation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V56-13 — V5.6.12 Claim Benchmark

- **Then:** unsupported high-confidence claim 不增加。
- **Evidence:** benchmark regression。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
