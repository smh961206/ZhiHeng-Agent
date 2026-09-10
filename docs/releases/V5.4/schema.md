# V5.4 Schema

Canonical SourceRecord/EvidenceRecord additions; optional embedding index; contradiction records.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
