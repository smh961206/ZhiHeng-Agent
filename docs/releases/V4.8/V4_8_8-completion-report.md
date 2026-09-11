# V4.8.8 Completion Report

Status: CURRENT — internal health routing accepted; production selection stays legacy.

1. Release: V4.8.8 only. V4.8.9–.11 are authorized next; no later behavior is claimed here.
2. Modified runtime: server/model-gateway.mjs, server/model-adapter.mjs. Harness: contract, invariant, ADR-014, implementation map, README, detailed index, .8 specification and MANIFEST.json.
3. New: server/model-health.mjs, tests/model-health.test.mjs, this report. Ignored artifacts contain baseline/rollback copies and test logs.
4. Removed: none.
5. Architecture: one process-local bounded availability owner; Gateway selects explicitly quality-approved same-tier candidates before dispatch. Adapter remains the only endpoint owner and computes opaque connection fingerprints. No new provider transport or telemetry store.
6. Schema: none; Mongo remains version 2.
7. Migration: none.
8. Environment/dependencies: unchanged. Internal factory healthRouting supports observe (default) or fallback with an ordered approved allowlist and custom validated Catalog. No production fallback profiles are configured.
9. Compatibility: legacy/dry-run wires and six-mode delivery/event/checkpoint goldens retained. Existing retries remain in model-request. No financial, Evidence, Knowledge or acquisition changes.
10. Recovery: explicit profile and any assistant/tool/private continuation cannot health-switch. Failed or partial calls are never replayed. No modelState is added by .8.
11. Flags: default observe; fallback is explicit internal factory configuration. This is not an env-enabled production policy rollout.
12. Tests: node --test tests/model-gateway.test.mjs tests/model-migration.test.mjs tests/router-vision-migration.test.mjs tests/model-policy.test.mjs (71 baseline and 71 after integration); node --test tests/model-health.test.mjs (11); pnpm test (661); node --test tests/harness.test.mjs (7 after packaging).
13. Results: all final tests passed, zero failures/skips/cancellations. Initial full runs found duplicated endpoint construction then an unauthorized adapter re-export; moved identity into the existing adapter and removed the health dependency. Original architecture assertions unchanged. Logs: artifacts/v4-8-8-baseline.log, health.log, unit-accepted.log and harness.log (same prefix).
14. Benchmark: legacy research/router/Vision goldens unchanged. Synthetic failure/cooldown tests are safety evidence, not empirical candidate quality. No real alternate is approved or enabled; paid model benchmark is explicitly deferred by user.
15. Privacy: health keys hash protocol/normalized endpoint/model, exclude API keys; no prompts/reasoning or URLs retained. Availability failures do not feed reasoningFailureCount. Existing ModelCall sink records actual dispatched profile, independently of health observations.
16. Rollback: remove internal fallback configuration to restore observe; restore this stage's exact files from artifacts/v4-8-8-rollback if needed. No database rollback/deletion or original baseline overwrite.
17. Limits: recent failures are logical call outcomes, not each transport attempt. Two failures within 60 seconds cool for 30 seconds; state expires after five minutes, capped at 256 connections. Full state declines new observations instead of evicting active cooldowns. Out-of-order older completions cannot overwrite newer outcomes. No distributed breaker or active probing. Caller-side timeouts count as availability, not model intelligence.
18. Deferred: checkpoint pins (.9), safe escalation (.10), rollout gate (.11), real paid quality comparison, distributed health. CURRENT remains V4.8.
