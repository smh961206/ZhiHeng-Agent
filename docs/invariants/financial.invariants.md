# Financial Invariants

- INV-FIN-001 [ENFORCED]: financial period basis remains explicit.
- INV-FIN-002 [ENFORCED]: currency remains explicit; market currency and reporting currency are not assumed equal.
- INV-FIN-003 [ENFORCED]: share-count basis remains explicit where per-share/market-cap calculations depend on it.
- INV-FIN-004 [ENFORCED]: parent/common/total equity concepts must not be silently mixed.
- INV-FIN-005 [ENFORCED]: FCFF/FCFE and EV/Equity Value semantics must not be mixed.
- INV-FIN-006 [ENFORCED]: deterministic arithmetic belongs in tools/programs where available.
- INV-FIN-007 [TARGET V5.5]: type/period/currency engines reject incompatible calculations before publication.

## H0 enforcement evidence and limits

Current gates: calculationBasis plus specialized tools/valuation-policy/data-basis validate selected currency/period/share/scope and FCFF/FCFE fields. Tests: calculations, cashflow-bridge, quick-screen, valuation-policy, data-completeness. Required declarations do not independently prove column/period/economic meaning. Preserve every ENFORCED rule; typed engines and complete coverage remain target work.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
