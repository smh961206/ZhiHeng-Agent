# Security Master Contract
Implementation Status: PARTIAL; target V5.5.

Canonical identities:
- issuerId: economic/legal issuer identity
- securityId: financial instrument identity
- listingId: exchange listing identity, time-bounded
- shareClassId: economic share-class identity

Ticker is not a stable primary key.

Must support over time:
A/H, ADR/ADS, preferred shares, ticker changes, splits/mergers, listing validity, parent/subsidiary relations.

## H0 implementation evidence

security-resolver, sec-directory, security-exchanges and shared/security-input provide directory-backed A/H/US resolution and display semantics. Stable canonical issuer/listing/share-class entities and validity history are not implemented. Tests: security-resolver, security-intent, security-display.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
