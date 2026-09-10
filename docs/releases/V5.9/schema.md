# V5.9 Schema

InvestmentMandate/Decision/DecisionReadiness/Opportunity objects.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
