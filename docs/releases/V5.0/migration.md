# V5.0 Migration

None; model policies versioned additively.

## Implemented compatibility strategy

Optional model configuration migration now has a version-1 connections/profiles/roles file, with environment-only credential references. This is an additive configuration format, not a MongoDB schema. The absent selector preserves old env behavior; explicit invalid/conflicting configuration closes model dispatch. Existing internal IDs and modelState versions remain unchanged. Preview/check compare effective profiles, connection values and legacy/policy pins before activation. Do not rewrite historical jobs, code-bound approvals or policy registries. See [configuration migration runbook](model-config-migration-runbook.md).

No MongoDB migration command, backfill or historical rewrite is needed. Local benchmark files are new versioned artifacts; older files remain available. New modelProfile v4 and private modelState v3 have explicit constructors/validators. Old absent/v1/v2 job records retain their existing paths. No inferred model identity, cost, facts, publication time or experiment group is backfilled.

Deploy code that understands v3 first, keeping all champion/A-B controls disabled. Prepare a separately reviewed, versioned registry only after actual frozen benchmark and pipeline quality evidence exists. Enabling a matching policy affects newly created jobs only. Repeated submissions reuse the original durable state, including uncertain insert acknowledgement.

Point-in-time impact: benchmark loaders reject future publication/observation; experiment approval must precede job creation. Existing research cutoff and evidence snapshots are preserved, not reacquired on model incompatibility. This does not implement V5.11 universal historical replay.

Provenance impact: additive code/config/profile/case/fixture/grader and operator-intent hashes; no evidence lineage is replaced. Local hashes establish identity under the existing trusted operator/artifact model, not cryptographic proof that an operator scored honestly.

## Migration rules
- Migrations must be idempotent where practical.
- Backup/recovery path must be stated before destructive operations.
- Backfill quality must be measurable.
- If historic information was never stored, record it as unavailable rather than reconstructing it from future information.
