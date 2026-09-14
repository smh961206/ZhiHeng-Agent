# Research State Contract

> Current runtime owner (2026-09-14): `python_backend/application/research_service.py`, `workflow.py` and `recovery.py` under ADR-018.

New plans persist execution compatibility 1 and output contract 7, separately from K identity and model pins. Compatible pre-rename K-pinned plans retain exact checkpoint/message identity. Missing or incompatible execution metadata fails closed, and no saved record is relabelled. This is job metadata, not the future canonical ResearchState. See [ADR-017](../adr/ADR-017-platform-execution-compatibility.md).
Implementation Status: PARTIAL; target V5.7.

Research State becomes the canonical structured representation of a company's research state.

Contains:
thesis, claims, beliefs, verified/relevant facts, assumptions, valuation, risks, catalysts, monitoring metrics, invalidation conditions, known gaps, version metadata.

Reports are renderers of Research State after migration; reports are not the long-term system of record.

## Current implementation evidence

The V5.3 independent-review supplement adds private `flagshipState.version=2` sessions to job payloads, containing original cutoff, job/scope/model fingerprints, input/profile/output hashes and reservation/completion status. Checkpoints may additionally retain `preJudgeReview` with its digest so restart reuses the prior audit before a completed judge result. Legacy records without these fields remain readable; old Node flagship states are not executable under the Python session protocol. No historical backfill is performed. Public job responses and MongoDB summary rows exclude flagshipState. See [migration, rollback and recovery analysis](../releases/V5.3/independent-review-migration.md).

Jobs contain plan, sources, tool/checkpoint records, report and structured review/result fields. Public execution plans and saved Knowledge receipts are CURRENT. Canonical company ResearchState with Claim/Belief/Fact references and a state renderer is FUTURE V5.7.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
