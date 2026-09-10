# Data Lifecycle

## Target canonical time semantics — PARTIAL

Every mature external-data object should distinguish as applicable:

- `eventTime`: when the real-world event happened.
- `effectiveAt`: economic/financial time the data represents.
- `publishedAt`: when the information became public/available.
- `retrievedAt`: when ZhiHeng obtained it.
- `validFrom` / `validTo`: identity or fact validity interval.

These are not interchangeable.

## Long-term flow

Connector → Raw Record → Source Contract → Evidence → Fact Normalization → Verification → Calculation / Claim.

## Historical integrity

- Restated values cannot destructively replace originally reported values.
- Historical replay uses information available at the historical cutoff.
- New parser versions may produce new parsed representation, but original source identity/hash remains traceable.

## H0 calibration

PARTIAL: source date/fetchedAt and selected publication/report fields, parser/content hashes and TTL archives exist. The mature time vocabulary and restatement/replay guarantees above are target semantics; there is no universal historical cutoff engine. Existing observations/cache/job payloads are not immutable Fact revision history.
