# Fact Contract
Implementation Status: PARTIAL; target V5.5.

A Fact is a normalized assertion.

Required mature fields:
`factId`, `issuerId`, optional `securityId`, `metricId`, `period/time`, `value`, `unit`, `currency`, `scale`, `scope`, `epistemicType`, `effectiveAt`, `publishedAt`, `retrievedAt`, source/evidence lineage, revision state, verification status.

Epistemic types:
verified | observed | derived | estimated | forecast | assumed | unknown

Invalid:
- forecast marked verified;
- verified fact without lineage;
- destructive overwrite of originally reported value.

## Current implementation evidence

financial-observations, inline-xbrl and vendor rows contain observations; financial-input-verification returns matched-needs-review, never independent verification. Mature fields listed above are target requirements, not current persistence fields. Tests: evidence-integrity, data-completeness, calculations.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
