# V4.8 — Model Gateway Foundation

Implementation Status: FUTURE at the H0 baseline. CURRENT selects the next authorized release; it does not establish implementation or acceptance.

## Accepted progress

V4.8.0 call inventory is complete: [inventory](model-call-inventory.md), [acceptance report](V4_8_0-completion-report.md). V4.8.1 internal Catalog and Legacy Profiles are implemented: [acceptance report](V4_8_1-completion-report.md). V4.8.2–V4.8.11 remain FUTURE; no Gateway dispatch, model policy or caller migration is implemented yet. CURRENT remains V4.8; next is V4.8.2 after authorization.

## Goal

Move all real LLM requests behind a legacy-compatible Model Gateway; add capability profiles, dry-run policy, telemetry and safe Main→Pro escalation without changing research rules.

## Subrelease sequence

Execution authority: use [DETAILED_INDEX.md](DETAILED_INDEX.md) and its linked normalized subreleases. The overview below is historical grouping, not an alternate execution sequence.

- **V4.8.0 — LLM inventory + Model Catalog:** Scan all model calls; define ModelProfile and legacy analysis/vision profiles. Runtime unchanged.
- **V4.8.1 — Gateway client/adapters:** Add canonical complete() API, response/error normalization; reuse model-stream.
- **V4.8.2 — Call-site migration:** Migrate agent/review/followup/research-path/vision and any other real calls behind Gateway. Legacy mode.
- **V4.8.3 — Complexity + dry-run policy:** Add pure complexity evaluator and RoutingDecision. Execution still uses legacy model.
- **V4.8.4 — Telemetry + health:** ModelCall usage/latency/cost-if-known, provider cooldown, same-tier fallback semantics.
- **V4.8.5 — Main/Pro escalation:** Profile pinning, safe checkpoint-based escalation, modelState in new checkpoints, old checkpoint→legacy mapping.
- **V4.8.6 — Benchmark + policy rollout:** Compare legacy baseline vs policy; enable policy only behind config after gates.

## Scope lock

Only the items described by this release and its subreleases are in scope.

Future release concepts may be referenced for compatibility, but may not be implemented opportunistically.

## Required read-before-code

- `AGENTS.md`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- relevant contracts
- relevant invariants
- relevant ADRs
- current repository implementation/tests
