# V4.8.4–V4.8.6 Second Review

## 1. Scope and finding

Second review of accepted router/Vision migration, complexity scoring and shadow policy; status PASS, CURRENT=V4.8, V4.8.7 unstarted. The 1,398-file review-start state, prior review and all earlier uncommitted accepted work are preserved in artifacts/v4-8-4-6-review2-baseline.json and artifacts/v4-8-4-6-review2-rollback/.

**P2 conditional input-isolation defect — fixed.** The evaluator copied own fields into an ordinary object and then read optional fields normally. If other code extended Object.prototype, omitted companyCount and nested reasoningFailureCount could inherit those values: an empty input scored 18 instead of remaining score 0 / level unknown. An inherited reasoningFailureCount getter was also invoked, allowing invented failure signals to produce a policy candidate. Two regression tests reproduced these failures before the fix.

Internal normalized input copies now use Object.create(null), including omitted/null groups. Public results remain ordinary objects. This is defense against ambient prototype extension; no repository write path or remotely exploitable pollution entry point was found, and no production incident is claimed. Weights, thresholds and actual model selection are unchanged.

## 2. Modified files

- server/research-complexity.mjs — remove prototype fallback from private input copies.
- tests/research-complexity.test.mjs — inherited values cannot supply missing observations.
- tests/model-policy.test.mjs — inherited getters cannot create failure signals/candidates.
- docs/contracts/model-gateway.contract.md — explicit own-field isolation semantics.
- docs/architecture/current-implementation-map.md — current owner and regression evidence.
- docs/releases/V4.8/DETAILED_INDEX.md — second-review navigation.
- MANIFEST.json — Harness hashes/sizes and report entry.

## 3. New files

Only docs/releases/V4.8/V4_8_4-6-review2-report.md. Ignored artifacts/v4-8-4-6-review2-* snapshots, helpers and logs are verification assets, not product files.

## 4. Removed files

None. All earlier tests, fixtures, goldens and completion/review reports remain intact.

## 5. Architecture review

Read active specs, system/current maps, model contract/invariants, research/Evidence invariants and ADR-002/012/014. Reviewed Gateway observation/snapshot boundaries, policy, complexity validation, Router/Vision cache/fallback/cancellation paths and the shared transport/error owners. Existing ownership is retained; no new subsystem or provider route. No additional confirmed defect was found in V4.8.4 transport wrappers. Earlier environment-snapshot fix and cross-stage golden tests remain in force.

## 6. Schema

No public output, input field, score version, RoutingDecision, persistence/checkpoint/API schema change. Internal null-prototype copies never become public normalized results. Framework/Knowledge stays 4.7; research contract stays 7.

## 7. Migrations

None. No database/data backfill, source refresh, Knowledge rewrite or version migration.

## 8. Environment

Windows PowerShell / Node 24.19.0 / pnpm 11.19.0. No dependency/lock/config/deployment edits, external provider calls or test servers. Tests temporarily install prototype fields synchronously and restore prior descriptors in finally before assertions; normal application state is not modified.

## 9. Compatibility and runtime impact

Normal input results and legacy/dry-run request behavior remain identical. Only the reproduced ambient-prototype case changes: inherited values/getters no longer become observations. Therefore the defensive behavior change is nonzero in that case; it does not change investment research rules or executable model routing. Explicit own fields remain authoritative; absent/null groups retain missingness. No new coercion, relaxed validation or accepted input type.

## 10. Resume / recovery / point-in-time

No job, source, checkpoint, cutoff or private continuation modification. Full-suite resume/recovery and original six-mode checkpoint golden assertions are retained; no cross-job model pinning is implemented.

## 11. Feature flags

Unchanged: MODEL_ROUTING_MODE=legacy by default, dry-run observes only, unsupported policy/unknown values remain legacy. No escalation, health or rollout flag.

## 12. Actual commands

```text
pnpm test
node --test tests/research-complexity.test.mjs tests/model-policy.test.mjs
node --test tests/research-complexity.test.mjs tests/model-policy.test.mjs tests/router-vision-migration.test.mjs tests/model-gateway.test.mjs tests/model-migration.test.mjs tests/model-call-inventory.test.mjs
node --test tests/harness.test.mjs
node scripts/check-model-call-inventory.mjs --baseline
git -c core.safecrlf=false diff --check
node artifacts/v4-8-4-6-review2-audit.mjs
```

Log prefix artifacts/v4-8-4-6-review2-. MongoDB/API/process integration, UI and deployment suites were not rerun because no corresponding implementation or transport changed. Earlier integration evidence is historical, not counted as this review's runs. No test was deleted, skipped or weakened.

## 13. Results

| Verification | Actual result |
|---|---|
| Baseline full suite | 623 passed; exit 0 |
| Pre-fix reproduction | 31 passed / 2 failed; exit 1; inherited observations and getter invocation |
| Affected subset after fix | 98 passed; exit 0 |
| Final full suite | 625 passed in 77 test files; exit 0 |
| Final standalone Harness | 7 passed; 465 packaged files match exact bytes/hashes; exit 0 |
| Model-call inventory | 1 adapter endpoint, 4 production owners, 10 semantic callers, 1 migrated diagnostic; historical hashes verified |
| Whitespace check | exit 0 |
| File hash audit | 7 modified / 1 added / 0 removed; 1,391 baseline files byte-identical |

Final runs have 0 failures/cancellations/skips/todos. Subset/Harness counts overlap the full suite and are not additional unique tests. Both failing regressions were retained and fixed. Scoring fixtures/weights, Gateway/adapter/parser/Router/Vision implementations, prior reports, financial/Evidence/Knowledge/acquisition code, dependency/lock/config/deployment files remain byte-identical to this review's baseline. Logs use baseline, repro, targeted, unit, harness, inventory and change-audit under the stated artifact prefix.

## 14. Benchmark evidence

Unchanged six-mode research wire/result/event/checkpoint goldens run under legacy and dry-run (24 pinned digests). Six router/Vision wire/result goldens likewise run in both modes (12 pinned digests), preserving cache behavior. The synthetic diagnostic runs offline. No live-provider quality/performance/cost calibration is claimed.

## 15. Security / privacy

Only caller-owned structured fields can supply complexity observations; inherited getter execution is removed from this boundary. No prompt, source, credential, URL or hidden reasoning is newly logged or persisted. This does not establish a repository-wide pollution exploit or sandbox arbitrary JavaScript proxies; broader process security is outside this fix. Accepted ADRs and enforced Evidence/review/financial rules are unchanged.

## 16. Rollback

Restore precisely the seven modified files from artifacts/v4-8-4-6-review2-rollback/ using the review2 baseline hashes, and remove only this report. Preserve the first review's configuration snapshot fix and all prior accepted work; do not reset to HEAD. No data rollback or deletion is needed. Reverting restores the documented inherited-field weakness.

## 17. Limitations

The uncalibrated 0–100 workload score versus early-saturating policy bands remains explicit debt, with no weight or threshold adjustment. Most automatic complexity signals remain unknown. No proof of live model quality, whole-program security, complete failure classification or safe cross-provider state transfer. Conditional hardening is not evidence of an observed production incident.

## 18. Deferred / stop

V4.8.7 telemetry, V4.8.8 health, V4.8.9 modelState and later escalation/rollout remain future. No V4.9/V5.x/V6.0 changes. Stop after this review with CURRENT=V4.8; no next subrelease is started.
