# V5.0 benchmark and champion operations

Implementation Status: PARTIAL. The engineering paths exist; real full-research quality acceptance and production promotion remain unaccepted. CURRENT authorizes V5.0 work; the public 5.0 label does not certify a candidate model.

## Reproducible offline validation

From the repository root, with Node >=22.13 and installed project dependencies:

```powershell
node --test tests/*.test.mjs
node scripts/benchmark.mjs --kind text --out artifacts/benchmark-text
node scripts/benchmark.mjs --kind vision --out artifacts/benchmark-vision
```

The default suite is benchmark/fixtures/bootstrap-v1: eight synthetic text extraction cases and 48 byte-identical V4.9 Vision originals. Two profiles and two repeats produce 32 text and 192 Vision results. Simulation uses an isolated environment and mock Gateway transport. These outputs exercise transport, rendering, grading and persistence; they do not measure actual model accuracy. The reference answer is inaccessible to the live model task. A reference-output selfcheck is separately labeled and is not a model baseline.

Use a fresh output directory for a new run. `--resume` reuses exactly the saved suite, code, profiles, execution identity and repeats. Completed results are regraded before reuse. An uncertain reserved dispatch cannot be replayed; retain that run and start a separately identified run after investigating. A missing/corrupt live budget ledger blocks resume. Never delete reservations to regain budget.

Budget preparation and validation now run under the same exclusive runner lock before checking individual units, including a fully completed run. Missing or malformed ledgers cannot be skipped merely because there are no new requests. Restoring the original matching ledger permits a valid completed run to return its saved results without dispatch. Code changes still invalidate old run bindings; retain historical runs rather than rewriting their hashes.

The CLI rejects unknown/duplicate flags, missing values and extra positional arguments before reading a limit file, writing a run or dispatching a request. `--kind` accepts `text` or `vision`; `--repeats` is an integer from 1 to 20. Paid options require the explicit combination `--live --allow-paid --limits path/to/limits.json`; `--live false` is invalid. Without these flags, evaluation stays simulated. Use `pnpm test:release` for both repository inventory checks and the full V5.0 benchmark/champion/experiment/drift unit suite.

`benchmark/baseline.mjs` freezes complete single-profile runs to an exclusively created baseline file. It records runtime, policy, profile, suite, code, grader and result identities. `qualityAccepted` remains false until the separate comparison/operator process. Historical artifacts are retained; no automatic backfill or acceptance upgrade exists.

## Real comparison and admission

The supplied CLI is a **component extraction executor**. Running it live is insufficient for research champion admission. A genuine promotion needs a frozen full-research corpus, trusted execution receipts from the existing research/review pipeline, deterministic regrading and separately supplied semantic/operator review. No model may assert its own tool success, validation or delivery status. `executionScope: research-pipeline` must describe actual execution, not a relabeled component run.

The generic runner accepts a trusted server-owned executor. Its case contract covers all nine categories, but the bootstrap corpus has no full-pipeline quality coverage. Before paid execution, an operator must select the exact candidate/model endpoint, declared capabilities, applicable task classes and spend/request limits. Actual environment and credentials were not changed by this release.

An explicitly authorized component diagnostic can use `--live --allow-paid --limits path/to/limits.json`. The limit file uses the existing comparison owner's currency, budgetMinor, reservePerRequestMinor, maxRequests and timeoutMs fields. Reservations cap attempted requests and reserve estimated spend; they are not guaranteed provider billing ceilings. Costs stay null without reliable usage/pricing. No automatic or production shadow comparison runs.

The statistical policy requires at least 50 independent frozen fixture hashes per applicable task, at least two paired repeats, a 95% pass rate, zero critical candidate failures and a conservative 95% Wilson difference interval proving noninferiority within ten percentage points. Duplicate cases/repeats and unpaired coverage are rejected. Repeats do not inflate independent sample count. Lower cost cannot offset failed quality. These thresholds are versioned engineering admission criteria, not an empirical guarantee.

