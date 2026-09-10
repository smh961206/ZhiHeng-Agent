# V4.8 Schema

Additive ModelCall/RoutingDecision/modelState only. Existing research/evidence/calculation schemas unchanged.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
