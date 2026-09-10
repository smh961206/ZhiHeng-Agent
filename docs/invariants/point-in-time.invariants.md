# Point-in-Time Invariants

- INV-PIT-001 [TARGET V5.11; principle ENFORCED now]: historical research must not intentionally consume evidence published after researchAsOf.
- INV-PIT-002 [TARGET V5.5]: restated financial facts do not destructively overwrite originally reported facts.
- INV-PIT-003 [ENFORCED]: resume does not silently refresh the original market cutoff.
- INV-PIT-004 [TARGET V5.11]: Research Replay pins historical Knowledge/data/model-policy snapshots.

## H0 enforcement evidence and limits

Current enforcement: compatible researchResume retains input.sources/marketData and saved tool/review state; tests research-resume, research-retry, research-resume integration. No universal publishedAt cutoff exists on newly acquired followup. Invalid/incompatible checkpoints can restart collection under the same job ID; the broader explicit-new-job policy remains a documented conflict (H0-G02/G03), not a silently weakened rule.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
