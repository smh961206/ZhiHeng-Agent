# V4.8.8–V4.8.11 review and optimization

Status: review fixes accepted with the validation below. Scope: maintenance review of the accepted internal/offline implementation. Paid pilot remains deferred by the user: 贵州茅台 A / 比亚迪 B, four planned executions, combined RMB 100. No paid calls, pilot preparation or production policy activation occurred. CURRENT remains V4.8; no V4.9 work.

## Findings and fixes

1. **P1 — Refreshed audit material was lost after a model transition.** escalateAtCheckpoint replaces reviewMessages, but Agent retained a visualMessage reference into the previous array. A subsequent refresh updated the detached object. Resume also refreshed before restoring saved reviewMessages, which could overwrite the refresh. Agent now restores the active conversation first, reattaches refreshed material when needed and updates the existing normalizedVisualContext. A real Agent regression reproduces both transition and resume, verifies new material on the next model wire, preserves review validation and forbids reacquisition during compatible resume.
2. **P1 — Case identifiers could alias output files.** Regex coercion accepted numeric id 1 alongside string id "1", while run units used concatenated strings. Distinct apparent cases could overwrite the same baseline/candidate unit. Windows also aliases case-only differences. Case and source identifiers now require actual strings; case identifiers must be unique without case sensitivity and contain no surrounding whitespace. Invalid inputs fail before any worker/request.
3. **P2 — Acceptance export did not verify the stored corpus against its hash.** The export used saved corpusHash without recomputing it; edited questions/source inputs could retain prior output hashes and review bindings. Export/summary now recheck the actual corpus and validate each completed output's format, runId, unit, corpusHash, cutoff and inputHash. Changed or mixed results fail closed; manual grading and the existing >=50 live-case gate remain mandatory.
4. **P2 — A single long run could cross UTC midnight between arms.** The prior date check ran only during --resume. A normal run could therefore generate different currentDate prompts for baseline and candidate despite claiming a fixed execution day. Parent and worker now check before every new arm. A simulated clock rollover proves no worker request is issued after the boundary.

The first three failures were reproduced before fixes: 18/21 targeted tests passed, three failed as expected. Initial baseline was 97/97. The clock regression initially advanced on lock creation instead of run creation; the fixture was corrected to exercise the actual boundary, without relaxing the assertion or runtime behavior.

## Reviewed implementation

V4.8.8: model-health, Gateway same-tier fallback eligibility, adapter connection identity, bounded expiry, out-of-order outcomes and no replay of partial output. No new confirmed health-routing defect was found.

V4.8.9: model-state, research-create/resume/retry, index checkpoint callbacks, storage/public projection and compatibility tests. Legacy/policy Mongo process-restart tests pass, including key rotation and rejection of changed models. Existing no-reacquisition and private-state boundaries are retained.

V4.8.10: Agent, model-escalation, private normalized contexts, pending tool closure, strict persistence acknowledgement and fixed review budgets. Refreshed Vision material handling is repaired within these owners; no new Vision provider or canonical Vision system is introduced.

V4.8.11: rollout validator, legacy startup, CLI comparison parent/worker, budget reservations, locking, recovery, input/output pinning, manual review export and associated fixtures. Budget reservations remain operator estimates, not a guaranteed supplier billing limit. Paid pilot artifacts remain unchanged and deferred.

## Engineering completion record

