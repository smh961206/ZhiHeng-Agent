# V5.3 Schema

KnowledgeRule/KnowledgeSnapshot/KCP/KnowledgeDebt metadata; reuse existing snapshot mechanics where possible.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
