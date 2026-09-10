# V5.7 Schema

Hypothesis/Belief/Forecast/Scenario/ResearchState; Research IR only when subrelease explicitly enabled.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
