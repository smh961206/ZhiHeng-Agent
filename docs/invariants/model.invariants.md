# Model Invariants

## V5.0 local enforcement

Benchmark outputs cannot introduce model-authored tool/validation receipts, hidden reasoning, invented facts, future citations or missing-as-zero without failing their scoped graders. Exact frozen artifacts and paired independent sample gates precede cost. Simulation cannot admit a champion or produce a live drift invalidation. v3 jobs pin one group/profile/effort; code/configuration/registry changes pause later calls without rewriting cutoff, completed tools or original selection. Tests in benchmark and model-champion/model-experiment/model-drift suites cover these local guards; genuine model quality still requires measured full-pipeline evidence and operator review. Existing global TARGET labels remain unchanged.

V4.9 local evidence: Vision request/result/capability/fallback/policy tests enforce explicit image capability, user-only images, no private continuation, fixed independent fallback bounds and unchanged unverified trust. Candidate/legacy/no-state jobs preserve their selected identity through activation and rollback; tests/vision-state.integration.mjs exercises real process restart, safe rollback pause, key rotation and no duplicated completed tools. Simulated comparisons cannot activate policy. These local tests do not promote all TARGET invariants to global enforcement or certify real model quality.

V4.8.11 executor enforcement: resume of a different run/arm/mode/input must fail before a model request or new budget reservation. A frozen quote or filing directory must not bypass Agent's existing official-report coverage gate. The CLI parent/worker and tests/model-comparison.test.mjs enforce these local comparison boundaries; valid compatible history is retained. This does not certify the semantic truth of operator-supplied source labels or authorize the deferred live pilot.

V4.8.8–.11 review evidence: actual Agent tests cover refreshed Vision material after a model transition and compatible review resume; existing escalation/private-reasoning guards remain intact. Executor tests reject aliased case IDs, changed corpus/output provenance and new arms after a UTC day change. No invariant is weakened or promoted to globally ENFORCED solely by these tests; real quality acceptance remains pending. See [review report](../releases/V4.8/V4_8_8-11-review-report.md).

- INV-MDL-001 [TARGET V4.8]: business code does not infer capability from concrete model names.
- INV-MDL-002 [TARGET V4.8]: data absence is never a model escalation reason.
- INV-MDL-003 [TARGET V4.8]: 429/5xx/transport failures are provider-health failures, not automatic intelligence escalation.
- INV-MDL-004 [TARGET V4.8]: do not switch providers/models between assistant tool_calls and execution of those calls.
- INV-MDL-005 [TARGET V4.8]: hidden provider reasoning is not transported across providers.
- INV-MDL-006 [ENFORCED]: reasoning_content is never user-facing/public telemetry.

## V4.8.5 complexity evidence

The pure evaluator preserves missing-data, provider-failure and format-failure counts as non-scoring signals; it never infers reasoning failure from absence, aggregate retry counts or arbitrary error text. Unknown observations remain null. Tests prove score invariance for these non-scoring fields and prevent production imports/calls in V4.8.5. This supports INV-MDL-002/003 locally but does not implement escalation or globally relabel target policy/state invariants as enforced. The score is a heuristic workload descriptor, not a model-quality or verified-fact judgment. Existing research/Evidence validation obligations remain unchanged.

## V4.8.6 dry-run evidence

Policy reuses zero-point missing/provider/format signals; no aggregate error is classified as reasoning failure. Gateway logs candidate and actual legacy execution profile separately, never passes candidates into transport and excludes prompts/hidden reasoning from decisions. Six-mode dry-run golden comparisons cover exact requests, deliveries, events and checkpoints; observer failures cannot fail or replay a model call. Mode A candidates stay MAIN/low. INV-MDL-002/003 have local policy coverage, but production escalation and modelState are still future, so global TARGET labels are unchanged. Existing ENFORCED research/Evidence/review/cutoff rules remain mandatory.

## H0 enforcement evidence and limits

Current enforcement: model-stream retains reasoning only in private messages; job-stream publicJob removes checkpoints; streaming and research-resume tests cover public leakage. model-request retries pre-response transport failures without tier switching. Cross-provider state isolation and catalog/routing policies remain V4.8 targets. No new model guard is imposed on legacy code in H0.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.

