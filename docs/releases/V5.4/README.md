# V5.4 — Data Contracts / Hybrid Retrieval

Implementation Status: FUTURE at the H0 baseline. CURRENT selects the next authorized release; it does not establish implementation or acceptance.

## Goal

Canonicalize source/evidence metadata and add BM25 + semantic retrieval around existing exact/page retrieval.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V5.4.0 — Source contract:** New writes canonical Source metadata; old reads normalize on access.
- **V5.4.1 — Evidence contract:** Canonical evidence/page/block/table/extraction metadata.
- **V5.4.2 — BM25 lexical layer:** Add ranking while retaining alias/exact/page behavior.
- **V5.4.3 — Semantic retrieval:** Use embeddings primarily for qualitative semantic recall.
- **V5.4.4 — Fusion/reranker:** Merge exact/BM25/semantic/page/table results.
- **V5.4.5 — Retrieval planner:** Classify fact/exact/semantic/hybrid/page query.
- **V5.4.6 — Evidence Pack:** Claim-oriented primary/counter/gap/source payload to model.
- **V5.4.7 — Contradiction registry:** Persist/structure source/period/scope/definition/revision conflicts.
- **V5.4.8 — Retrieval evaluation:** Recall@K/MRR/page accuracy/citation hit benchmarks.

## Scope lock

Only the items described by this release and its subreleases are in scope.

Future release concepts may be referenced for compatibility, but may not be implemented opportunistically.

## Required read-before-code

- `AGENTS.md`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- relevant contracts
- relevant invariants
- relevant ADRs
- current repository implementation/tests
