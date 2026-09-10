# V6.0 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V60-01 — V6.0.0 Ownership Inventory

- **Then:** 不先做 auth 后补数据隔离。
- **Evidence:** inventory。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-02 — V6.0.1 Workspace/Tenant Schema

- **Then:** 单用户体验在 default workspace 保持。
- **Evidence:** migration/isolation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-03 — V6.0.2 RBAC V1

- **Then:** 前端不能绕过 server permission。
- **Evidence:** role matrix/deny。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-04 — V6.0.3 Audit Ledger

- **Then:** 关键变更有 audit event。
- **Evidence:** append/refs/secrets。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-05 — V6.0.4 Data Classification

- **Then:** RESTRICTED 不送不允许 Provider。
- **Evidence:** classification/export。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-06 — V6.0.5 Provider Governance

- **Then:** 成本不能突破数据治理。
- **Evidence:** restricted fallback。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-07 — V6.0.6 Human Override Provenance

- **Then:** Override sticky 且 audit。
- **Evidence:** override/revoke。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-08 — V6.0.7 Human Research Workflow

- **Then:** 审批状态结构化。
- **Evidence:** role/workflow/audit。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-09 — V6.0.8 Research Workbench Shell

- **Then:** 核心对象不靠解析 Markdown 展示。
- **Evidence:** routes/drilldown/legacy report。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-10 — V6.0.9 Lineage Drill-down

- **Then:** Explainability by construction。
- **Evidence:** broken refs/permission。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-11 — V6.0.10 Research Package

- **Then:** Package 校验不依赖 report prose。
- **Evidence:** validator/roundtrip/redaction。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-12 — V6.0.11 ZRP v1

- **Then:** 可独立验证。
- **Evidence:** version/unknown fields。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-13 — V6.0.12 API/MCP Surface

- **Then:** 外部系统不能绕过 invariants。
- **Evidence:** auth/version/rate limits。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-14 — V6.0.13 Worker/Queue

- **Then:** 重试不重复发布/计算。
- **Evidence:** crash/retry/duplicate。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-15 — V6.0.14 Tenant-safe Continuous Research

- **Then:** 一个 workspace 不触发另一个研究。
- **Evidence:** quota/isolation。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V60-16 — V6.0.15 Production Hardening/DR

- **Then:** Research State+Provenance 可恢复。
- **Evidence:** restore/outage。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