## V4.8.1 evidence

Catalog serialization and schema tests in `tests/model-catalog.test.mjs` exclude credentials/URLs and require explicit capability fields, preserving unknowns. Vision catalog metadata and runtime readiness reuse the same legacy image predicate, tested against the previous truth table. This does not enforce INV-MDL-001 through INV-MDL-005: business calls are not migrated and state isolation/policy are still future work. INV-MDL-006 remains unchanged; no reasoning or public telemetry field is added.

## V4.8.2 evidence

Gateway responses/deltas exclude hidden reasoning; explicit private continuation access remains server-only. Gateway tests cover this separation, mandatory image/tool capabilities, malformed/truncated/refused responses, safe errors and cancellation without stream replay. Provider-specific reasoning defaults are confined to the new adapter. Existing business calls remain direct; INV-MDL-001–005 are not relabeled globally ENFORCED. A private continuation accessor is not proof of cross-provider state safety; modelState/pin validation remains V4.8.9. No invariant obligation is weakened.

## V4.8.3 evidence

Agent's research/review/followup calls now use Gateway and no longer own a provider endpoint or infer model capability. Static tests enforce that migrated boundary and prohibit adapter bypass; router/Vision remain mapped exceptions until V4.8.4. Fixed connection identity across format negotiation, safe retry/heartbeat callbacks and private continuation are covered by migration tests; no escalation, policy, usage persistence or checkpoint modelState is added. Six-mode golden request/result/event/checkpoint hashes match the pre-migration baseline. Existing financial/Evidence/review gates remain unchanged, and INV-MDL-001–005 are not claimed as globally ENFORCED. INV-MDL-006 continues to apply to both normalized Gateway results and Agent public history.

## V4.8.4 evidence

All mapped production callers and the synthetic diagnostic use Gateway; static tests reject direct endpoints/adapter bypass and model-name branches in migrated wrappers. Vision readiness reads Catalog's declared image capability; provider-specific switches remain inside configuration/adapter owners. Router/Vision failures retain one attempt and existing rules/OCR fallback, with no model escalation. The legacy-router-vision option accepts only omitted JSON role metadata, preserving strict finish/refusal/content guards. Tests cover secret-free errors, limits, cancellation and exact prior wire/results. INV-MDL-006 remains enforced; policy/state invariants are not relabeled globally merely because call-site migration is complete. No research/Evidence invariant is weakened.

## V4.8.7 telemetry evidence

ModelCall uses a strict field whitelist, safe categories and per-field provider/unknown token sources. Prompt/reasoning/secret redaction and isolated job attribution are tested. Missing usage is not free/zero; provider failures retain availability categories, without escalation. No existing ENFORCED research/Evidence/review/cutoff obligation changes.

The V4.8.7–.9 review tests both deadline reason forms during terminal telemetry writing, retaining timeout/recovery semantics without request replay. Preflight records keep known attribution without fabricating unknown profile identities. Twelve asynchronous-writer golden comparisons cover research wire/delivery/events/checkpoints and router/Vision wire/results/cache with telemetry actually enabled. This does not implement health selection or checkpoint modelState; INV-MDL-003/004/005 retain their existing TARGET scope.

Second review adds three regression cases for mutation of the caller-owned request.signal during terminal telemetry writing. Gateway finalization retains the dispatched signal identity, preserving original timeout/cancellation and ignoring unrelated replacement signals/getters. This closes an in-memory API consistency gap; no new global policy/state invariant is claimed as enforced.

Post-deployment V4.8.7 review adds real Mongo coverage for concurrent duplicate terminal writes, late started writes, per-job summary isolation, and deletion interleaved with in-flight writes. Explicit zero/unknown usage, separate currencies and late rejection handling also have additional tests. These tests pass against unchanged runtime code; concurrent execution is coverage, not a proof of all possible interleavings or lossless telemetry.

## V4.8.8 accepted health boundary

