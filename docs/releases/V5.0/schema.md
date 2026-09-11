# V5.0 Schema

Benchmark result/experiment metadata; no investment-research fact schema.

## Current additive object versions

The normalized templates say “No persistent schema change”, while their recovery requirements require a persisted experiment group. This is resolved explicitly as **no new Mongo collection/index migration**, with versioned additive private JSON objects; treating the templates as a prohibition on any job metadata would violate BEN-003.

- Benchmark case/manifest/fixture/run/result/baseline/registry/policy objects are version 1, in explicit local artifacts. Content, code, grader, profile and configuration identities are pinned. Simulation and live measurement remain distinct; missing usage and costs stay null.
- Semantic rubric policy is version 1.0.0; individual observations are v1 and never grant acceptance.
- Approval evidence binds both plan hashes and exact run ID/result hashes, effective review/deadline settings and complete execution code/dependency/active-Knowledge identity. A matching plan alone cannot authorize substituted measured results. Local drift observations are v1, hash-bound to the exact approved policy; simulation is non-actionable.
- ModelProfile v4 adds one explicitly configured text MAIN challenger; v1/v2/v3 retain their meanings.
- New experimental jobs use private modelState v3 with `selection`, configuration hash, selected profiles, fixed active profile and empty escalation history. Selection pins policy ID/hash, job ID/time/mode, task class/classifier, deterministic bucket/percentage/group, actual profile/effort and approval time. modelState v1/v2 retain exact validation and behavior. Historical absence remains absence.
- Public jobs, lists and events continue to exclude private model state. No investment Facts, accounting definitions, Knowledge version or report contract is changed.

Selection is stored with the first job insert and copied through the existing checkpoint owner. It must not be reconstructed from a new policy during retry. A timestamp later than the original job creation cannot authorize assignment to that job.

## General rules
- Additive first.
- Historical records are not destructively rewritten.
- New fields must have safe defaults/absence behavior for old records.
- Point-in-time/provenance fields cannot be fabricated during backfill.
