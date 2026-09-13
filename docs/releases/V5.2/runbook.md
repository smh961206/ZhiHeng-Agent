# V5.2 operations

V5.2.0–.10 engineering is implemented. The user explicitly continues pausing real-model acceptance. Both flags default false and no live acceptance artifact was created; no production flagship path is enabled.

## Configuration and admission

Optional MODEL_CONFIG_FILE roles are flagshipReview and flagshipJudge. Their profiles explicitly declare textInput=true, imageInput=false, streaming=false, toolCalling=false, jsonSchema=true, reasoningControl consistent with adapterOptions.thinking. Existing connection definitions hold baseUrl/apiKeyEnv; credentials never enter profile metadata.

Equivalent environment prefixes are LLM_FLAGSHIP_REVIEW and LLM_FLAGSHIP_JUDGE, with MODEL, BASE_URL, API_KEY, PROVIDER, CAPABILITIES (all seven capability fields as JSON) and THINKING (omit/disabled/enabled). No default model is chosen. FEATURE_FLAGSHIP_REVIEW / FEATURE_JUDGE alone cannot admit a role. FLAGSHIP_REVIEW_ACCEPTANCE_FILE / JUDGE_ACCEPTANCE_FILE must refer to matching operator-owned private artifacts. Suggested ignored paths: config/flagship-review.acceptance.json and config/judge.acceptance.json. Key rotation preserves connection identity; code/config/profile/approval changes require renewed acceptance.

The existing rollout owner requires a flagship-live-acceptance v1 artifact per purpose, evidenceKind live-model, exact flagshipRolloutFingerprint, at least 20 distinct fixtures and paired original outputs/calls. Each sample carries criticalErrors, correct and a reviewHash binding fixture/output/calls/assessment. Judge outputs are regraded with gradeJudgeCase; critical review outputs with validateReview. Candidate cases require correctness and zero critical errors; measured aggregate correctness must improve over baseline. Costs require complete observed receipts, one currency and an explicitly reviewed extraCostLimit. A routineObservation of at least 100 jobs must show <=5% flagship jobs. Operator review binds the entire evidence object and affirms dry-run, rollback and cost justification. These are trusted operator attestations, not cryptographic proof of honest evaluation. Synthetic test attestations are never deployable evidence.

## Runtime

New admitted jobs pin authorization and cutoff. Critical review is attempted at most once after repeated validated structural/action failures with known absence of data gaps. Missing dates/data, provider health errors, financial/reference failures and unfinished tools cannot escalate. Fully malformed review output with unknown gap status stays closed. Independent context has actual source blocks, complete tool results and finished draft; old model conversations and hidden reasoning are not transferred. The ordinary final review/evidence checks remain mandatory.

An admitted non-A job may use judge_core_conflict only after an existing review_valuation_models receipt for completed primary/cross-check calculations. A single tool call must supply explicit comparable L1/L2 and all evidence references. It cannot relabel a stress scenario as independent cross-check. It returns an advisory original selection or unresolved conflict; the Agent must still pass ordinary review. General completed core-claim comparisons have internal contract support, but no canonical Claim system or free-text report parser was added.

## Observation

Run node scripts/judge-benchmark.mjs --out <new-file.json> for frozen offline verification (12 synthetic cases, no paid calls). This verifies safety, not live quality.

Run node scripts/flagship-usage.mjs --input <cohort.json> --out <new-file.json>. Input has jobIds, calls, optional telemetryComplete, maxJobRate, minJobs and per-currency costLimits. Unknown telemetry stays inconclusive; the CLI cannot modify routing or impose a hard quota. Existing job cost panel includes critical-review and judge costs. Actual decision value stays unknown until independently evaluated.

## Recovery and limitations

Strict persistence precedes dispatch and settlement. Completed exact outcomes are revalidated and reused; uncertain receipts pause before ordinary Agent execution. Do not reset them to replay. At most one independent call per role per job is an idempotency/rare-path bound; reaching it does not remove evidence or make an invalid report pass.

Current timestamps must be explicitly known; limited/OCR/ambiguous/omitted material prevents independent dispatch. This can leave many existing jobs ineligible. Context bounds are conservative engineering limits. Automatic financial truth, arbitrary semantic correctness, production value/cost improvement and real rare-use rates are not certified by offline tests. Live acceptance remains paused by the user. See rollback.md and completion-report.md.