CURRENT internal: server/model-health.mjs owns bounded recent availability outcomes and cooldown; server/model-gateway.mjs selects only explicitly quality-approved same-tier candidates after request capability checks; server/model-adapter.mjs remains the sole endpoint/identity owner. Default legacy/dry-run routing stays unchanged. Tests: tests/model-health.test.mjs plus legacy migration goldens. Explicit pins and any assistant/tool/private continuation block switching; failures/partial responses are not replayed. Availability never becomes reasoning escalation. No accepted ADR or Evidence/research rule changes. Production fallback and measured candidate quality remain unavailable until explicitly configured and accepted; no tier is inferred from names. Full modelState enforcement remains .9.

## V4.8.9 modelState — CURRENT

Owners: server/model-state.mjs, server/model-connection.mjs, existing research-create/resume/retry, Agent/Gateway and private storage/public filters. New jobs/checkpoints pin mode/policy, profile/model/opaque endpoint identity and effort with empty escalation history. Absence alone retains historical legacy reads; corrupt or incompatible present state throws before dispatch/tool/retry acquisition. Key rotation does not change identity. Gateway verifies custom Catalog dispatch against pins; process-local job scopes isolate concurrent calls. No cross-provider escalation or canonical ResearchState is introduced. New jobs with unusable checkpoints refuse automatic reacquisition. Tests: tests/model-state.test.mjs and tests/model-state.integration.mjs, including actual process exit/restart with MongoDB and public-list exclusion. Current profile metadata is not hidden reasoning and is nevertheless private. Historical TARGET gaps remain distinguished from these local enforced pin guards.

## V4.8.10 internal safe escalation — CURRENT

ModelProfile v2 binds main/zai/glm-5.3-flash and pro/deepseek/deepseek-flash explicitly; v1 remains legacy. server/model-state.mjs validates private policy state v2 and pins actual connection identity/effort, while server/model-escalation.mjs coordinates acknowledged checkpoint transitions. Existing Catalog/Gateway/adapter/context and Agent owners remain. MAIN low→high→PRO high→max only follows two explicit model-format/JSON-argument failures, with all pending tools completed. Mode A/data gaps/health/financial validation do not escalate. Raw assistant reasoning is never transferred; actual evidence/tool context is rebuilt with existing window/omission semantics. Strict checkpoint persistence precedes the next call. Existing budgets/validation/cutoff remain unchanged. Production default stays legacy and paid quality acceptance is deferred by user; offline tests are not permission to activate policy. Tests: tests/model-escalation.test.mjs and tests/model-state.integration.mjs. Full target rollout remains .11.

## V4.8.11 rollout gate — PARTIAL release acceptance

CURRENT code: server/model-rollout.mjs validates an operator-owned live-model-comparison report against exact model/connection/configuration and model-owner code fingerprints. At least 50 unique live cases, all six modes, passing candidate delivery/citations, zero critical fact errors, dry-run and rollback acceptance are required. Offline fixtures, missing credentials/report, changed model/code, duplicate or incomplete cases fail closed to legacy. A trusted local report is operator attestation, not cryptographic proof of honest evaluation.

Only an accepted new policy job consumes existing complexity recommendations; Mode A stays MAIN/low, unknown complexity stays legacy. An optional initial field in modelState v2 pins the initial step; absence retains .10 MAIN/low. Escalation receipts must be contiguous from that step. Business callers still do not select provider names, and all endpoint traffic stays in the single Gateway adapter. Existing policy checkpoints pause after production rollback; they are not rewritten or resumed on a different model. Public routing labels reflect the actual active analysis profile without exposing private state.

Offline validation: tests/model-rollout.test.mjs and tests/fixtures/model-routing-offline-cases.json run 60 baseline/candidate transport safety comparisons plus gate/rollback tests. They are not research-quality evidence. User deferred all paid comparison and required legacy; live acceptance and production rollout therefore remain pending. A one-command legacy server entry exists: pnpm start:legacy after stopping the previous server instance. It overrides inherited mode without editing .env or deleting records. No V4.9 or unified V5 benchmark platform is implemented.

## 2026-09-11 模型名称配置更新

按用户明确要求，当前分析、PRO 档及默认视觉模型统一使用 `deepseek-flash`；MAIN 绑定与路由、升级和验收门槛不变。以上 CURRENT 绑定名称反映本次更新，不代表历史付费质量验证已完成。历史任务模型身份及验收记录不回写；详见 [变更报告](../releases/V4.9/model-name-unification-20260911.md).
