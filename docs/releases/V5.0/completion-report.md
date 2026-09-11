# V5.0 engineering and acceptance report

Implementation Status: PARTIAL. V5.0.0–V5.0.13 engineering paths are implemented and local regression passes. Live full-research quality and production promotion are not accepted. No production champion or paid model call was activated.

## 2026-09-11：用户暂停真实验收

用户明确要求“暂停本轮真实验收，记录一下”。本轮真实模型对照、付费测试、人工质量验收及生产候选启用暂停，等待用户明确恢复。已有工程实现、868 项单元测试、17 项数据库测试、307 项界面场景、224 条模拟基准结果及部署验证证据保留；不得把暂停标记为真实质量通过或 V5.0 全部验收完成。

生产候选及 A/B 开关保持关闭。本次只更新状态文档和文档校验清单，不修改运行代码、实际环境、数据库、模型策略或已有基准结果。CURRENT 保持 V5.0。恢复时接续本报告末尾的待验收事项，并确认候选模型、冻结的完整研究样例和请求数／金额上限；不自动启动真实调用。

The user explicitly authorized progression through the entire release. Work followed the fourteen normalized subreleases; see [execution log](execution-log.md). This authorization allowed subsequent engineering while real-quality acceptance remained pending; it did not turn simulation into measured quality.

## Scope and behavior

The platform now has frozen benchmark cases, deterministic and governed semantic grading, a durable resumable runner, immutable baseline snapshots, an explicit second MAIN profile, isolated component comparison, paired statistics, task classification, immutable champion policies, job-level A/B pins, disabled-by-default rollout and strict drift observations. Existing Gateway, research/review, financial validation, Vision grading and checkpoint owners are reused. No parallel investment research store or provider-specific business workflow was added.

## Validation

| Verification | Result |
|---|---|
| Full unit suite | 868/868, zero failures/skips/cancellations |
| Real Mongo integration | 12 groups, 17/17 tests; disposable databases on 127.0.0.1:27029 |
| Final A/B restart after approval hardening | 2/2, both groups, original cutoff/tools preserved |
| Existing UI suite | 307/307 scenarios with local mocked API |
| Server-rendered routes | 5/5 |
| Host production build | Passed; entry bundle 478.17 kB, gzip 159.05 kB |
| Isolated Linux deployment | All nine groups passed: deploy, upgrade, persistent data, backup, rollback, health, stopped backup, build failure, migration failure |
| Final image after classification fix | Built successfully; offline container fingerprint matches local code across 191 owners |
| Text mock Gateway comparison | 32/32 (8 cases × 2 profiles × 2 repeats) |
| Vision mock Gateway comparison | 192/192 (48 originals × 2 profiles × 2 repeats) |
| Immutable baseline-arm replay | Text 16/16, Vision 96/96; no extra model calls |
| Statistical promotion | Correctly rejected for every task: simulation/insufficient samples |
| Whitespace/diff check | Passed |

Exact run/fixture/code/result hashes, per-task statistical reasons and file lists are in [validation-results.json](validation-results.json). Logs and raw local artifacts are retained under artifacts/v5-validation; final benchmark and baseline artifacts are under its final directory. The initial UI run had three version-label expectation failures; corrected public-version expectations then passed all 307, without weakening behavior assertions. The initial Ubuntu deployment attempt lacked Docker integration; the disposable Docker CLI runner passed Linux verification and cleaned its independent Compose project/volumes. The earlier incomplete Vision selfcheck remains preserved, not claimed as a passing run. No test was deleted, skipped or weakened to admit a candidate.

## Required implementation accounting

