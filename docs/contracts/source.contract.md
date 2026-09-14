# Source Contract
Implementation Status: PARTIAL; formalized V5.4.

Canonical source fields should converge toward:
`sourceId`, `provider`, `sourceType`, `url/document identity`, `eventTime?`, `effectiveAt?`, `publishedAt?`, `retrievedAt`, `rawHash`, `parserVersion?`, `issuerHint?`, `securityHint?`.

A source is raw provenance identity, not a model summary.

## Current implementation evidence

Current source objects use id/type/url/date/fetchedAt and provider-specific publication/report fields; parsed archive hashes and parserVersion exist in document-integrity/data-archive. Not every target timestamp/identity is populated. Missing publication time stays missing. Tests: web-evidence-reuse, data-providers.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
