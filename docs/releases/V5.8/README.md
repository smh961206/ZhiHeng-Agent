# V5.8 — Event Intelligence / Continuous Research

Status: FUTURE until CURRENT is changed to this release

## Goal

Update research selectively when material new information arrives, using event ontology/materiality/dependency deltas.

## Subrelease sequence

- **V5.8.0 — Event schema:** Canonical event identity/time/source.
- **V5.8.1 — Event classifier:** earnings/guidance/dividend/buyback/capital raise/management/contract/regulation.
- **V5.8.2 — Materiality engine:** Map event/fact change to thesis/claim/position sensitivity.
- **V5.8.3 — Research Delta:** Fact/Claim/Belief/Assumption/Valuation/Risk deltas.
- **V5.8.4 — Monitoring metrics:** Bind claims to monitored metrics.
- **V5.8.5 — Leading indicators:** Industry/company leading signals.
- **V5.8.6 — Thesis fragility:** Research/monitoring sensitivity metric.
- **V5.8.7 — Research priority:** Position weight × fragility × new info × valuation sensitivity × uncertainty.
- **V5.8.8 — Selective re-research:** Partial vs full review based on dependency/materiality.
- **V5.8.9 — Scheduler/continuous coverage:** Only after event/delta semantics prove stable.

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
