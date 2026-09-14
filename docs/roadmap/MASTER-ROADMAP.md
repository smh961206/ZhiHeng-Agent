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

## Current foundation

The active baseline is Platform V5.3 with Knowledge K1.0.0. It includes the provider-neutral Model Gateway, multimodal handling, model usage/cost metadata, bounded review escalation, checkpoint compatibility and the current React/TypeScript plus FastAPI runtime. Removed historical release packages are not implementation authorities; current behavior is defined by executable code, contracts, invariants, accepted ADRs and the V5.3 specification.

## Active and future release sequence

### V5.3 — Knowledge Engineering — CURRENT
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

## Internal capability domains

These labels group long-term capabilities. They are not additional release lines; externally the repository maintains Platform V and Knowledge K only.

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

Legacy paths may be removed after their replacement is stable, focused regression is clean, rollback no longer depends on them and the removal is explicitly authorized. Current contracts and migration safety take priority over obsolete release archives.


## Engineering detail

For V5.3–V6.0, current and future planning is recorded in each release's `implementation.md` and `DETAILED_INDEX.md`. Implementation authority still comes from `docs/releases/CURRENT` and `AGENTS.md`.
