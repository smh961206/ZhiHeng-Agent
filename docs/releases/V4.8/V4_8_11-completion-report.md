# V4.8.8–V4.8.11 Completion Report

Status: PARTIAL release acceptance. Authorized offline implementation and the full existing test suite are complete. Live quality comparison was explicitly deferred by the user, so V4.8.11-AC01 and production policy acceptance remain pending. CURRENT remains V4.8; stop before V4.9.

Subsequent authorized work adds the [isolated comparison executor](model-comparison-runbook.md). Its [separate completion report](V4_8_11-executor-report.md) records the new files and current-turn offline tests; the earlier counts and inventory below remain historical evidence. No paid run or production acceptance was added.

## 1. Release scope and sequence

V4.8.8 health → V4.8.9 private model pins → V4.8.10 safe internal escalation were implemented/tested/reported sequentially before .11. See [health](V4_8_8-completion-report.md), [pins](V4_8_9-completion-report.md), [escalation](V4_8_10-completion-report.md). V4.8.11 adds the rollout gate, offline comparisons and legacy startup entry. The user selected MAIN GLM-5.3-Flash / PRO DeepSeek-V4-Pro and explicitly said not to run paid tests, to finish offline acceptance and retain legacy.

## 2. Modified files

The exact aggregate file inventory is appended below, measured against the accepted 1,408-file starting worktree, not HEAD de56872 (which predates accepted uncommitted .2–.7 work). Existing edits are preserved.

## 3. New files

New runtime owners: server/model-health.mjs, model-connection.mjs, model-state.mjs, model-escalation.mjs, model-rollout.mjs. New startup entry: scripts/start-legacy.mjs. New tests: model-health, model-state, model-escalation, model-rollout .test.mjs plus model-state.integration.mjs and fixtures/model-routing-offline-cases.json. Four stage completion reports added. Ignored artifacts hold original snapshots, byte copies, logs and UI screenshots; they are not runtime inputs or live quality approvals.

## 4. Removed files

None. No test removed/skipped, no original golden baseline rewritten.

## 5. Architecture

One Gateway adapter/endpoint remains. Bounded process-local health state observes availability independently of best-effort telemetry; no distributed breaker. The shared private connection resolver supports explicit user-selected MAIN/PRO bindings, with no arbitrary model-name tier inference. New-job pin validation covers actual model/connection/mode/policy/effort and checkpoint consistency before dispatch/tool/retry acquisition. Safe transitions rebuild from existing research-context evidence/tool windows and preserve omissions, source lineage, public plan, draft-as-unverified and original cutoff. Hidden assistant reasoning does not transfer. Strict checkpoint acknowledgement precedes the next model call.

The rollout owner consumes the existing complexity recommendation only for an accepted new policy job; Mode A stays MAIN/low. An acceptance report must match model/connection and relevant model-owner code fingerprints, review format and timeout config. It must attest to >=50 unique live cases across six modes, passing delivery/citations, zero critical fact errors, prior dry-run and rollback verification. No such real report exists for this work. Local approval reports are trusted operator evidence, not a cryptographic proof of truthful grading.

## 6. Schema

No Mongo schema increment: remains 2. Private additive modelState v1 pins legacy jobs; v2 supports policy active step/failure counters/contiguous escalation history and optional initial selection. Earlier v2 without initial means MAIN/low. Existing GridFS payloads retain these objects; public detail/list filters exclude them. Config-only ModelProfile v2 extends legacy v1; no changes to financial/Evidence/Knowledge schemas, framework 4.7 or research contract 7.

## 7. Migrations

No backfill or historical rewrite. Absence alone retains legacy compatibility; malformed present state fails closed. No historical endpoint/model identity is fabricated. Legacy and policy Mongo process-restart tests preserve completed tools and original sources/cutoff. Deployment's injected migration 3 is a disposable test fixture only; runtime schema stays 2.

## 8. Environment

Actual .env is not edited; dependency versions, lockfile and workspace config are unchanged. Both environment examples still default MODEL_ROUTING_MODE=legacy, with explicit MAIN/PRO settings and an empty MODEL_POLICY_ACCEPTANCE_FILE. package.json only adds start:legacy, with no dependency change. Host tests use Node 24.19.0/pnpm 11.19.0, Playwright with Edge and loopback Vite. Mongo tests use isolated 127.0.0.1:27029 and random disposable databases, not the research service on 27017.

## 9. Compatibility and behavior

