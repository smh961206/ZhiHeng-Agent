# V5.11 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V511-01 — V5.11.0 Research Snapshot

- **Then:** 绝不伪造历史快照。
- **Evidence:** completeness/hash。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-02 — V5.11.1 Point-in-time Replay

- **Then:** 无法精确 replay 时显式 partial。
- **Evidence:** future leakage/restatement/old K。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-03 — V5.11.2 Research Provenance ID

- **Then:** 行为相关输入改变则 provenance 改。
- **Evidence:** same inputs same hash。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-04 — V5.11.3 Failure Registry

- **Then:** Critical resolved failure 必须绑定 regression。
- **Evidence:** lifecycle/root cause。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-05 — V5.11.4 Decision Journal

- **Then:** 未来结果不能改写当时理由。
- **Evidence:** immutability。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-06 — V5.11.5 Outcome Model

- **Then:** Outcome 不覆盖 Decision。
- **Evidence:** types/resolution。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-07 — V5.11.6 Return Attribution

- **Then:** 残差可 unknown。
- **Evidence:** reconcile。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-08 — V5.11.7 Belief Calibration

- **Then:** 模糊 outcome 不强行计分。
- **Evidence:** resolved/unresolved/hindsight guard。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-09 — V5.11.8 Decision Calibration

- **Then:** 不把少量样本当因果。
- **Evidence:** sample size。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-10 — V5.11.9 Research Genealogy

- **Then:** 新 State 不修改旧 State。
- **Evidence:** branch/parent。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-11 — V5.11.10 Structured Diff

- **Then:** 不依赖 Markdown 文本差异。
- **Evidence:** no-change/partial。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-12 — V5.11.11 Institutional Memory

- **Then:** Memory 结果保留 provenance/version。
- **Evidence:** search/source links。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V511-13 — V5.11.12 Offline Knowledge/Policy Learning

- **Then:** Production 不能自行改 live K/MP。
- **Evidence:** no-autopublish。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