`createChampionPolicy` recomputes statistical admission. Evidence must bind exact run IDs and result hashes as well as plan bindings, suite, profiles/connections, effort, classifier, execution settings and code. Approval must separately bind evidence and rollout intent: policy ID, stage, percent and task scope. Code binding covers server/shared/benchmark code, dependencies and active Knowledge rules. Review format and effective deadlines are bound; key rotation alone does not change identity. Operator attestation is a trusted local administrative record, not a cryptographic proof of honest measurements. Protect registry and alert files with deployment filesystem permissions. In containers, explicitly mount approved registry/alert files at configured paths; the default image contains no approvals and does not make its ephemeral data directory a durable policy store.

## Disabled, dry-run, A/B and production

`MODEL_CHAMPION_ENABLED=false` and `MODEL_AB_ENABLED=false` are the shipped defaults. `MODEL_ROUTING_MODE=champion` alone cannot activate a candidate. Admission also requires a valid registry file, matching `MODEL_CHAMPION_POLICY_VERSION`, retained approved policy, required credentials, applicable task class and no matching invalidation.

Disabled and dry-run policies retain legacy dispatch and make no extra candidate calls. A/B requires its separate flag and a percentage strictly between zero and 100. Production requires 100. A new rollout percentage/stage needs a new intent-bound approval and policy ID. `saveChampionRegistry` preserves all prior policies; it permits changing only the active pointer and adding new immutable versions.

Only established creation-time job.mode is currently consumed for live job classification. Long-document, tool-workflow and review classifiers are available to explicitly signaled evaluation, but cannot be inferred from unknown job metadata. Do not advertise unmeasured task classes as champions.

New admitted jobs persist v3 selection before execution, with deterministic job/policy bucket, group, profile, effort, class/version, job time and configuration identity. Research, review and followup retain that same MAIN pin. Restart/retry never reassigns the group, changes cutoff or replays a completed tool receipt. Historical absent/v1/v2 states are preserved.

Approval is checked at job start/retry and before every subsequent Gateway call. Registry revocation, disabled flags, matching drift invalidation, or code/configuration change pause v3 calls while preserving the pin and checkpoint. Already dispatched HTTP calls are not forcibly cancelled by a file edit. Restoring a compatible approved policy permits continuation; switching the same job to legacy does not.

## Drift observation and rollback

After genuine approval, periodically collect another explicitly authorized comparable run. Invoke:

```powershell
node scripts/model-drift.mjs --baseline path/to/approved-run --current path/to/new-run --suite path/to/frozen-suite --registry path/to/registry.json --out path/to/observation.json
```

This command reads and verifies artifacts; it makes no model requests or registry changes. It emits a versioned hash-bound observation and never replaces a champion. Simulation cannot produce an actionable live invalidation. Missing evidence is inconclusive or rejected, never stable. The approved baseline binding, suite and task coverage must match.

Supply each of the five flags exactly once with a nonempty path. Unknown or duplicate flags, missing values and extra positional arguments are rejected before reading input artifacts or writing the observation. A rejected invocation preserves any existing report. Paths containing spaces must be quoted; paths beginning with `--` can be expressed as absolute paths.

An operator can configure `MODEL_CHAMPION_INVALIDATION_FILE` to consume a verified invalidation report. Only a report matching the exact policy ID and hash can close it. No scheduler, paid recurring run or automatic replacement was enabled. Scheduling is an explicit operational step with its own authorized limits.

For immediate rollback, disable champion routing and preserve registry, run artifacts and v3 jobs. New jobs use legacy; existing v3 jobs pause. Restore the previous binary only after accounting for its inability to execute v3 states. Do not strip pins or rewrite old jobs. See [schema](schema.md), [migration](migration.md) and [rollback](rollback.md).

## Configuration examples

The local and production templates each contain their environment's credentials, runtime controls, strategy flags and approval paths. Model identities, endpoints, capabilities and roles remain in the corresponding JSON model file. Startup loads one environment file per environment. Legacy variable parsing remains compatible, but the current templates do not split advanced settings into a second env file. Do not replace an existing environment or saved job pins. Approval paths are empty placeholders; activation still requires all existing gates. The public configuration snapshot describes new work, not live health or an existing job; it omits private policies, reasons, paths and inactive model names.
