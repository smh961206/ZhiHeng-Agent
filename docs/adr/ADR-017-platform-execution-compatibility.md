# Platform Releases Own Execution Compatibility

Status: ACCEPTED — user confirmed on 2026-09-13; implementation started only after the preceding K-Series cutover task completed.

## Decision

Maintain two active release lines: platform V-Series and Knowledge K-Series. M1.0/M1.1 remain model engineering milestones delivered with the platform, not a separate runtime release identity. Existing model configuration, modelState and contextVersion pins retain their precise compatibility responsibilities.

Execution ships with the platform. New plans use integer `executionCompatibilityVersion: 1` and retain `contractVersion: 7`; they do not write generic `plan.version`. Route events use the execution counter, result framework metadata retains the existing container with the new counter, and new checkpoint scopes bind both counters. Increment the execution counter only for incompatible execution/checkpoint semantics, not for an ordinary platform release, UI change or Knowledge release. The counter is not a source-code snapshot or a guarantee of historical code replay.

## Compatibility

Knowledge validation under ADR-016 remains mandatory. After it succeeds, accept either the current numeric execution counter plus current contract counter, or the exact pre-rename plan (`version: '4.7'`, contract 7, with no new execution field). Reject absent, malformed, conflicting, unknown and incompatible execution/contract identities. Do not infer compatibility from a K version alone.

Legacy K-pinned tasks keep their original plan and serialized checkpoint scope (`frameworkVersion: '4.7'`), request messages, result metadata and event format. New tasks use the new scope format. Neither path upgrades saved records in place, and a checkpoint cannot move between formats merely by renaming its plan field. V4.x Knowledge remains read-only history and cannot resume.

The historical `framework_changed` UI reason remains readable but displays an execution-flow message. New incompatible execution uses `execution_changed`, distinct from `rules_changed`. Existing model-state safety guards still prohibit silent reacquisition for pinned tasks; those tasks require a new research job if continuation is impossible.

## Migration, rollback and safety

No database migration, backfill, new service, dependency or feature flag. Code performs dual read and new write. Research cutoff, sources, Knowledge hashes, model pins, private messages and financial validation retain their owners. Legacy full-payload A–F migration fixtures must remain unchanged; new A–F runs and interrupted legacy/current runs validate the new metadata and recovery.

Rollback must drain or pause new-format tasks and retain a compatible worker for their continuation. Pre-change code cannot safely continue a new scope; do not route new-format jobs to it or rewrite counters to force acceptance. Completed results and historical archives remain intact. Prefer a compatible forward fix for active jobs.

## Superseded wording

The final reproducibility bullet in ADR-016 and the former architecture track table described the framework and M-Series as independent version dimensions. Their technical pins remain, but this user-approved decision supersedes any interpretation requiring separate framework/M releases. Future capability-track names in the roadmap are planning labels, not authority to create additional release systems.
