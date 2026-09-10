# Research Invariants

- INV-RES-001 [ENFORCED]: formal delivery must pass the current review/validation path.
- INV-RES-002 [ENFORCED]: missing material data is disclosed, not fabricated.
- INV-RES-003 [ENFORCED]: material counter-evidence must not be silently discarded.
- INV-RES-004 [ENFORCED]: resume preserves the original research/market cutoff.
- INV-RES-005 [TARGET V5.7]: canonical Research State, not report text, owns structured research truth.
- INV-RES-006 [TARGET]: a research job pins its behaviorally relevant versions/snapshots.

## H0 enforcement evidence and limits

Current execution: agent/research-output/research-references enforce the review path and structured gates; research-resume/research-retry preserve compatible resume data. Tests: research-contract, research-resume, research-retry, review-recovery. Missing-data and counter-evidence requirements remain mandatory, but arbitrary semantic completeness is not mechanically proven. Rejected-checkpoint restart is a separate current branch; see H0-G02/G05.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
