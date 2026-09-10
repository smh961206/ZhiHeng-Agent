# V5.8 — Detailed Acceptance Matrix

每个子版本至少满足其对应验收；大版本完成还需通过 release-level Benchmark 和全量回归。

### V58-01 — V5.8.0 Event Schema

- **Then:** EventTime 与 publishedAt 不混。
- **Evidence:** dedup/time。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-02 — V5.8.1 Event Classifier

- **Then:** 不强行分类。
- **Evidence:** 各 type/unknown。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-03 — V5.8.2 Event→Fact Impact

- **Then:** Event 不绕过 Fact verification。
- **Evidence:** earnings/dividend/management。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-04 — V5.8.3 Materiality Engine

- **Then:** 小事件不全量深研。
- **Evidence:** threshold/cases。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-05 — V5.8.4 Research Delta

- **Then:** 不是 Markdown diff。
- **Evidence:** no-change/partial。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-06 — V5.8.5 Selective Revalidation

- **Then:** 无关状态保持原验证版本。
- **Evidence:** single fact/upstream/critical。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-07 — V5.8.6 Monitoring Metrics

- **Then:** 不存在行业数据不编造。
- **Evidence:** binding/freshness。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-08 — V5.8.7 Leading Indicators

- **Then:** Leading indicator 不覆盖 official facts。
- **Evidence:** auto/bank/consumer。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-09 — V5.8.8 Thesis Fragility

- **Then:** 不是 LLM 单一形容词。
- **Evidence:** stable vs fragile。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-10 — V5.8.9 Research Priority

- **Then:** 低优先不屏蔽重大事件。
- **Evidence:** priority ordering。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-11 — V5.8.10 Scheduler V1

- **Then:** 调度失败不改变当前 State。
- **Evidence:** duplicate/retry/resume。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。

### V58-12 — V5.8.11 Continuous Benchmark

- **Then:** 不得因省成本漏掉 critical Claim。
- **Evidence:** event benchmark。
- **And:** 不得通过弱化 Evidence / Validation / PIT / Provenance 来满足。
