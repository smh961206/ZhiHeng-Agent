# K-Series Is the Active Knowledge Version System

Status: ACCEPTED

## Context

Knowledge previously reused research framework version 4.7 for catalog metadata, snapshot paths, UI compatibility and task recovery. V5.3 introduced K1.0.0, but retaining both identities allowed one K release to acquire multiple fingerprints and coupled Knowledge activation to unrelated framework changes.

## Decision

- K-Series is the only active Knowledge version system. The current release is K1.0.0.
- `knowledge/modules.json` owns the release declaration through `knowledgeVersion`; the generic legacy `version` field is invalid in an active catalog.
- `knowledge/current.json` is the reviewed activation pointer. New tasks resolve it once and persist the concrete K version, snapshot ID and governance fingerprint.
- Published K snapshots are immutable. Different bytes require a new K version.
- Runtime Knowledge loading accepts only `Kx.y.z` snapshots. V4.x files remain byte-identical read-only audit archives and cannot create or resume current tasks.
- A task without a valid K-Series pin restarts on the active K release. No old calculation, evidence checkpoint or model conversation is silently carried across that boundary.
- Execution compatibility, review contract, model configuration and Knowledge identity remain distinct reproducibility data. [ADR-017](ADR-017-platform-execution-compatibility.md) clarifies that only platform V and Knowledge K are active release lines; execution/model capabilities ship with the platform.

## Consequences

K1.0.0 lives under `knowledge/versions/auto/K1.0.0/<snapshot-id>/`. Activation is explicit and rollback cannot overwrite a snapshot. Historical V4.x reports remain viewable, while their rule excerpts may be unavailable through the active runtime. A future K release must pass lint, benchmark and release gates before the pointer changes.
