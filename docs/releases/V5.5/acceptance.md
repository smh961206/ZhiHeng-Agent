# V5.5 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V55-01 — V5.5.0 Security Identity Inventory

- **Then:** 不改运行行为；明确现有 identity debt。
- **Evidence:** 当前 resolver 全测试；ambiguous cases。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-02 — V5.5.1 Issuer/Security/Listing/ShareClass Schema

- **Then:** 同一 issuer 可有多个 security/listing；代码变更不改变 issuerId。
- **Evidence:** 关系/唯一性；ticker change；多 listing。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-03 — V5.5.2 Identifier Resolver Bridge

- **Then:** 歧义输入不静默绑定错误实体。
- **Evidence:** A/H、同名、未知、ticker change。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-04 — V5.5.3 Corporate Actions Base

- **Then:** 不原地重写历史 raw price/share 数据。
- **Evidence:** 拆股、分红、配股、回购。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-05 — V5.5.4 Fact Schema V1

- **Then:** Verified Fact 必须有 lineage；Forecast/Assumed 不能 verified。
- **Evidence:** legacy observation mapping；unknown；schema。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-06 — V5.5.5 Metric Ontology Runtime

- **Then:** 不同来源映射 canonical metric 时不丢原始语义。
- **Evidence:** Revenue/Profit/OCF/Capex/Cash/Debt/Shares。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-07 — V5.5.6 Period Engine

- **Then:** 不支持的 period mixing 在计算/发布前失败。
- **Evidence:** FY vs TTM；YTD；Instant；unknown。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-08 — V5.5.7 Currency Engine

- **Then:** 换算后的数字可追 FX lineage。
- **Evidence:** A/H/ADR；FX 缺失；估值转换。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-09 — V5.5.8 Accounting Scope Engine

- **Then:** scope mismatch 不能静默进入估值。
- **Evidence:** 归母、少数股东、母公司、总权益。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-10 — V5.5.9 Share Basis Engine

- **Then:** 所有 per-share 计算声明 share basis。
- **Evidence:** EPS、市值、ADR、split。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-11 — V5.5.10 Fact Verification Pipeline

- **Then:** Vision/OCR 单独不能自动 Verified。
- **Evidence:** OCR only；native+source；conflict；missing page。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-12 — V5.5.11 Restatement Engine

- **Then:** 未来重述不能覆盖历史原值。
- **Evidence:** 历史 cutoff；current research；多次 restatement。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-13 — V5.5.12 Fact Conflict Resolver

- **Then:** 不自动平均冲突数。
- **Evidence:** provider stale；scope conflict；revision conflict。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V55-14 — V5.5.13 Fact Lineage API

- **Then:** 核心 Fact 可脱离 report prose 解释来源。
- **Evidence:** lineage roundtrip；legacy missing lineage。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
