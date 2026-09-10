# Investment Mandate Contract
Implementation Status: FUTURE; target V5.9.

Mandate separates investor objectives/constraints from company research.

Fields:
objective, horizon, minimumExpectedReturn, minimumMarginOfSafety, riskTolerance, maxPosition, sector/country constraints, liquidity/cash requirements.

## H0 implementation evidence

Current portfolioContext/portfolioFields express user constraints for research. They are not persisted canonical InvestmentMandate identities.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
