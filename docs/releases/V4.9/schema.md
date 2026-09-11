# V4.9 Schema

Review fixes: comparison JSON v1 adds completed, progress v1 (status, cumulative ordered reservation/result ledger, checksum), and per-case imageInputHash. Atomic snapshots are local acceptance artifacts, not Mongo or canonical research state. Existing v1 reports remain historical readable evidence; only new progress-bearing files support resume. Resume requires unchanged corpus/config/code/limit, validates completed result hashes, and refuses any reserved request with unknown outcome. No migration/backfill of earlier files; retain their bytes. Rollback preserves new artifacts but the older runner must not resume or overwrite them. Provenance includes original/rendered identities and actual normalized responses; dates/cutoffs and unverified trust do not change. Completed=false or incomplete progress cannot be promoted.

The cancellation finalization map and admission cache are process-local only. No job, checkpoint, index or Mongo schema migration is introduced.

CURRENT V4.9.0–.8: no Mongo schema/index/version change. ModelProfile v3 is an additive configuration type (vision purpose, VISION tier, explicit image capability and adapterOptions.thinking), not a persisted research type. readVisionResult/extraction/attempts are in-memory response metadata; legacy archive readers and bytes are unchanged.

New admitted jobs can use vision-challenger instead of legacy-vision in existing private modelState profile fields. This changes permitted values, not object fields. Dual read explicitly preserves saved legacy IDs and historical jobs without state. Candidate IDs require a currently matching admission; old binaries/rollback without admission refuse incompatible candidate pins before work. No historical data is rewritten and no unknown profile is inferred.

Comparison JSON v1 contains the frozen synthetic corpus, actual arm outputs, image/original hashes, binding and usage summary; approval is a separate operator attestation bound to the comparison hash. These are local operational artifacts, not canonical financial facts. Evidence remains unverified; dates, currency, source content and cutoff are not altered. No reasoning/images/credentials are stored in the comparison response envelope.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
