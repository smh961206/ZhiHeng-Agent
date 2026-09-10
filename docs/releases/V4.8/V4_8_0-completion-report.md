# V4.8.0 Completion Report

Status: ACCEPTED. CURRENT remains V4.8; this report covers the first subrelease only. Date: 2026-09-10.

## Scope

Inventory baseline: commit 087e74ec3a5b5fcba4bb40ad0c9ad1a8a214c9ae. See [call inventory](model-call-inventory.md) and [machine-readable owners](model-call-inventory.json). No production source, existing test or configuration is changed.

## 1. Release/subrelease implemented

V4.8.0 — LLM call inventory. AC01 passed: four production endpoint owners, ten production purpose/caller entries and one independent direct diagnostic request are mapped. Research/review/followup share one transport; path and security-intent are distinct router purposes; PDF/image/audit/targeted-page Vision paths reuse the existing Vision transport.

This starts model-platform iteration without skipping inventory. V4.8.1 Model Catalog + Legacy Profiles is next and has not started. V4.8 as a whole is not accepted; CURRENT is authorization scope, not completion status.

## 2. Modified files

- [MANIFEST.json](../../../MANIFEST.json)
- [Current Implementation Map](../../architecture/current-implementation-map.md)
- [Model architecture](../../architecture/04-model-system.md)
- [V4.8 README](README.md)
- [Detailed index](DETAILED_INDEX.md)
- [Rollback](rollback.md)
- [V4.8.0 specification](subreleases/V4_8_0-llm-call-inventory.md)

The specification's generic checkpoint/telemetry/flag/rollout language is clarified as later-subrelease work. Its no-model-behavior-change scope is preserved.

## 3. New files

- [Readable call inventory](model-call-inventory.md)
- [Machine-readable inventory](model-call-inventory.json)
- [Static inventory tests](../../../tests/model-call-inventory.test.mjs)
- [Read-only inventory checker](../../../scripts/check-model-call-inventory.mjs)
- This completion report.

Ignored artifacts contain discovery logs, baseline hashes and verification helpers. They are not runtime modules or project dependencies.

## 4. Removed files

None. No existing tests, scenarios, validators or fixtures were removed or skipped.

## 5. Architecture changes

Documentation and static coverage only. No runtime owner moved. Direct endpoint counts, purpose chains, provider-specific thinking/capability branches, response-format fallback, retry/stream differences and separate diagnostic traffic are now explicit. There is no new parallel model implementation.

## 6. Schema changes

None. Inventory JSON is a development artifact, not a persisted research object or ModelProfile contract. No runtime types/fields changed.

## 7. Migrations

None. ModelState/Legacy Profile checkpoint migration remains V4.8.9; no historical job was rewritten.

## 8. Environment changes

None. Tests used existing Node 24.19.0 and pnpm 11.19.0 on Windows. Only example environment files were inspected; no .env secret values, project dependencies, lockfiles or runtime configuration changed. No provider, MongoDB, browser or deployment service was started for this inventory subrelease.

## 9. Compatibility impact

Runtime behavior change = 0; investment-research behavior change = 0. SHA-256 comparison against the clean accepted H0 commit verifies all 1361 tracked files outside the seven-file documentation/manifest allowlist are byte-identical, including production modules, existing tests, Knowledge, configuration and dependencies. The five new files are inventory/report/test artifacts and a read-only development checker; the application does not import the checker.

## 10. Resume/recovery impact

None. Private reasoning retention, pending-tool execution and current evidence/cutoff behavior remain unchanged. The inventory records that current resumeScope does not pin provider/model identity; cross-provider compatibility and rejected-checkpoint restart limitations remain future work, not silently fixed here.

## 11. Feature flags

None. MODEL_ROUTING_MODE is not implemented and cannot be used as a current rollback command. Catalog, dry-run policy, telemetry, health and escalation remain future subreleases.

## 12. Tests executed

```text
node --test tests/model-request.test.mjs tests/model-deadline.test.mjs tests/streaming.test.mjs tests/research-path.test.mjs tests/security-intent.test.mjs tests/visual-reading.test.mjs tests/research-resume.test.mjs tests/review-format.test.mjs
node --test tests/model-call-inventory.test.mjs
node scripts/check-model-call-inventory.mjs
node scripts/check-model-call-inventory.mjs --baseline
pnpm test
node artifacts/v4-8-0-verify.mjs
git -c core.safecrlf=false diff --check
```

Repository searches covered direct endpoint families, network functions, provider SDK usage, model parameters, call aliases and environment examples. Existing response fixtures were used; no live diagnostics or model requests ran.

## 13. Test results

| Check | Actual result | Exit |
|---|---|---|
| Relevant pre-edit baseline | 62 passed, 0 failed/skipped | 0 |
| Inventory checks after second review | 9 passed, 0 failed/skipped | 0 |
| Full existing node:test suite plus reviewed tests | 521 passed, 0 failed/skipped (71 files) | 0 |
| Read-only checker, normal and --baseline | 4 production transports / 10 callers / 1 direct diagnostic; 5 historical normalized hashes verified | 0 |
| Zero-runtime hash audit | 1361 protected tracked files unchanged, no violation | 0 |
| Harness manifest, navigation and status checks | Included in full suite; 457 packaged files with exact size/hash | 0 |
| Patch whitespace | Clean | 0 |

