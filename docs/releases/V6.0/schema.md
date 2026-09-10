# V6.0 Schema

Tenant/workspace/user/role/audit/data-classification/research-package structures; existing domain IDs gain workspace ownership where appropriate.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
