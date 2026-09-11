# V4.8.7 Deployment Acceptance

## 1. Release and outcome

2026-09-10: V4.8.7's outstanding Linux deployment gate passes, following explicit user request for deployment acceptance and approved Docker execution. V4.8.7 is accepted with the [first review](V4_8_7-9-review-report.md) and [second review](V4_8_7-9-review2-report.md) fixes. CURRENT stays V4.8. This task performs deployment verification and updates evidence only; no V4.8.8/.9 implementation or production release deployment.

## 2. Modified files

MANIFEST.json; docs/releases/V4.8/DETAILED_INDEX.md; docs/releases/V4.8/V4_8_7-completion-report.md (additive status update); docs/releases/V4.8/subreleases/V4_8_7-model-usage-telemetry.md; docs/releases/V4.8/subreleases/V4_8_8-health-routing-v1.md; docs/releases/V4.8/subreleases/V4_8_9-checkpoint-modelstate-compatibility.md; docs/architecture/current-implementation-map.md; docs/architecture/04-model-system.md.

## 3. New files

This report. Ignored artifacts/v4-8-7-deploy-acceptance-* contain local audit snapshot/helpers and logs. The previously prepared artifacts/v4-8-7-deploy-runner.sh was reused unchanged.

## 4. Removed files

No repository file deleted. The integration script removed only its temporary Linux work directory, independent Compose containers, volumes and network. Docker build cache/test image tags are retained by the existing script; no global image pruning performed.

## 5. Architecture

No runtime architecture change. Reviewed the actual Dockerfile, deploy.sh, compose.production.yaml, deployment integration script, active specification and existing schema/rollback contract. Tests exercise the same build, migration, health, backup and rollback owners used by deployment; no parallel deployment mechanism was added.

## 6. Schema

The repository remains at Mongo schema migration 2. In the disposable copy only, the existing test appends migration 3 and verifies count 3 after upgrade, then count 2 after restoring the backup. model_calls job/time index is included in backup/restore logs. No schema changes in the real repository or existing research database.

## 7. Migration / data

The original test probe value survives additive upgrade. Rollback restores its previous value, removes the post-upgrade-only collection, and restores the old schema/image pair. These are disposable test data. No production database migration, backfill, restore or deletion.

## 8. Environment / authorization / isolation

Linux 6.18.33.2-microsoft-standard-WSL2, Docker CLI image docker:27-cli, Compose v2.33.0; built application reports Node v24.21.0 and Dockerfile pins pnpm 10.15.1. The temporary runner mounted the repository read-only at /source and the host Docker socket for the authorized test. Files were copied into the runner, then into the integration script's mktemp directory; only shell-copy CRLF normalization and existing test injections occurred there.

Independent project: zhiheng-deploy-test-1789047731-28. APP_PORT=0 selects a random loopback port. Named data volumes belong only to this project. Existing zhiheng-agent-mongodb-1 and zhiheng-v4879-test-mongo were not targets and remained running afterward. No actual .env, dependency/lockfile or runtime configuration edits.

## 9. Compatibility / runtime delta

Runtime behavior change for this deployment-verification task is 0. Hash audit immediately after the Linux run confirms all 1,406 baseline repository files unchanged, with zero additions/deletions before documentation updates. The accepted V4.8.7 feature itself adds telemetry as described in its implementation/review reports; this task adds no research, financial, Evidence or Knowledge behavior.

## 10. Recovery / point-in-time

Deployment rollback is tested with disposable data only. Build failure preserves the running application; migration failure keeps the application stopped and retains the previous-image marker. No research checkpoint, private tool history or cutoff modification. The unchanged current code also has the previously passing real-process resume integration evidence in the second review.

## 11. Feature flags

No new/default flag changes. MODEL_TELEMETRY_ENABLED and legacy/dry-run routing semantics remain unchanged. Health routing and persistent modelState remain future.

## 12. Executed commands

