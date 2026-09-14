# Point-in-Time Invariants

- INV-PIT-001 [TARGET V5.11; principle ENFORCED now]: historical research must not intentionally consume evidence published after researchAsOf.
- INV-PIT-002 [TARGET V5.5]: restated financial facts do not destructively overwrite originally reported facts.
- INV-PIT-003 [ENFORCED]: resume does not silently refresh the original market cutoff.
- INV-PIT-004 [TARGET V5.11]: Research Replay pins historical Knowledge/data/model-policy snapshots.

## Current enforcement and limits

Current recovery retains input sources, market data and saved tool/review state for compatible tasks. No universal `publishedAt` cutoff exists on every newly acquired follow-up. Invalid or incompatible checkpoints follow the explicit recovery policy and cannot silently change the original cutoff.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