Logs: artifacts/v4-8-0-baseline.log, v4-8-0-inventory-tests.log (initial 3 tests), v4-8-0-review-tests.log (first review, 6 tests), v4-8-0-review2-tests.log (second review, 9 tests), v4-8-0-unit.log (initial 515 tests), v4-8-0-review-unit.log (first review, 518 tests), v4-8-0-review2-unit.log (second review, 521 tests), v4-8-0-review2-checker.log, v4-8-0-network-scan.txt, v4-8-0-change-audit.json, v4-8-0-diff-check.log. H0 MongoDB/UI/Linux acceptance remains historical evidence and is not counted as newly executed V4.8.0 testing. No production/UI/storage/deployment code changed, so those environment-dependent runners were not repeated for inventory-only work.

## 14. Benchmark results

No model behavior is introduced; the no-runtime-change subrelease preserves the accepted legacy baseline. No quality/cost/latency comparison or ≥50 frozen-case policy benchmark was executed or claimed. Those are release rollout gates, not evidence that V4.8 is complete.

## 15. Security/privacy implications

No keys, user documents, provider response bodies or hidden reasoning are added to artifacts. Inventory stores file ownership, public parameter names and code hashes. Live diagnostic scripts were inspected but not run. Public/private reasoning safeguards and Evidence requirements are unchanged.

## 16. Rollback path

Restore only the seven modified documentation/manifest files to the baseline and remove the five added inventory/report/test/checker files, preserving unrelated work. No database, schema, runtime config or research rollback is necessary. CURRENT remains V4.8; use the accepted H0 runtime until subsequent subreleases are authorized and accepted.

## 17. Known limitations

The scan is lexical plus manual call tracing; it cannot prove absence of arbitrarily computed endpoints or dynamic SDK imports. Historical hashes provide inventory provenance, not a permanent future-runtime freeze. Transport guards currently differ: research streaming has network retry/deadlines; router calls have their own caches/fallbacks; Vision has stricter size/redirect guards. Non-SSE analysis parsing does not have every SSE constraint. Common usage telemetry, profile pinning and cross-provider private-state compatibility do not exist yet.

## 18. Deferred work and stop

V4.8.1–V4.8.11 are not implemented. Next is V4.8.1 Model Catalog + Legacy Profiles, then normalization and ordered call-site migration. Preserve existing request/deadline/stream implementations and current financial/Evidence semantics. Contracts and accepted ADR decisions were read and not changed; TARGET model invariants are not relabeled ENFORCED by an inventory test.

V4.8.0 acceptance is complete. Stop at this subrelease boundary under CODEX_EXECUTION_PROTOCOL; do not infer authorization for all remaining model-platform subreleases from the request to enter this iteration.

## Review findings and resolution

- P2 — Wrong regression attribution: budget-exhausted synthesis and targeted page Vision were mapped to files without their actual tests. Both now reference named cases in agent-capabilities.test.mjs. A regression test reproduces and rejects each former wrong mapping.
- P2 — Incomplete inventory validation: file existence alone allowed invented test evidence, duplicate transport IDs, repeated anchors or incompatible transport purposes. The shared checker validates these relationships, fixes scan scope independently of JSON and is exercised with invalid inventories and added/removed endpoint candidates.
- P2 — Nonportable hash provenance: original historical hashes used Windows working-copy bytes without declaring line-ending semantics. Hashes now derive from the pinned Git source with explicit UTF-8/LF normalization and are verified by the optional --baseline command. The original zero-runtime raw-byte audit remains separate and unchanged.
- Reproducibility — Inventory validation is now an in-repository read-only CLI shared with tests. It does not depend on ignored helper files or silently refresh MANIFEST, and distinguishes ordinary checkout validation from optional Git-history verification.

No production defect is claimed to be fixed by this review. Remaining limitations are the documented lexical discovery boundary and manual interpretation of test semantics; no whole-program or complete behavioral proof is claimed.

### Second review

- P2 — Unchecked request metadata: changing stream:true to stream:false or naming a nonexistent request function previously passed. The checker now compares each declared function with its single awaited source call and compares literal stream fields/absence. Regression cases also change the source to prove drift is rejected in either direction. Dynamic values require review rather than being interpreted as an omitted field.
- P2 — Noncanonical source paths: the old lookahead missed a leading ../ segment after a root, so tests/../tests/agent.test.mjs passed. Segment validation now rejects traversal, dot/empty segments and invalid separators before attempting the referenced read. This is path canonicalization, not a claim of filesystem sandboxing or symlink confinement.
- Scan-scope integrity: exported scope arrays could be mutated despite being described as fixed. They are now frozen, with mutation regressions covering removal, replacement and splice.

The three acceptance defects were reproduced before correction and rejected afterward. No additional files, dependencies, configuration or runtime changes were introduced by this second review. CURRENT remains V4.8 and V4.8.1 remains unstarted.
