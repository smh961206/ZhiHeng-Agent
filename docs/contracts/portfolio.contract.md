# Portfolio Contract
Implementation Status: FUTURE; target V5.10.

Portfolio contains positions and constraints.

Position/Portfolio calculations should support:
market/sector/currency exposure, liquidity, factor exposure, price correlation, thesis/assumption correlation, hidden exposure, expected return distribution, risk budget.

Cash is a valid asset.

## H0 implementation evidence

Current mode E and execution review accept portfolio context and discuss constraints. No canonical positions/portfolio allocation or trading engine exists.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
