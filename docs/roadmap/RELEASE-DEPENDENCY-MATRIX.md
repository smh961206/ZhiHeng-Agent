# Release Dependency Matrix

| Release | Hard prerequisites | Canonical domains introduced/changed | Risk |
|---|---|---|---|
| H0 | current repo | Harness only | Low |
| V4.8 | H0 | ModelProfile/ModelCall/RoutingDecision | Medium |
| V4.9 | V4.8 | Vision routing | Low-Medium |
| V5.0 | V4.8 | Benchmark/Champion | Low |
| V5.1 | V5.0 | Cost/Cache/Budget | Low-Medium |
| V5.2 | V5.0/V5.1 | Flagship/Judge | Low-Medium |
| V5.3 | stable Knowledge snapshots | KnowledgeRule/K-Series | Medium |
| V5.4 | V5.3 ontology foundation | Source/Evidence/Retrieval | Medium |
| V5.5 | V5.4 + V5.3 ontology | Identity/Fact/PIT | **High** |
| V5.6 | V5.5 | Calculation/Assumption/Claim/DAG | **High** |
| V5.7 | V5.6 | Hypothesis/Belief/Forecast/ResearchState | **High** |
| V5.8 | V5.7 | Event/Delta/Continuous | Medium-High |
| V5.9 | V5.7; V5.8 helpful | Mandate/Decision | **High** |
| V5.10 | V5.9 + Security Master | Portfolio/Exposure/Allocation | **High** |
| V5.11 | PIT/versioned domains | Replay/Outcome/Learning | **High** |
| V6.0 | mature V5 domains | Workspace/RBAC/Audit/Protocol | **High** |

## 禁止倒置的依赖

- Security identity / Point-in-time 必须先于可靠的 Portfolio 和 Replay。
- Fact 必须先于 Calculation/Claim 的 canonical DAG。
- Claim/Assumption 必须先于 Belief/Forecast 的 canonical state。
- Research State 必须先于 Continuous Research 的结构化 Delta。
- Research State + Mandate 必须先于 Decision Policy。
- Decision + Portfolio domain 必须先于资本配置学习。
- Replay/Outcome 必须先于可信 Calibration/Policy Learning。