```text
docker run --rm --name zhiheng-v487-deploy-test --mount 'type=bind,source=D:\Projects\ZhiHeng Agent,target=/source,readonly' --mount 'type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock' docker:27-cli sh -c 'apk add --no-cache bash coreutils util-linux >/dev/null && sed "s/\r$//" /source/artifacts/v4-8-7-deploy-runner.sh > /tmp/runner.sh && bash /tmp/runner.sh'
# Runner ultimately executes the unchanged test in its Linux copy:
bash /runner/tests/deploy.integration.sh
pnpm test
node --test tests/harness.test.mjs
node artifacts/v4-8-7-deploy-acceptance-audit.mjs
git -c core.safecrlf=false diff --check
```

Read-only Docker ps/volume/network queries used the exact Compose project label to verify cleanup. No rerun of UI/routes or Mongo integration in this task; no code changed since the second review's passing Mongo 7/7 and telemetry/Knowledge/resume 3/3. Those are previous evidence, not new runs.

## 13. Actual results

Linux integration: **one complete script, nine check groups, exit 0**. Actual final marker: `PASS: Linux deploy, upgrade, persistent data, backup, rollback, health checks, stopped backup, build failure, migration failure`. No assertion removed, skipped or weakened. The RUN false and injected migration exception are intentional checks; the script verifies their required protective outcomes and then passes.

Fresh full unit suite: **648/648**, exit 0, zero failures/skips/cancellations/todos. Log: artifacts/v4-8-7-deploy-acceptance-unit.log. Final standalone Harness: **7/7**, exit 0, including all **469** packaged byte/hash entries and document links (artifacts/v4-8-7-deploy-acceptance-harness.log). Whitespace diff check passes. Final audit confirms eight modified documentation/manifest files, one new report, zero deletions and no runtime/config/test changes (artifacts/v4-8-7-deploy-acceptance-audit-result.json). Prior integration evidence is explicitly separated above; subset counts are not added to the full unit count.

Complete deployment log: artifacts/v4-8-7-deploy-acceptance.log. SHA-256: f3186c18cce9f90a45279cec3e1382a018e8b862431d8665718a8f9f37497b7c. PASS appears at line 867. Post-run queries found no project containers, volumes or networks, and no runner container; both pre-existing Mongo services remained running.

## 14. Benchmark

Fresh full unit run includes all existing pinned legacy/dry-run and asynchronous-telemetry research/router/Vision golden cases. No fixture changed. No live-provider quality/cost benchmark, OCR runtime certification or unified benchmark platform claim. The container's existing ignored-build-script warnings did not prevent building or these deployment checks; dependency policy was not changed.

## 15. Security / privacy

The previously rejected socket operation was approved for this explicit deployment task; no approval bypass. Only example configuration and disposable test data are used. No real model credentials or calls, no prompt/reasoning exports, no real research DB access. Host Docker access is confined operationally to the reviewed script and exact cleanup verification; it is not a sandbox guarantee provided by the socket itself.

## 16. Rollback

For this documentation-only task, restore the eight changed files from artifacts/v4-8-7-deploy-acceptance-rollback/ and remove this report after checking for later edits; preserve prior uncommitted work. The actual deployment rollback test passed. V4.8.7 operational feature rollback remains disabling telemetry while retaining schema v2 compatibility; never delete migration history to force a downgrade of real data.

## 17. Limitations

This is isolated deployment acceptance, not a rollout to a production server or a live-provider research run. UI/routes and Mongo integration were not newly rerun here. Prior reports' pending-approval paragraphs remain historical; this addendum closes that blocker. Existing best-effort telemetry limitations remain documented and unchanged.

## 18. Next stage / stop

V4.8.7 acceptance is complete. V4.8.8 is the next authorized implementation; V4.8.9 follows only after .8 acceptance. Both remain FUTURE/unimplemented. CURRENT remains V4.8. Stop after this deployment acceptance and document verification; no .8/.9, .10/.11 or later capability implemented in this task.
