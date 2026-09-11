# V4.8.11 comparison executor completion report

Status: CURRENT offline executor accepted. Live quality acceptance remains PARTIAL. User authorized completing the executor and offline validation before selecting paid pilot cases and a budget; no paid calls are authorized or performed here. CURRENT=V4.8; default legacy retained.

## 1. Implemented scope

Isolated fixed-material legacy/candidate research comparison, read-only preflight, durable request reservations, private checkpoint recovery, actual Agent validation, result integrity hashes, and separate human-reviewed acceptance export. This extends V4.8.11 only. It is not a universal benchmark platform or automatic semantic Judge.

## 2–4. File inventory for this task

Modified: package.json; tests/model-policy.test.mjs; docs/architecture/current-implementation-map.md; docs/contracts/model-gateway.contract.md; docs/releases/V4.8/subreleases/V4_8_11-policy-mode-rollout-gate.md; docs/releases/V4.8/V4_8_11-completion-report.md; MANIFEST.json.

New: scripts/model-comparison.mjs; scripts/model-comparison-worker.mjs; tests/model-comparison.test.mjs; tests/fixtures/model-comparison-offline.json; tests/fixtures/model-comparison-offline-limits.json; docs/releases/V4.8/model-comparison-runbook.md; this report. Seven new, seven modified, zero removed. Existing uncommitted V4.8.2–.11 work is preserved. Ignored artifacts contain only local logs and synthetic run outputs.

## 5. Architecture

Each arm runs in an isolated process through existing runAgent, Model Gateway, deterministic financial tools, Knowledge snapshot binding, review and delivery. No new provider client/endpoint. The worker is an explicit additional offline/internal policy evaluator consumer in the architecture test; all other consumer and transport restrictions remain. Production server files are unchanged in this task.

Candidate initial selection uses mode and actual plan historyYears exactly as the accepted rollout path, so B can start PRO/max; it is not forced to MAIN/low. Model-state compatibility and escalation continue to use existing owners. Frozen acquisition replays only provided source text; disabled search and unavailable original assets remain gaps. Existing financial/Evidence/review rules are not changed or bypassed.

## 6–7. Schema and migrations

New local artifact format version 1: run.json, private arm checkpoint envelopes, result records, comparison summary and artifact-bound manual review input. These are not canonical research data. No Mongo/schema increment, no database connection/migration/backfill, no production persistent type change. Existing additive modelState/checkpoint readers are reused.

## 8. Environment

package.json adds test:model-comparison only; dependency versions/lockfile and actual .env are untouched. Default CLI execution is offline and uses synthetic connection configuration; the offline dispatch path cannot invoke native fetch. Live execution separately requires curated inputs, credentials and --live --allow-paid. Every worker pins legacy environment without changing the parent environment or production process. No application server or external test services are needed.

## 9–10. Compatibility and recovery

Production runtime behavior change = 0 for this executor task: no server/shared/src/Knowledge body change. New CLI behavior exists only when explicitly invoked. Fixed inputs and full relevant code/Knowledge/dependency/configuration fingerprints prevent silent resume drift; output hashes prevent unnoticed edits to completed arms. Key rotation is allowed. Completed arms never repeat. Incomplete arms stop the run and require explicit resume/retry; missing/incompatible checkpoints refuse automatic reacquisition. The original cutoff is appended explicitly to the research request and pinned in the corpus; unprovided facts remain missing.

Reservations survive failed/unknown requests. A crash can leave an exclusive lock, an uncertain charge or an interrupted checkpoint write; recovery fails closed and requires inspection. Cross-UTC-day new-arm resume is intentionally refused to keep the existing currentDate prompt consistent across comparison arms. No historical production job is read or rewritten.

## 11. Flags and controls

Default offline, explicit --live plus --allow-paid, explicit --resume / --retry-incomplete. A per-run request count and operator-estimated monetary reservation limit are recorded before each HTTP attempt. No cost-based routing is added. The money limit is not a verified supplier billing ceiling: output/reasoning billing may be unknown, so strict currency caps require separately verified provider-side controls. No amount has been approved for a paid pilot.

## 12–13. Tests and results

Baseline: node --test tests/model-rollout.test.mjs tests/model-policy.test.mjs tests/model-state.test.mjs — 84 passed, zero fail/skip/cancel.

