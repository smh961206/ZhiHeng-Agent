# Fact Contract
Implementation Status: FUTURE/PARTIAL; target V5.5.

A Fact is a normalized assertion.

Required mature fields:
`factId`, `issuerId`, optional `securityId`, `metricId`, `period/time`, `value`, `unit`, `currency`, `scale`, `scope`, `epistemicType`, `effectiveAt`, `publishedAt`, `retrievedAt`, source/evidence lineage, revision state, verification status.

Epistemic types:
verified | observed | derived | estimated | forecast | assumed | unknown

Invalid:
- forecast marked verified;
- verified fact without lineage;
- destructive overwrite of originally reported value.
