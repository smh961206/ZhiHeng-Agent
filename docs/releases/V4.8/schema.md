# V4.8 Schema

CURRENT V4.8.1: ModelProfile configuration schema v1 is validated in `server/model-catalog.mjs`; see [contract](../../contracts/model-gateway.contract.md). Catalog profiles are not persisted research objects. No database/schema version, checkpoint or public API change.

FUTURE later V4.8 subreleases: additive ModelCall/RoutingDecision/modelState only. Existing research/evidence/calculation schemas remain unchanged.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
