# V5.6 — Calculation / Assumption / Claim Dependency DAG

Status: FUTURE until CURRENT is changed to this release

## Goal

Wrap existing deterministic math with formula/input lineage; introduce explicit assumptions/claims and dependency-based staleness.

## Subrelease sequence

- **V5.6.0 — Calculation registry:** Canonical calculation output around existing tools.
- **V5.6.1 — Formula registry:** Version ROIC/FCF/PE/PB/DCF/DDM/SOTP/TSR semantics.
- **V5.6.2 — Assumption registry:** Explicit non-fact inputs with horizon/evidence/sensitivity/invalidation.
- **V5.6.3 — Claim schema:** Structured research propositions and evidence states.
- **V5.6.4 — Claim dependencies:** depends_on relationships and horizons.
- **V5.6.5 — Dependency DAG:** Connect facts/calculations/claims; first mark downstream stale.
- **V5.6.6 — System invariants:** Verified fact/source, calculation lineage, published claim state.
- **V5.6.7 — Counter-evidence contract:** First-class supporting vs counter evidence.
- **V5.6.8 — Causal/narrative metadata:** Optional mechanism/alternative explanation; no free-form causal certainty.
- **V5.6.9 — Renderer compatibility:** Existing report continues while structured claim/calculation data is added.

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