Runtime behavior change is not zero: new compatibility guards, private metadata, bounded health observation and explicitly gated policy paths are added under V4.8 authorization. Actual default selection stays legacy. Existing research/router/Vision wire/result/event/checkpoint golden fixtures pass. Financial definitions/math, Evidence validation, Knowledge bodies, acquisition logic, public delivery/review requirements and turn/repair budgets are unchanged. New pinned jobs with unusable checkpoints refuse silent reacquisition; this intentionally requires an explicit new job or restoration of compatible progress.

## 10. Resume/recovery

Key rotation is compatible; model/base/policy/effort mismatch or corrupt state refuses continuation before acquisition/tool/model work. New pin metadata is private in both Mongo and in-memory summaries. Existing completed tools are not replayed. Policy rollback pauses incompatible policy jobs with their payload intact; it never changes them into legacy continuations. Uncertain transition persistence halts dispatch with a consistent rebuilt checkpoint, instead of carrying old private context into a new model. Repeated transitions preserve actual Vision reading material exactly once without nesting old rebuilt context.

## 11. Flags and rollout

legacy remains default; dry-run remains observation only. policy without a valid matching live report or credentials falls back to legacy for new jobs. No paid invocation or production policy activation occurred. Internal health fallback additionally requires an explicitly quality-approved same-tier allowlist; none is configured in production. Cost-based routing, Judge, Champion/Challenger and future releases are not implemented.

## 12–13. Commands and actual results

| Command / check | Actual final result |
|---|---|
| pnpm test | 735 passed, 0 fail/skip/cancel |
| pnpm test:mongodb | 7 passed, 0 fail/skip/cancel |
| node --test tests/model-state.integration.mjs tests/model-telemetry.integration.mjs tests/research-resume.integration.mjs tests/knowledge-api.integration.mjs | 7 passed, 0 fail/skip/cancel |
| pnpm test:routes | 5 route render scenarios passed |
| pnpm test:ui | 271/271 passed, exit 0 |
| bash tests/deploy.integration.sh inside isolated Linux Docker runner | two runs passed all 9 groups, exit 0 |
| node --test tests/model-rollout.test.mjs | 63 passed: 60 offline comparisons + 3 gate/rollback tests |
| pnpm start:legacy --check | requested=legacy, active=legacy, reasons=[] even with policy inherited in the unit test |
| read-only current config check | requested=legacy, active=legacy, reasons=[] |
| node --test tests/harness.test.mjs | 7 passed, 474 manifest entries verified |

Logs: artifacts/v4-8-11-{unit-reviewed,unit-final,mongodb-final,integration-final,routes,ui,deploy,deploy-final,offline,harness}.log. Stage .8/.9/.10 logs preserve their actual earlier counts and failures, not overwritten by final totals. Initial failures were traced to architecture ownership/import boundaries and unconfirmed structured-output capability metadata; actual owners were corrected. No Evidence, financial, validation or existing architecture requirement was bypassed. The existing shadow-only dependency test was explicitly extended for the authorized rollout owner; it continues to reject all other consumers and any rollout transport bypass.

## 14. Benchmark

60 frozen offline safety cases compare actual mocked baseline/candidate Gateway wires across A–F and repeated JSON errors, data missing, provider outages, timeouts, financial validation and refusal. All pass. They do not measure research quality or replace >=50 real baseline/candidate research cases. The fixture is explicitly marked offline-safety-comparison and qualityAcceptance=false, and cannot unlock the live gate. Real candidate quality, paid cost/performance, and V4.8.11-AC01 remain unverified by explicit user choice.

## 15. Security/privacy

No real paid model calls, credentials disclosed, research DB access or public policy endpoint. Health uses opaque endpoint/model hashes; modelState/telemetry exclude prompts and hidden reasoning. Connection URLs/keys stay server-only. UI uses synthetic responses; Docker deployment uses independent projects/temporary data and read-only repository mounting. The previously authorized Docker socket access is limited here to these disposable acceptance runs; no production service is modified. Existing model request size/deadline/cancellation/refusal guards and financial/Evidence constraints remain enforced.

## 16. Rollback

Stop the existing server instance and use pnpm start:legacy (or restart with MODEL_ROUTING_MODE=legacy). This overrides policy without rewriting .env, saved jobs or evidence. Existing pinned policy jobs remain safely paused until their compatible policy/config is restored. Retain v1/v2-compatible readers; rolling back to a reader that ignores pins is unsafe for pinned jobs. Stage byte backups live under artifacts/v4-8-{8,9,10,11}-rollback. No database migration, deletion or historical financial rewrite is part of rollback.

## 17. Known limitations

The real model quality gate is closed. Configured provider features are documented support, not verification of this account's hosted capability; unknown JSON Schema support retains existing negotiation and hard validation. Health counts final logical-call outcomes, with bounded/expiring process-local state and no distributed probe. All three legacy connection profiles are conservatively pinned even when unused. Old jobs still cannot prove historical model identity. Missing progress in a new pinned job refuses automatic re-collection. Trusted local acceptance reports require honest operator review. No universal semantic correctness or universal prompt-injection resistance is claimed.

