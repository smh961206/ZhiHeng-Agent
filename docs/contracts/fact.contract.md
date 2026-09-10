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

## H0 implementation evidence

financial-observations, inline-xbrl and vendor rows contain observations; financial-input-verification returns matched-needs-review, never independent verification. Mature fields listed above are target requirements, not current persistence fields. Tests: evidence-integrity, data-completeness, calculations.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
