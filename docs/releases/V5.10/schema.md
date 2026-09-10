# V5.10 Schema

Portfolio/Position/Exposure/RiskBudget/PortfolioClaimGraph.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
