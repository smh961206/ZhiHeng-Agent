# ZhiHeng Investment Intelligence OS — Master Roadmap

This is the long-term navigation map. It does not authorize implementation beyond `docs/releases/CURRENT`.

## Final system model

```text
Reality
 Source / Event / Raw Data
      ↓
Truth
 Evidence / Verified Fact / Derived Fact
      ↓
Belief
 Hypothesis / Claim / Probability / Uncertainty
      ↓
Future
 Assumption / Forecast / Scenario / Valuation
      ↓
Decision
 Mandate / Opportunity Cost / Position / Portfolio
      ↓
Outcome
 Business / Market / Claim Resolution
      ↓
Learning
 Attribution / Calibration / Failure / Knowledge & Policy Upgrade
```

## Core release sequence

### H0 — Harness Bootstrap
Install/validate the repository engineering control plane. Zero runtime behavior change.

### V4.8 — Model Gateway Foundation
Unify LLM calls, legacy compatibility, capability profiles, dry-run policy, Main/Pro escalation, telemetry.

### V4.9 — Unified Multimodal
Move Vision behind capability-based Gateway, benchmark vision, primary/fallback without changing evidence semantics.

### V5.0 — Model Benchmark / Challenger
Create repeatable benchmark platform and task champions. Production model changes require quality gates.

### V5.1 — Cost / Cache / Research Budget
Effective task cost, cache analytics, budget management; cost optimization occurs only after quality/health.

### V5.2 — Flagship / Judge
Flagship models become exceptional escalation/review/judge resources, not default research.

### V5.3 — Knowledge Engineering
Rule IDs, metadata, Constitution/Ontology split, resolver, linter, regression, K-Series, KCP/Knowledge Debt.

### V5.4 — Data Contracts / Hybrid Retrieval
Canonical Source/Evidence contracts, lexical BM25, semantic retrieval, fusion/reranking, contradiction registry.

### V5.5 — Security Master / Point-in-Time Fact Engine
Stable entity identity, corporate actions, canonical Fact schema, metric ontology, period/currency/scope engines, restatement and lineage.

### V5.6 — Calculation / Assumption / Claim Dependency DAG
Formula registry, input lineage, Assumption objects, Claim objects, dependency graph and stale propagation.

### V5.7 — Hypothesis / Belief / Forecast / Research State
Competing hypotheses, uncertainty taxonomy, belief probabilities, driver forecasts, scenarios/reverse valuation, canonical Research State.

### V5.8 — Event Intelligence / Continuous Research
Event ontology, materiality, research delta, leading indicators, research priority, governed continuous coverage.

### V5.9 — Decision Intelligence
Investment Mandate, Decision Readiness, expected-return decomposition, opportunity set including cash, robustness/downside and decision policy.

### V5.10 — Portfolio Intelligence
Portfolio/position domain, exposure/liquidity, thesis correlation, hidden exposure, macro/regime linkage and capital allocation recommendations.

### V5.11 — Reproducibility / Learning / Institutional Memory
Research snapshots/replay/provenance, failure registry, decision journal/outcomes, attribution/calibration, research genealogy/diff and institutional memory.

### V6.0 — Investment Intelligence OS Platform
Workspace/tenant/RBAC, audit ledger, human workflow, distributed execution when needed, Research Workbench, machine-verifiable Research Package and ZRP protocol.

## Cross-cutting capability tracks

- M: Model platform
- K: Knowledge
- D: Data / identity
- R: Retrieval
- F: Facts / calculations
- C: Claims / causal reasoning
- B: Belief / calibration
- V: Forecast / valuation
- DP: Decision
- P: Portfolio
- L: Learning
- E: Evaluation
- G: Governance
- UX: Research workspace

## Release gates

A release cannot ship if it introduces:
- fabricated material facts;
- citation fabrication;
- point-in-time contamination;
- unreproducible material calculations;
- evidence loss during resume;
- destructive historical overwrite;
- hidden relaxation of validation to make tests pass.

## Deletion rule

Legacy paths are removed only after:
1. replacement is stable;
2. regression/benchmark is clean;
3. rollback no longer depends on old path;
4. at least one subsequent stable release has validated migration, unless explicitly approved otherwise.


## Engineering detail

- `docs/roadmap/RELEASE-DEPENDENCY-MATRIX.md`
- `docs/roadmap/LATE_RELEASE_ENGINEERING_RULES.md`
- For V5.3–V6.0 read each release `implementation.md` and `DETAILED_INDEX.md`.
