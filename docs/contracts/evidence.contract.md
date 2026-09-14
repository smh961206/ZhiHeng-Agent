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

Vision extraction responses retain `method=vision`, unverified trust, review requirement, page/region and source identity where available. This is an extraction envelope, not a canonical EvidenceRecord or historical backfill. Evaluation artifacts are never verified facts; model routing cannot alter original source dates, evidence or financial meaning.

## Current implementation evidence

The Python evidence, document and research-reference owners provide source/block/page identities, quality/truncation and citation checks. No normalized canonical EvidenceRecord or retrieval-version contract exists across all paths.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