1. Release: V5.0.0–.13 engineering; acceptance remains PARTIAL for live baseline/comparison/promotion/drift observation.
2. Modified files: 49 existing files, including Catalog/connection/adapter/Gateway, model-state/routing/rollout/telemetry, research-create, deployment packaging, example configuration, scripts registration, public version label, UI expectations, README, architecture/contracts/invariants and release documentation. Complete paths are in validation-results.json.
3. New files: 144, including benchmark contract/loader/graders/semantic/runner/baseline/executor/statistics/registry modules, fixture importer and frozen bootstrap corpus, champion/classifier/experiment/drift owners, CLIs, scoped tests and release reports/runbook. Complete paths are in validation-results.json.
4. Removed files: none.
5. Architecture: local evaluation records are separate from canonical research objects. Provider dispatch remains behind the existing Gateway adapter. Existing Vision quality and budget reservation owners are reused. No distributed service or multi-agent production architecture.
6. Schema: versioned local benchmark/policy/alert objects v1; explicit ModelProfile v4; additive private modelState v3 for new admitted jobs. Existing research financial schema and absent/v1/v2 job states remain intact. [Schema analysis](schema.md) resolves normalized templates' “no persistent schema change” against required persisted A/B metadata explicitly.
7. Migrations: no Mongo collection/index migration, destructive rewrite, backfill or database downgrade. Existing jobs are never assigned fabricated historical experiment metadata.
8. Environment: only example files gain opt-in fields; actual .env and running production settings are unchanged. Docker packages benchmark helpers and the lockfile needed for approval fingerprints. No dependency version or Knowledge/framework version changes.
9. Compatibility: default legacy behavior stays available. Configuration/code changes invalidate prior approval; historical V4.8/V4.9 acceptance files are retained and may require fresh binding after these shared-owner edits. The public platform label is 5.0, separate from framework/Knowledge 4.7 and actual model acceptance.
10. Resume/recovery: fixed group, profile, effort, source cutoff, private continuation and completed tool receipts survive process restart. Revocation or incompatibility pauses the next v3 call without changing those records. Unknown benchmark dispatch outcomes cannot replay.
11. Feature flags: MODEL_CHAMPION_ENABLED=false and MODEL_AB_ENABLED=false by default; legacy routing remains the shipped default. Explicit matching policy version, approval, registry, capabilities and credentials are required. No hidden shadow calls.
12. Tests executed: staged contract, provenance, transport, rollout, statistical, drift and restart tests, plus final unit, real Mongo, UI, route, build and deployment suites listed below.
13. Results: final results are recorded below with counts and known environmental failures; no real model quality claim follows from mock tests.
14. Benchmark: 56 component cases, two profiles, two repeats, 224/224 passing simulated results. Only eight text cases are synthetic missing-data extraction; the other 48 reuse V4.9 visual originals. Per-task live minimum samples and full-research quality are not satisfied by this corpus. Baseline replay artifacts retain original mock result provenance and remain qualityAccepted=false.
15. Security/privacy: no credentials, raw model reasoning or full environment enter public evaluation artifacts or telemetry. Hashes provide integrity, not proof of honest operator review. Approval/alert files are trusted administrative inputs and require filesystem access control. No new external endpoint or automatic paid task.
16. Rollback: disable champion/A-B and retain all policies, runs and v3 records. New jobs return to legacy; existing v3 jobs pause until compatible approval/configuration is restored. Older binaries cannot execute v3. See [rollback](rollback.md).
17. Known limitations: genuine frozen full-research evaluation, human semantic assessment, candidate quality acceptance, periodic live observation and production activation remain outstanding. The extraction CLI cannot be relabeled as a full-pipeline benchmark. Only known job.mode currently drives live job classification. Statistical thresholds are conservative versioned engineering criteria, not empirically calibrated guarantees. In-flight HTTP calls are not cancelled by a registry file edit.
18. Deferred future releases: automatic unreviewed model replacement, online self-modifying policies, vector retrieval as financial truth, distributed orchestration and post-V5 investment intelligence features remain out of scope. Remaining live-quality work belongs to V5.0 and is not silently deferred to a future release.

## Remaining V5.0 acceptance

Select and explicitly authorize the real MAIN candidate, applicable task classes and request/spend limits; provide/review a frozen full-research corpus and reference evidence; execute both profiles through the existing research/review pipeline with actual receipts; meet the paired per-task statistical gates; record artifact- and intent-bound operator review; then exercise the approved A/B/production policy and collect a post-approval drift observation. No current artifact authorizes those production actions. [Runbook](runbook.md) specifies controls and rollback.
