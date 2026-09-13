# V5.1 Schema

Add pricing/cache/budget telemetry fields; no change to financial semantics.

V5.1.0–.3: existing ModelProfile versions accept either legacy undated pricing or pricing schemaVersion 1 with version/effectiveFrom/effectiveTo and per-million-token input/output/cacheRead rates. An optional MODEL_PRICING_FILE holds a version-1 configuration registry of profileId, opaque connectionIdentity, recordedAt and pricing. Windows are half-open and may not overlap per connection/profile. Operators retain historical entries; the server never writes this file.

Existing model_calls documents add optional usageDetails, cost, cache and transportAttempts. Absent fields preserve the legacy normalized shape and are interpreted as unknown by summaries. Cost contains formulaVersion token-cost-1, exact price snapshot/version/effective dates/entry hash, call time, known-at time and usage confidence. Reasoning usage is an observed subset of output tokens, not a separate billable category. Invalid/absent pricing remains unknown; historical costs are never recomputed using current registry entries. No Mongo index migration or financial-data backfill.

V5.1.6–.8: cache metadata stores the SHA-256 fingerprint of the leading system prefix and relevant model/connection/configuration, plus text-only eligibility and observed provider usage. It never stores prompt bodies or images. Analytics and eligibility are derived read views over existing ModelCalls, not another persistent research store.

V5.1.13: pricing schemaVersion 2 adds an IANA timezone and non-overlapping daily tiers with id/startMinute/endMinute and nullable rates. Base rates apply outside tiers. The registry still uses schemaVersion 1 and accepts pricing v1 or v2. Call-time receipts preserve the entire applicable schedule; no future price lookup changes a prior receipt.

V5.1.10: budget limits v1 define nullable maxModelCost {currency,amount}, maxToolRounds, maxWebRequests, maxVisionPages and maxDurationMs. Zero is a configured zero allowance; null is no configured bound. Budget state v1 pins limits/mode/start time with additive receipts/decisions. Absent historical state remains absent and is never assigned fabricated usage. This operational state belongs to existing job payloads, not canonical financial/research facts.

V5.1.11–.12: receipts retain resource identity, purpose, reserved/completed state, units, timestamps, nullable actual cost and reserved estimate. Writes use the existing job checkpoint owner. Budget state is excluded from public job/list/SSE payloads. Existing toolRecords gain an optional retrieval source-snapshot hash for exact reuse; no financial observation is rewritten.

V5.1.14: GET /api/jobs/:id/cost adds a version-1 read-only whitelist summary, including separate currencies, unknown coverage, purpose/profile grouping, safe cache metrics and budget summary. It returns 404 for missing jobs and safe 503 on storage failure. Existing API fields remain compatible.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
