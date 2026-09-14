# Research Invariants

Current research validation checks known publication times and actual block identities against the original job cutoff. Missing, ambiguous, omitted and counter-evidence cannot be silently removed. Optional Judge outcomes remain advisory, and final validation is still required. These checks do not establish a global canonical Research State or complete historical replay.

- INV-RES-001 [ENFORCED]: formal delivery must pass the current review/validation path.
- INV-RES-002 [ENFORCED]: missing material data is disclosed, not fabricated.
- INV-RES-003 [ENFORCED]: material counter-evidence must not be silently discarded.
- INV-RES-004 [ENFORCED]: resume preserves the original research/market cutoff.
- INV-RES-005 [TARGET V5.7]: canonical Research State, not report text, owns structured research truth.
- INV-RES-006 [TARGET]: a research job pins its behaviorally relevant versions/snapshots.
- INV-RES-007 [ENFORCED]: execution compatibility and output contract counters validate before continuation; K-pinned legacy 4.7 plans retain their exact saved scope. Unknown/mixed counters cannot downgrade to legacy, and checkpoints cannot silently cross formats. Tests: research-resume, model-migration, research-contract. This scoped guarantee does not claim complete historical code replay.

## Current enforcement and limits

The Python research, output, reference and recovery owners enforce the review path, structured gates and compatible resume data. Missing-data and counter-evidence requirements remain mandatory, but arbitrary semantic completeness is not mechanically proven.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
