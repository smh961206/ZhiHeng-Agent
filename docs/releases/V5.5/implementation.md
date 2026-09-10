# V5.5 — Detailed Engineering Implementation Plan

## 使用规则

本文件是 V5.5 的主要工程实施规格。Codex 必须按子版本顺序执行；每个子版本完成后应保持仓库可运行并运行相关旧测试+新增测试。除非用户明确要求继续，否则可以在任一已验收子版本停止。

## 修改前必须检查

- `server/security-resolver.mjs`
- `server/security-intent.mjs`
- `server/security-exchanges.mjs`
- `server/sec-directory.mjs`
- `server/financial-observations.mjs`
- `server/financial-input-verification.mjs`
- `server/data-basis.mjs`
- `server/inline-xbrl.mjs`
- `server/tushare-financials.mjs`
- `server/longbridge-fundamentals.mjs`
- `server/storage.mjs`
- `server/schema-migrations.mjs`

## 本版本明确不做

- 不要顺便实现 Claim/Belief
- 不要一次性删除 legacy observations/resolver
- 不要改历史原始数据

## 子版本实施矩阵

### V5.5.0 — Security Identity Inventory

**目标/改造：** 先盘点 security-resolver/security-intent/security-exchanges/sec-directory 的真实职责与 A/H/ADR 歧义。

**必须测试：** 当前 resolver 全测试；ambiguous cases。

**完成判定：** 不改运行行为；明确现有 identity debt。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.1 — Issuer/Security/Listing/ShareClass Schema

**目标/改造：** 新增稳定 issuerId/securityId/listingId/shareClassId 和 validity interval；ticker 仅为属性。

**必须测试：** 关系/唯一性；ticker change；多 listing。

**完成判定：** 同一 issuer 可有多个 security/listing；代码变更不改变 issuerId。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.2 — Identifier Resolver Bridge

**目标/改造：** 现有输入 ticker/name/exchange 等返回 canonical IDs + confidence/ambiguity，同时保持旧字段。

**必须测试：** A/H、同名、未知、ticker change。

**完成判定：** 歧义输入不静默绑定错误实体。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.3 — Corporate Actions Base

**目标/改造：** 加入 split/reverse split/dividend/rights/placement/buyback/cancellation，记录 announce/effective date 和 share class。

**必须测试：** 拆股、分红、配股、回购。

**完成判定：** 不原地重写历史 raw price/share 数据。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.4 — Fact Schema V1

**目标/改造：** 围绕 financial-observations 新增 canonical Fact：entity/metric/period/value/unit/currency/scale/scope/epistemic/time/source/evidence/status。

**必须测试：** legacy observation mapping；unknown；schema。

**完成判定：** Verified Fact 必须有 lineage；Forecast/Assumed 不能 verified。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.5 — Metric Ontology Runtime

**目标/改造：** 先覆盖 30–50 个核心指标；映射 XBRL/provider/PDF labels；保留原始 tag/label。

**必须测试：** Revenue/Profit/OCF/Capex/Cash/Debt/Shares。

**完成判定：** 不同来源映射 canonical metric 时不丢原始语义。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.6 — Period Engine

**目标/改造：** FY/TTM/YTD/Q/H/Instant canonical structure + compatibility checks；能转换才显式转换。

**必须测试：** FY vs TTM；YTD；Instant；unknown。

**完成判定：** 不支持的 period mixing 在计算/发布前失败。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.7 — Currency Engine

**目标/改造：** 区分 reporting/market/valuation currency；FX 转换记录 rate/date/source。

**必须测试：** A/H/ADR；FX 缺失；估值转换。

**完成判定：** 换算后的数字可追 FX lineage。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.8 — Accounting Scope Engine

**目标/改造：** 区分 consolidated/parent/attributable/common/total equity；source label mapping。

**必须测试：** 归母、少数股东、母公司、总权益。

**完成判定：** scope mismatch 不能静默进入估值。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.9 — Share Basis Engine

**目标/改造：** 区分 weighted-average/diluted/period-end/ADR-equivalent；关联 corporate actions。

**必须测试：** EPS、市值、ADR、split。

**完成判定：** 所有 per-share 计算声明 share basis。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.10 — Fact Verification Pipeline

**目标/改造：** Observed/Extracted→Verified 的程序化路径；native text/OCR/Vision/second source 等 method 显式记录。

**必须测试：** OCR only；native+source；conflict；missing page。

**完成判定：** Vision/OCR 单独不能自动 Verified。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.11 — Restatement Engine

**目标/改造：** Fact revisionOf/supersedes/currentBest；保留 originally_reported/restated/current_best。

**必须测试：** 历史 cutoff；current research；多次 restatement。

**完成判定：** 未来重述不能覆盖历史原值。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.12 — Fact Conflict Resolver

**目标/改造：** 按 authority/period/scope/revision 规则解决；语义无法确定时保持 conflicted。

**必须测试：** provider stale；scope conflict；revision conflict。

**完成判定：** 不自动平均冲突数。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

### V5.5.13 — Fact Lineage API

**目标/改造：** Fact→Evidence→Source/Page/Hash；下游 research/UI 可查询。

**必须测试：** lineage roundtrip；legacy missing lineage。

**完成判定：** 核心 Fact 可脱离 report prose 解释来源。

**工程约束：** 先查现有实现；优先 additive/dual-read/feature flag；任何持久化变化同步更新 schema.md、migration.md、rollback.md；不得顺手实现下一子版本。

## 大版本发布 Gate

- 所有相关旧测试与新增测试通过。
- 对应 Benchmark 不出现 P0/P1 回归。
- Resume/Checkpoint 在受影响路径上通过。
- Point-in-time / Provenance 不退化。
- Feature flag / rollback 可用。
- `current-implementation-map.md` 与实际代码同步。
- 下一版本内容保留为 Deferred，不提前实现。
