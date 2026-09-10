# Investment Domain Object Model

Status labels:
- CURRENT: canonical implementation exists.
- PARTIAL: similar capability exists but target contract is incomplete.
- FUTURE: design reservation only.
- DEPRECATED: migration away is approved.

| Object | Status at baseline | Target role |
|---|---|---|
| Source | PARTIAL | identity of raw external/internal source |
| Evidence | CURRENT/PARTIAL | source-grounded research evidence |
| Issuer | FUTURE/PARTIAL | stable legal-economic entity |
| Security | PARTIAL | instrument identity |
| Listing | FUTURE/PARTIAL | exchange/ticker/time-bounded listing |
| ShareClass | FUTURE/PARTIAL | A/H/ADR/ADS/etc. semantics |
| Metric | PARTIAL | canonical financial/business metric |
| Fact | PARTIAL | point-in-time normalized fact |
| Calculation | CURRENT/PARTIAL | deterministic derived result |
| Assumption | FUTURE | explicit non-fact input |
| Hypothesis | FUTURE | competing causal explanation |
| Claim | FUTURE | research proposition to verify |
| Belief | FUTURE | calibrated confidence in a claim |
| Forecast | FUTURE | future derived projection |
| Scenario | PARTIAL/FUTURE | explicit world-state branch |
| Valuation | CURRENT/PARTIAL | valuation result with lineage |
| Event | PARTIAL | structured material event |
| ResearchState | FUTURE/PARTIAL | canonical structured research state |
| ResearchDelta | FUTURE | structured state change |
| Mandate | FUTURE | investor constraints/objective |
| Decision | FUTURE | policy-governed capital action |
| Position | FUTURE | portfolio holding |
| Portfolio | FUTURE | capital-allocation state |
| Outcome | FUTURE | realized decision/research outcome |
| Failure | FUTURE | structured system failure |
| KnowledgeRule | PARTIAL | versioned research rule |

Do not implement FUTURE objects before the release that owns them.
