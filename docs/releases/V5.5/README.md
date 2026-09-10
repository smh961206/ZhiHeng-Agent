# V5.5 — Security Master / Point-in-Time Fact Engine

Status: FUTURE until CURRENT is changed to this release

## Goal

Introduce stable entity identity and canonical point-in-time facts by evolving current security/financial observation modules.

## Subrelease sequence

- **V5.5.0 — Security Master domain:** Issuer/Security/Listing/ShareClass additive objects around current resolver.
- **V5.5.1 — Identifier resolution:** Ticker/name/ISIN/CIK etc. resolve to stable IDs with time validity.
- **V5.5.2 — Corporate actions:** Splits/dividends/rights/placements/buybacks/cancellations; expand later.
- **V5.5.3 — Point-in-time Fact schema:** Canonical Fact fields and epistemic state.
- **V5.5.4 — Metric ontology:** Start 30–50 core metrics; map XBRL/provider aliases.
- **V5.5.5 — Period engine:** FY/TTM/YTD/Q/H/Instant compatibility.
- **V5.5.6 — Currency engine:** Reporting/market/valuation currency and explicit FX lineage.
- **V5.5.7 — Scope/share-basis engine:** Consolidated/parent/attributable/common/total/share-count semantics.
- **V5.5.8 — Conflict/restatement:** originally_reported/restated/current_best without overwrite.
- **V5.5.9 — Fact lineage:** Fact→Evidence→Source/page/hash.
- **V5.5.10 — Fact API/UI drill-down:** Read/display fact lineage; legacy report path remains.

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