## 18. Deferred and stop

Paid >=50-case real quality comparison, operator acceptance and production rollout are deferred. Future unified benchmark infrastructure, Judge/Champion, canonical Vision and V4.9+ are not started. CURRENT final value: V4.8. The next permitted work is completing the deferred V4.8.11 quality gate after separate authorization; this task stops with legacy active.

## Aggregate exact file inventory

Modified 35; new 16; removed 0. File lists below are relative to the project root.

Modified:

- .env.example
- .env.production.example
- MANIFEST.json
- docs/adr/ADR-002-model-gateway.md
- docs/adr/ADR-014-quality-before-cost.md
- docs/architecture/00-system-map.md
- docs/architecture/04-model-system.md
- docs/architecture/current-implementation-map.md
- docs/contracts/model-gateway.contract.md
- docs/contracts/research-state.contract.md
- docs/invariants/model.invariants.md
- docs/releases/V4.8/DETAILED_INDEX.md
- docs/releases/V4.8/README.md
- docs/releases/V4.8/migration.md
- docs/releases/V4.8/rollback.md
- docs/releases/V4.8/schema.md
- docs/releases/V4.8/subreleases/V4_8_10-safe-main-pro-escalation.md
- docs/releases/V4.8/subreleases/V4_8_11-policy-mode-rollout-gate.md
- docs/releases/V4.8/subreleases/V4_8_8-health-routing-v1.md
- docs/releases/V4.8/subreleases/V4_8_9-checkpoint-modelstate-compatibility.md
- package.json
- server/agent.mjs
- server/index.mjs
- server/job-stream.mjs
- server/model-adapter.mjs
- server/model-catalog.mjs
- server/model-gateway.mjs
- server/model-policy.mjs
- server/model-routing.mjs
- server/model-telemetry.mjs
- server/research-create.mjs
- server/research-resume.mjs
- server/research-retry.mjs
- server/storage.mjs
- tests/model-policy.test.mjs

New:

- docs/releases/V4.8/V4_8_10-completion-report.md
- docs/releases/V4.8/V4_8_11-completion-report.md
- docs/releases/V4.8/V4_8_8-completion-report.md
- docs/releases/V4.8/V4_8_9-completion-report.md
- scripts/start-legacy.mjs
- server/model-connection.mjs
- server/model-escalation.mjs
- server/model-health.mjs
- server/model-rollout.mjs
- server/model-state.mjs
- tests/fixtures/model-routing-offline-cases.json
- tests/model-escalation.test.mjs
- tests/model-health.test.mjs
- tests/model-rollout.test.mjs
- tests/model-state.integration.mjs
- tests/model-state.test.mjs

## Final acceptance evidence and preserved boundaries

The starting 1,408-file snapshot remains immutable. Hash comparison shows no deleted files and no edits to src/, shared/, knowledge/, benchmark/, dependency lockfiles, acquisition modules, financial calculation/validation owners, Evidence rules or original golden fixtures. The sole modified pre-existing test file is tests/model-policy.test.mjs, extending its consumer boundary for the now-authorized rollout owner while continuing to forbid transport bypass. Exact JSON audit: artifacts/v4-8-8-11-audit-final.json. Runtime metadata/guard behavior changes are intentional; no claim of H0 zero-runtime change is made for this V4.8 implementation.

Linux deployment: reviewed snapshot passed 9 groups, exit 0, PASS at line 847 of artifacts/v4-8-11-deploy-final.log; SHA256 4dd262907be67a84b1ebb88a2e585d0695e3dcebc41bbfe9f8fa31dc31331d1f. Independent projects zhiheng-deploy-test-1789051154-28 and zhiheng-deploy-test-1789051491-28 removed their containers/volumes/networks on exit. Runtime schema 2 upgrades to an injected test-only 3, restores 2 with backup data, preserves an existing app on build failure and leaves app stopped after migration failure. Expected injected errors are not test failures. The later extension of the acceptance fingerprint to review/timeout/validation owners was covered by the final 735-test run; deployment infrastructure and default legacy behavior did not change. No global Docker prune or production deployment occurred.

Final state: requested=legacy, active=legacy, reasons=[]; CURRENT=V4.8; runtime framework/Knowledge=4.7, research contract=7, Mongo schema=2. V4.8.8–.10 accepted within stated internal scope; V4.8.11 offline work passes, live quality/production acceptance remains explicitly deferred. No V4.9 implementation or paid MAIN/PRO calls.
