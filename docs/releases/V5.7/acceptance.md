# V5.7 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V57-01 — V5.7.0 Hypothesis Schema

- **Then:** 可同时保留多个合理解释。
- **Evidence:** 多 hypothesis；unresolved。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-02 — V5.7.1 Hypothesis Evaluation Loop

- **Then:** 关键模糊问题至少检查替代解释。
- **Evidence:** discrimination；budget。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-03 — V5.7.2 Belief Schema

- **Then:** 概率不替代 evidence status。
- **Evidence:** probability range；claim linkage。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-04 — V5.7.3 Uncertainty Runtime

- **Then:** irreducible 不无限搜。
- **Evidence:** 五类不确定性。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-05 — V5.7.4 Forecast Data Model

- **Then:** 预测不可假装 Fact。
- **Evidence:** lineage；period。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-06 — V5.7.5 Revenue Forecast V1

- **Then:** 缺 driver 进入 assumption/unknown。
- **Evidence:** growth/volume-price/missing driver。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-07 — V5.7.6 Margin/FCF Forecast V1

- **Then:** 预测可复现。
- **Evidence:** margin/FCF math。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-08 — V5.7.7 Scenario V1

- **Then:** 情景值可追 assumptions。
- **Evidence:** scenario inheritance；valuation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-09 — V5.7.8 Reverse Valuation

- **Then:** implied value 标记 Derived/Implied。
- **Evidence:** solve/no-solution/multiple。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-10 — V5.7.9 Research State Schema

- **Then:** State 能表达不确定和反证。
- **Evidence:** serialization/asOf/resume。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-11 — V5.7.10 Research State Builder

- **Then:** Report prose 不成为事实源。
- **Evidence:** builder invalid/legacy。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-12 — V5.7.11 State Renderer

- **Then:** 不用 LLM 重算已结构化事实即可出报告。
- **Evidence:** sections/citations/gaps。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-13 — V5.7.12 Research IR V1

- **Then:** IR 是 plan，不是 prompt dump/report。
- **Evidence:** IR serialize/resume/equivalence。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-14 — V5.7.13 Decision Readiness Inputs

- **Then:** 本版本不越级进入 Decision Engine。
- **Evidence:** ready inputs。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-15 — V5.7.14 Calibration Capture

- **Then:** 未来可评估且不可 hindsight 改写。
- **Evidence:** resolution spec；PIT。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V57-16 — V5.7.15 Scenario Tree Reservation

- **Then:** 不越级做高级情景模拟。
- **Evidence:** schema。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
