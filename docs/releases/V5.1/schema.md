# V5.1 Schema

Add pricing/cache/budget telemetry fields; no change to financial semantics.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
