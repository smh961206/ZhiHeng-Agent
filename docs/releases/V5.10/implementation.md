# V5.10 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.10 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `Security Master`
- `Decision Engine`
- `market/history modules`
- `Portfolio modules`
- `Claim/Assumption Graph`
- `Business relationship data`

## 本版本明确不做

- 不自动交易
- 不把价格相关性当唯一风险
- 不构造无证据产业关系

## 子版本实施矩阵

### V5.10.0 — Portfolio/Position Schema

**目标/改造：** portfolioId/mandate/cash/positions；Position 用 securityId、qty、cost/value/currency/target。

**必须测试：** totals/multi-currency。

**完成判定：** 不自动下单或修改外部持仓。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.1 — Exposure Engine

**目标/改造：** sector/market/currency/issuer，unknown classification 保留。

**必须测试：** reconcile/unknown。

**完成判定：** 暴露总额和组合价值可对账。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.2 — Factor Exposure

**目标/改造：** 先做可解释 value/quality/growth/dividend/size/cycle methodology，不假装高级统计模型。

**必须测试：** mapping/missing。

**完成判定：** 输出带 methodology/version。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.3 — Liquidity Engine

**目标/改造：** ADV/free float/spread/impact proxy；理论 target vs executable target。

**必须测试：** liquid/illiquid/missing。

**完成判定：** 缺流动性不猜。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.4 — Price Correlation

**目标/改造：** 明确 window/frequency/asOf 的传统相关性。

**必须测试：** math/PIT/missing。

**完成判定：** 不使用未来价格。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.5 — Thesis Correlation

**目标/改造：** 用 Claim/Assumption dependencies 找共同逻辑风险。

**必须测试：** shared/independent/stale。

**完成判定：** 低价格相关也能发现逻辑集中。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.6 — Business Graph V1

**目标/改造：** Supplier/Customer/Competitor/Subsidiary 等关系，必须 source/evidence/time validity。

**必须测试：** relations/expiry。

**完成判定：** 无证据关系不能当 Verified。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.7 — Macro/Regime State

**目标/改造：** 利率/信用/通胀/地产/FX/商品/流动性，以 source/asOf/uncertainty 表达。

**必须测试：** fresh/unknown/PIT。

**完成判定：** 宏观 State 不等于公司 Fact。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.8 — Hidden Exposure

**目标/改造：** BusinessGraph + ClaimGraph + MacroState 映射间接房地产/商品/利率/出口等。

**必须测试：** hidden exposure/false positives。

**完成判定：** 解释可追关系与 Claim。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.9 — Risk Budget

**目标/改造：** hard/soft single-name/sector/liquidity/thesis concentration constraints。

**必须测试：** breach。

**完成判定：** Hard breach 阻止 allocation。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.10 — Capital Allocation V1

**目标/改造：** Expected Return/Downside/Confidence/Liquidity/Mandate/RiskBudget → transparent target weights；Cash 参与。

**必须测试：** constraints/cash/illiquid/stale。

**完成判定：** 不可行时返回 infeasible，不硬凑100%。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.11 — Counterfactual Allocation

**目标/改造：** 在同 information cutoff 和 mandate 下比较 alternative/cash allocation。

**必须测试：** alternative cases。

**完成判定：** 不使用事后信息。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.12 — Portfolio Thesis Graph UI

**目标/改造：** 展示 top theses/shared assumptions/hidden exposure/affected positions。

**必须测试：** graph API/UI。

**完成判定：** 不展示 hidden reasoning。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.10.13 — Portfolio Benchmark

**目标/改造：** 冻结组合，测 exposure/liquidity/thesis concentration/constraints/allocation。

**必须测试：** benchmark。

**完成判定：** 违反 hard constraints 的方案不能通过。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
