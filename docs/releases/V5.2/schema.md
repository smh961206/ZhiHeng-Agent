# V5.2 schema and compatibility

ModelProfile v5 is additive configuration: source flagship-config, tier FLAGSHIP, independent IDs flagship-review / flagship-judge, single critical-review / judge purpose, explicit capabilities and adapterOptions, and allow flags. It never enters ordinary research catalogs. Existing model configuration v1 accepts two optional roles flagshipReview and flagshipJudge; old required roles remain. Existing ModelProfile v1–v4 and saved modelState v1–v3 are unchanged.

Existing private job payload may have flagshipState v1 with original createdAt cutoff, immutable per-purpose authorizations (configuration/code fingerprint, reviewed artifact hash, profile hash, connection identity), and at most one review and one judge session. Sessions reserve before dispatch, retain referenced evidence/tool IDs, input/profile hashes, reason, status and completed output hash, plus optional normalized usage/performance/cost. No prompt session or hidden reasoning is added to this receipt. Existing private research checkpoints may contain optional flagshipFailures / flagshipPending / reviewMissingData in their review state.

Existing ModelCall schema v1 accepts two additive purposes and optional flagship {version:1,conflictType}. Existing aggregations retain unknown cost and failed attempts. List/detail/SSE exclude flagshipState. Existing cost API shows translated purpose labels; no new HTTP route.

Judge packets/conclusions are local comparison inputs, not canonical Claims or Facts. Completed output can select only an original conclusion or abstain. It remains advisory-needs-review. Counter evidence, source/block identity, publication cutoff and explicit entity/period/currency/share/accounting/valuation basis remain mandatory. Financial formulas and historical records are unchanged.

The generic subrelease template said no persistent change, but release-level schema called for decision/escalation metadata. This additive private job change follows the release-level requirement; no collection/index/database-version migration, destructive write, historical backfill or fabricated dates.