New executor suite: node --test tests/model-comparison.test.mjs — 12 passed, zero fail/skip/cancel. Coverage includes all six real Agent paths with mock responses, same-input baseline/candidate, actual validation, private reasoning separation, initial MAIN/PRO choice, durable budget failure, retry/uncertain spend, no network beyond model scope, rejected paid invocation without authorization, lock exclusion, checkpoint reuse, input/config drift, artifact edits, explicit human quality attestations and unchanged production gate. A final review also closes/aborts the received response when the durable receipt write fails, retains the prior reservation, and cleans up child-process timeout handlers on spawn failure.

Final full-unit and CLI evidence is recorded below. Earlier failures: one test used an unsupported model alias as a configuration-change probe; corrected to a changed endpoint, preserving Catalog restrictions. An intermediate full run had 744/746 passes with only a not-yet-written report link and stale Harness manifest; both were document publication ordering issues. No failing test was removed/skipped and no runtime validation was weakened.

| Actual command | Result |
|---|---|
| pnpm test | 747 passed, 0 fail/skip/cancel; exit 0 |
| node --test tests/model-comparison.test.mjs | 12 passed, 0 fail/skip/cancel; exit 0 (included in 747) |
| pnpm test:model-comparison check --plan tests/fixtures/model-comparison-offline.json --limits tests/fixtures/model-comparison-offline-limits.json | valid six cases / 12 arms; no requests; exit 0 |
| pnpm test:model-comparison run --plan tests/fixtures/model-comparison-offline.json --limits tests/fixtures/model-comparison-offline-limits.json --out artifacts/model-comparison-offline-accepted | all six pairs completed; 36 mock attempts; exit 0 |
| same run command with --resume | completed arms reused; cumulative attempts still 36; exit 0 |
| read-only actual .env modelRolloutStatus | requested=legacy, active=legacy, reasons=[] |

Logs: artifacts/model-comparison-{baseline,targeted-final,full-unit-final,cli-check,cli-run-final,cli-resume-final}.log. Final run artifacts: artifacts/model-comparison-offline-accepted/comparison.json. Final Harness manifest contains 476 entries. UI/MongoDB/deployment suites were not rerun for this CLI-only task; their earlier passing counts in the prior report are not claimed as new execution evidence. No production code or service is changed by this work.

## 14. Benchmark evidence

Six synthetic mode cases × two arms, 12 research executions and 36 mocked HTTP attempts in a complete CLI run. This proves executor plumbing with the existing review contracts, not GLM/DeepSeek reasoning quality. Output qualityAcceptance=false, citationPassed=null, criticalFactErrors=null, actualCost=null. No live or paid benchmark score is claimed. Synthetic gate-validator objects used in unit tests are explicitly labeled and deleted; no acceptance file is installed or produced from them.

## 15. Security/privacy

No keys logged/persisted, no MongoDB or acquisition network, no public new endpoint. Request limiter checks the existing configured model connection/model/credential match, POST and redirect refusal before dispatch. Prompts/evidence will leave the machine only after explicit future live authorization. Public result artifacts omit private messages, while the separately protected private checkpoint may contain provider reasoning needed for compatible continuation; do not share it. File modes are requested as 0600/0700; Windows directory ACL must be controlled by the operator. The gate relies on honest local human review, not cryptographic proof of semantic correctness.

## 16. Rollback

Stop the CLI, preserve its checkpoints/reservation ledger, remove the new script entry and these task-specific files/doc additions if needed. Restore only this task's changes, never reset the earlier accepted uncommitted work. No runtime deployment, database rollback, source deletion or .env rewrite is needed. legacy stays active regardless of executor artifacts until a separate approved production configuration change.

## 17–18. Limitations, pilot proposal and deferred work

Text corpus only; Vision/OCR and dynamic collection quality remain outside the comparison. Metadata cutoff checks do not prove all source text/model statements are point-in-time safe; human review must verify this. Genuine real-world cases and their reference facts remain to be curated. Proposed initial pilot is one A screen and one B five-year research case, four research executions in total, followed by C–F and >=50 distinct cases if separately authorized. Exact companies, source archives, service availability, price assumptions and budget are not yet selected. No paid testing, automatic policy activation, V4.9, Judge or Champion/Challenger work occurred.
