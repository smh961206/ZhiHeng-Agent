# V5.10 — Portfolio Intelligence

Status: FUTURE until CURRENT is changed to this release

## Goal

Extend decision quality from isolated securities to portfolio-level capital allocation and hidden/thesis exposure.

## Subrelease sequence

- **V5.10.0 — Portfolio/Position domain:** Canonical portfolios, positions and Cash.
- **V5.10.1 — Exposure engine:** Sector/market/currency/issuer/factor.
- **V5.10.2 — Liquidity engine:** ADV/free float/spread/impact; theoretical vs executable target.
- **V5.10.3 — Price/factor correlation:** Conventional portfolio risk.
- **V5.10.4 — Thesis correlation:** Shared claim/assumption dependencies.
- **V5.10.5 — Hidden exposure:** Business graph/macro linkage.
- **V5.10.6 — Macro/regime layer:** Interest/credit/inflation/property/FX/commodity/liquidity states.
- **V5.10.7 — Risk budget:** Concentration/downside/fragility constraints.
- **V5.10.8 — Capital allocation V1:** Recommended target weights; no trade execution.
- **V5.10.9 — Counterfactual allocation:** Compare chosen vs alternative/cash allocations.
- **V5.10.10 — Portfolio thesis graph:** Portfolio-level reasons and dependency concentration.

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
