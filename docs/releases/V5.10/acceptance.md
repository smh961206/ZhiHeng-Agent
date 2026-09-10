# V5.10 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V510-01 — V5.10.0 Portfolio/Position Schema

- **Then:** 不自动下单或修改外部持仓。
- **Evidence:** totals/multi-currency。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-02 — V5.10.1 Exposure Engine

- **Then:** 暴露总额和组合价值可对账。
- **Evidence:** reconcile/unknown。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-03 — V5.10.2 Factor Exposure

- **Then:** 输出带 methodology/version。
- **Evidence:** mapping/missing。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-04 — V5.10.3 Liquidity Engine

- **Then:** 缺流动性不猜。
- **Evidence:** liquid/illiquid/missing。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-05 — V5.10.4 Price Correlation

- **Then:** 不使用未来价格。
- **Evidence:** math/PIT/missing。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-06 — V5.10.5 Thesis Correlation

- **Then:** 低价格相关也能发现逻辑集中。
- **Evidence:** shared/independent/stale。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-07 — V5.10.6 Business Graph V1

- **Then:** 无证据关系不能当 Verified。
- **Evidence:** relations/expiry。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-08 — V5.10.7 Macro/Regime State

- **Then:** 宏观 State 不等于公司 Fact。
- **Evidence:** fresh/unknown/PIT。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-09 — V5.10.8 Hidden Exposure

- **Then:** 解释可追关系与 Claim。
- **Evidence:** hidden exposure/false positives。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-10 — V5.10.9 Risk Budget

- **Then:** Hard breach 阻止 allocation。
- **Evidence:** breach。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-11 — V5.10.10 Capital Allocation V1

- **Then:** 不可行时返回 infeasible，不硬凑100%。
- **Evidence:** constraints/cash/illiquid/stale。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-12 — V5.10.11 Counterfactual Allocation

- **Then:** 不使用事后信息。
- **Evidence:** alternative cases。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-13 — V5.10.12 Portfolio Thesis Graph UI

- **Then:** 不展示 hidden reasoning。
- **Evidence:** graph API/UI。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V510-14 — V5.10.13 Portfolio Benchmark

- **Then:** 违反 hard constraints 的方案不能通过。
- **Evidence:** benchmark。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
