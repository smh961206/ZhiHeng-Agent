# Evidence Contract
Implementation Status: PARTIAL; formalized V5.4.

Evidence must identify:
- evidence ID;
- source ID;
- page/block/table/cell where available;
- extracted content/structured relation;
- extraction method;
- uncertainty/limitations;
- retrieval/parse version where relevant.

Search snippets do not automatically become authoritative research evidence.
Vision readings remain unverified until cross-checked under current research rules.

V4.9 canonical extraction responses explicitly retain method=vision, trust=unverified, needsReview=true, page/region and decoded-image SHA-256 plus actual call profile. This is an in-memory envelope, not a new canonical EvidenceRecord or historical archive backfill. Benchmark grades are evaluation artifacts, never verified facts; model routing/fallback cannot alter original source dates, evidence or financial meaning.

## H0 implementation evidence

evidence-search/document-layout/research-references provide source/block/page identities, quality/truncation and citation checks. No normalized canonical EvidenceRecord or retrieval-version contract exists across all paths. Tests: evidence-integrity, research-references, web-research.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
