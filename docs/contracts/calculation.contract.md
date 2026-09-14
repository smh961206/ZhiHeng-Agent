# Calculation Contract
Implementation Status: PARTIAL; formalized V5.6.

A Calculation must eventually contain:
`calculationId`, `formulaId`, `formulaVersion`, `inputFactIds`, `inputCalculationIds`, `assumptionIds`, `result`, `unit`, `currency`, `createdAt`.

A displayed number derived through math must be reproducible from lineage.

## Current implementation evidence

calculations and specialized valuation modules perform deterministic math; agent tool records retain inputs/results and calculationBasis checks source/block/basis. formulaId/formulaVersion and inputFactIds dependency records are not implemented. Tests: calculations, cashflow-bridge, deep-research.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
