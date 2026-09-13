# V5.2 migration

Deploy additive readers before enabling new writers. Existing jobs without flagshipState stay on their saved ordinary model path; installing configuration does not add authorizations to historical jobs. New jobs obtain independent authorizations only after matching live acceptance succeeds. No database migration, index, backfill, external service, dependency update or new collection is required.

Optional configuration roles use existing MODEL_CONFIG_FILE or explicitly declared LLM_FLAGSHIP_REVIEW_* / LLM_FLAGSHIP_JUDGE_* fields. Capabilities are required; no model, provider, price or token limit is inferred. Actual environment files and credentials were not changed.

Point-in-time: new state pins original job.createdAt. All independent source excerpts require known publishedAt no later than that cutoff, unique actual evidence block identity and complete context. Resume reconstructs the same packet; unknown history remains unknown. No original report is overwritten by Judge, and no restatement is backfilled.

Provenance: private session references original source/block/tool IDs and immutable hashes. Cost metrics reuse existing ModelCall. Old telemetry remains readable with no invented purpose, cost or date.
