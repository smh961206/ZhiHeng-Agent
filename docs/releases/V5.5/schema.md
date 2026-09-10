# V5.5 Schema

Add Issuer/Security/Listing/ShareClass/Fact and revision/lineage structures. Existing financial observations dual-read.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
