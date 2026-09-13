# V5.1 Rollback

Disable cost router/research budget optimization; keep telemetry.

Preferred rollback keeps the V5.1 binary and sets FEATURE_COST_ROUTER=false and FEATURE_RESEARCH_BUDGET=false. This turns off budget enforcement/ranking observation without removing costs, gaps, reservations, original cutoff, model pins or source records. Already uncertain operations remain paused to avoid replay; disabling a spending limit is not confirmation that an in-flight request failed.

Remove MODEL_PRICING_FILE only to stop new estimates; stored cost snapshots remain readable. Remove RESEARCH_BUDGET_FILE to stop assigning budgets to new jobs; old budgeted jobs retain their state. Do not edit pinned limits or delete ledger entries to force continuation. Changes to quality-bound budget configuration may pause candidate jobs under existing approval guards; restore compatible approval/configuration rather than changing their model.

No schema/data rollback or destructive migration is required. An older binary can read ordinary historical jobs and ignore additive ModelCall fields, but it cannot enforce the V5.1 budget ledger. Do not resume budgeted jobs with that older binary. Retain them paused or use the current binary with flags disabled. The isolated deployment suite validates backup/restore, while research-budget tests validate disabling enforcement without resetting consumption.

## Rollback requirements
- State whether code rollback alone is sufficient.
- State whether schema/data rollback is required.
- State whether newly written data remains readable by the old path.
- Validate rollback before deleting legacy paths.
