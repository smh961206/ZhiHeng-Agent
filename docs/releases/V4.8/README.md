# V4.8 — Model Gateway Foundation

Implementation Status: PARTIAL. V4.8.0–.10 are implemented and accepted for their stated scope. V4.8.11 has a closed rollout gate and offline safety coverage; live candidate quality acceptance is explicitly deferred by the user. Default execution remains legacy. CURRENT=V4.8; V4.9 is not authorized.

## Accepted progress

V4.8.0 call inventory is complete: [inventory](model-call-inventory.md), [acceptance report](V4_8_0-completion-report.md). [V4.8.1 Catalog](V4_8_1-completion-report.md), [V4.8.2 Gateway](V4_8_2-completion-report.md), [V4.8.3 text migration](V4_8_3-completion-report.md), [V4.8.4 remaining-call migration](V4_8_4-completion-report.md) and [V4.8.5 complexity utility](V4_8_5-completion-report.md) are accepted. [V4.8.6 dry-run policy](V4_8_6-completion-report.md) is accepted. [V4.8.7 telemetry/deployment](V4_8_7-deployment-acceptance.md) and [V4.8.8 internal health routing](V4_8_8-completion-report.md) are accepted. [V4.8.9 pins](V4_8_9-completion-report.md) and [V4.8.10 internal escalation](V4_8_10-completion-report.md) are accepted; [V4.8.11 offline completion and deferred live gate](V4_8_11-completion-report.md) records the final boundary. Production stays legacy; no paid benchmark is authorized. CURRENT remains V4.8.

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



Final authorized boundary: [V4.8.11 completion report](V4_8_11-completion-report.md). Offline implementation/testing is completed; real quality acceptance and production activation remain deferred. CURRENT stays V4.8; stop before V4.9.
