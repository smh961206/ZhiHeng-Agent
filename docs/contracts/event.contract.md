# Event Contract
Implementation Status: PARTIAL; target V5.8.

Event fields:
`eventId`, `issuerId/securityId`, `eventType`, `eventTime`, `publishedAt`, source/evidence, materiality, affectedFactIds, affectedClaimIds, affectedAssumptionIds.

Initial types:
earnings, guidance, dividend, buyback, capital_raise, management_change, major_contract, regulation.

## Current implementation evidence

shareholder-data/shareholder-return and disclosures already use domain-specific dated events/revisions. Generic materiality, affectedFactIds/affectedClaimIds and event propagation are FUTURE V5.8; SSE/job events are execution telemetry, not that Event contract.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
