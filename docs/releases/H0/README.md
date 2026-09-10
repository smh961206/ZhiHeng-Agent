# H0 — Harness Calibration

Status: ACTIVE while CURRENT=H0; acceptance is recorded in the completion report.

Zero investment-research runtime change. Follow [DETAILED_INDEX](DETAILED_INDEX.md) and [normalized execution](NORMALIZED_EXECUTION.md).

## Sequence

- **H0.0 — Repository inventory**
- **H0.1 — Harness control-plane validation**
- **H0.2 — Baseline architecture fitness**
- **H0.3 — H0 acceptance & CURRENT handoff**

## Boundaries

Inspect actual executable code/tests first. Correct Harness paths, status and ownership; do not modify business logic, models/routing, financial algorithms, Evidence, Knowledge content, acquisition, schemas or future features. H0 may add documentation/static checks. The user-approved test-preparation exception adds shared/ to the deployment fixture copy list without changing assertions. The subsequent user instruction to resolve the recorded failures additionally authorizes test-only alignment in workspace-ui.integration.mjs, workflow-ui-scenarios.mjs and agent-capabilities-ui-scenarios.mjs: current UI selectors/copy/preconditions and asynchronous observation waits. Preserve all scenarios and equivalent business, financial, Evidence, privacy and recovery assertions; no product changes. See [failure analysis](test-failure-analysis.md).

## Gates

H0.0 maps current code and test owners; H0.1 aligns contracts/invariants/ADRs/navigation; H0.2 adds safe static checks without enforcing future architecture; H0.3 runs every existing test suite, proves runtime files unchanged and reports. See [testing](../../development/testing.md).

Only after all acceptance gates pass, set CURRENT=V4.8 and stop. Do not implement V4.8 in this task. Any unresolved failure leaves CURRENT=H0. No schema/API/migration/feature-flag change.