1. Release: V4.8.8–.11 maintenance; live V4.8.11 quality acceptance remains PARTIAL.
2. Modified files: server/agent.mjs; scripts/model-comparison.mjs; scripts/model-comparison-worker.mjs; tests/model-escalation.test.mjs; tests/model-comparison.test.mjs; docs/architecture/current-implementation-map.md; docs/contracts/model-gateway.contract.md; docs/invariants/model.invariants.md; docs/releases/V4.8/DETAILED_INDEX.md; docs/releases/V4.8/model-comparison-runbook.md; MANIFEST.json.
3. New file: this review report. Local ignored artifacts store hashes and logs.
4. Removed files: none; no tests deleted or skipped.
5. Architecture: existing owners retained. No parallel transport, gateway, storage or research system. Corrected current-map passages that presented historical .6/.7 limitations as current absence of .8/.9/.10 capabilities.
6. Schema: no new fields, persistent type or Mongo version. Existing local artifact v1 and normalized review context reused.
7. Migrations: none; valid artifacts remain compatible in shape. Changed executable fingerprints require a new comparison run/acceptance report under the existing rules; corrupted or aliased inputs are intentionally rejected, not rewritten.
8. Environment: no .env, dependencies, lockfile or runtime configuration changes. Integration tests use only 127.0.0.1:27029 with random disposable databases.
9. Compatibility: legacy wire/event/result/checkpoint golden tests remain; review material refresh behavior is intentionally corrected. Runtime behavior delta is not zero in the affected refresh/recovery paths, but no routing-policy thresholds, research modes, financial algorithms or Evidence validation requirements change.
10. Recovery: existing compatible checkpoints reused; refreshed review material survives restoration, completed CLI arms retain original results and reservations, mismatches reject without reacquisition. No production jobs changed.
11. Flags: no new flags. Production legacy remains active. Paid pilot selection stays deferred-by-user with automaticResume=false and paidRunAuthorized=false.
12. Tests executed: see actual evidence below.
13. Results: 750 unit tests, 14 MongoDB/integration tests and 5 route render cases pass. No failures, skipped tests or cancelled tests in these final runs. Final Harness check verifies 477 manifest entries.
14. Benchmark: existing synthetic 60-case safety suite and six-mode Agent/Gateway goldens; these are not live quality measurements. No monetary spend or model-quality score is claimed.
15. Security/privacy: private reasoning is not transferred/publicized; refreshed Vision remains unverified evidence context. Artifact provenance is strengthened. No secrets, production DB, paid API or private pilot materials accessed. An optional Docker inventory read was unavailable in the sandbox; integration tests succeeded directly against the already-running isolated Mongo service without Docker access.
16. Rollback: revert only this task's listed changes, using the before-change file hash inventory artifacts/v4-8-8-11-review-baseline.json and this report to identify scope; do not reset the earlier accepted uncommitted V4.8 work. No database rollback or .env rewrite. Preserve private checkpoints and budget ledgers.
17. Limitations: semantic truth and real provider quality require the deferred live comparison and human review; money reservations do not prove invoice bounds. UI/deployment acceptance is not inferred from unit tests.
18. Deferred: paid 贵州茅台/比亚迪 pilot, actual model availability/price checks, >=50-case quality acceptance and production rollout; V4.9+, Judge and Champion/Challenger remain untouched.

## Actual validation evidence

- Baseline: node --test tests/model-health.test.mjs tests/model-state.test.mjs tests/model-escalation.test.mjs tests/model-rollout.test.mjs tests/model-comparison.test.mjs — 97 passed.
- Targeted final: node --test tests/model-escalation.test.mjs tests/model-comparison.test.mjs — 22 passed, zero fail/skip/cancel.
- Gateway migration subset: node --test tests/model-escalation.test.mjs tests/model-comparison.test.mjs tests/model-migration.test.mjs tests/model-telemetry-migration.test.mjs — passed after the context fix; the full-unit run below covers the final revision.
- pnpm test:mongodb — 7 passed, zero fail/skip/cancel.
- node --test tests/model-state.integration.mjs tests/research-resume.integration.mjs — 3 passed, zero fail/skip/cancel; actual process exit/restart on isolated Mongo.
- node --test tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs — 4 passed, zero fail/skip/cancel.
- pnpm test:routes — 5 render scenarios passed, exit 0.

- pnpm test — 750 passed, zero fail/skip/cancel, exit 0; includes the 60 offline safety comparisons, six-mode executor comparisons and legacy golden assertions. The expanded export regression also rejects six types of wrong run/input/output metadata even when the file hash was recomputed.
- node --test tests/harness.test.mjs — final documentation/manifest verification; 477 entries. Full unit tests also include this suite.
- Read-only actual configuration: requested=legacy, active=legacy, reasons=[]. Pilot selection: deferred-by-user, automaticResume=false, paidRunAuthorized=false, budgetMinor=10000, paidCallsPerformed=0.

UI and Linux deployment tests are not rerun for this bounded maintenance review and are not claimed as new evidence. All test logs use artifacts/v4-8-8-11-review-*.log. Final changes are checked against the before-change worktree hash inventory, not against HEAD which predates accepted uncommitted work; see artifacts/v4-8-8-11-review-audit.json.
