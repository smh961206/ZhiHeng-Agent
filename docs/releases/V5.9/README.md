# V5.9 — Decision Intelligence

Status: FUTURE until CURRENT is changed to this release

## Goal

Separate high-quality company research from investor-specific action using mandates, opportunity cost and robustness.

## Subrelease sequence

- **V5.9.0 — Investment Mandate:** Objective/horizon/return/risk/liquidity/concentration constraints.
- **V5.9.1 — Decision Readiness:** ready/conditional/not_ready and blocking reasons.
- **V5.9.2 — Expected-return decomposition:** earnings/dividend/buyback/multiple/FX.
- **V5.9.3 — Opportunity Set:** Compare multiple investments plus Cash.
- **V5.9.4 — Decision Policy V1:** Reject/Watch/Starter/Normal/HighConviction/Reduce/Exit.
- **V5.9.5 — Robustness shocks:** Parameter perturbation and thesis fragility.
- **V5.9.6 — Permanent-loss risk:** Leverage/liquidity/refinancing/survival distinctions.
- **V5.9.7 — Optionality separation:** Core/verified optionality/speculative optionality.
- **V5.9.8 — Decision sufficiency:** Stop research when decision-relevant evidence is adequate.
- **V5.9.9 — Value of Information:** Prioritize unresolved information by decision impact.
- **V5.9.10 — Decision audit output:** Explain mandate, evidence, assumptions and opportunity cost behind recommendation.

## Scope lock

Only the items described by this release and its subreleases are in scope.

Future release concepts may be referenced for compatibility, but may not be implemented opportunistically.

## Required read-before-code

- `AGENTS.md`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- relevant contracts
- relevant invariants
- relevant ADRs
- current repository implementation/tests
