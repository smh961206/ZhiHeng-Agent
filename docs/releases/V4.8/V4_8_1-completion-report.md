# V4.8.1 Completion Report — Model Catalog + Legacy Profiles

Date: 2026-09-10. Baseline: `deedc24bf2c9d7717c9cd3119e4cbb39fa6ff360` (accepted V4.8.0); working tree was clean before this subrelease. CURRENT remains `V4.8`. Runtime/Knowledge framework remains 4.7, contract version 7.

## 1. Release / acceptance

V4.8.1 is accepted for the internal Catalog and ModelProfile v1 only. AC01 is covered by old-env/default/empty-string/router/Vision mapping and mocked requests from Vision and both router owners. AC02 is covered by serialization exclusion of API keys, credential-bearing URLs and unrelated env, plus closed schema validation. Latest review acceptance: 536 unit tests pass (72 files), with 0 failures/skips; inventory and Harness checks also pass. V4.8.2 is not started.

## 2. Modified files

- `server/vision-model.mjs`: extracts the existing image-input predicate as `legacyVisionImageInput`; readiness still additionally requires a key.
- `docs/contracts/model-gateway.contract.md`: current ModelProfile schema/API versus future request/response Gateway.
- `docs/architecture/current-implementation-map.md`, `docs/architecture/04-model-system.md`: current owners, metadata limitations and future migration boundaries.
- `docs/adr/ADR-002-model-gateway.md`, `docs/invariants/model.invariants.md`: implementation evidence only; accepted decisions and invariant obligations unchanged.
- `docs/releases/V4.8/README.md`, `DETAILED_INDEX.md`, `schema.md`, `migration.md`, `rollback.md`, `subreleases/V4_8_1-model-catalog-legacy-profiles.md`: actual subrelease scope, progress and compatibility.
- `MANIFEST.json`: refresh packaged documentation hashes/lengths and add this report. The Harness manifest is not a product-source inventory.

## 3. New files

- `server/model-catalog.mjs`: pure legacy factory and validated immutable ModelProfile metadata; no new transport or routing engine.
- `tests/model-catalog.test.mjs`: 15 regression cases, including 90 legacy Vision model/mode/key combinations within one case (5 models × 6 modes × 3 key states), plus six mocked requests across the two router owners in another case.
- This report: `docs/releases/V4.8/V4_8_1-completion-report.md`.

Ignored local audit helpers and test logs reside under `artifacts/v4-8-1-*`; they are not delivered product/configuration files.

## 4. Removed files

None. No existing test was removed, skipped or weakened.

## 5. Architecture changes / reviewed modules

Reviewed model-routing/request/deadline/stream, agent completion and execution, research-path, security-intent, vision-model and its readers, evidence-followup, public routing/readiness and safe environment templates. V4.8.0's four production transports and ten semantic callers remain in place.

The new metadata responsibility has one owner, `model-catalog.mjs`, reusing `modelRouting` for existing defaults and one shared legacy Vision predicate. Analysis/router profiles share an analysis connection reference; this represents the existing router override, not another provider client. No provider/model migration, stream parser, policy, stable policy slot or escalation system was introduced.

CURRENT: Catalog/Profile v1, legacy model mappings and existing transports. PARTIAL: Gateway contract and ADR-002 implementation. FUTURE: Gateway dispatch, adapters, caller migration, complexity/policy/health/usage/escalation and checkpoint modelState. No new DEPRECATED status. Historical H0/V4.8.0 inventories remain historical evidence rather than being rewritten as current source hashes.

## 6. Schema changes

New configuration-only ModelProfile v1: stable legacy IDs, opaque model, nullable provider, protocol, safe connection reference, legacy tier, purposes, explicit boolean/null capabilities, nullable token limits and nullable pricing. Unknown prices remain null; zero is allowed only when explicitly supplied to the profile constructor. Generated legacy profiles infer neither price nor provider identity.

No MongoDB schema, public payload, persistent type, framework version, Knowledge version or financial object changed.

## 7. Migrations

None. Existing env generates metadata on demand through the internal factory. No database/index/backfill or checkpoint rewrite. Model-state compatibility belongs to V4.8.9.

## 8. Environment changes

None. No dependency, lock file, deployment config, environment template or new variable. Tests use Node 24.19.0 / pnpm 11.19.0 on Windows with synthetic credentials and mocked model responses. No live provider request was made.

## 9. Compatibility / runtime behavior

Existing request behavior change = 0. The only edit to an existing runtime module extracts the exact Vision capability expression; exhaustive mode/model/key parity and existing Vision tests cover equivalence. Catalog is a new internal API and is not wired into business dispatch. Existing `modelRouting` and public routing exports are unchanged.

Model defaults and `||` fallback semantics, router override, independent Vision base/key fallback, image gating, request bodies, reasoning defaults, retries/deadlines/stream handling and validation remain as before. Financial calculations, Evidence rules, Knowledge content, acquisition, public UI and investment-research decisions are unchanged. This is not a claim that a new Gateway has been deployed.

## 10. Resume / recovery and point-in-time impact

None. Profiles do not pin jobs or resolve provider continuation; all original checkpoint/retry/evidence/cutoff behavior remains. The pre-existing enforcement gaps recorded in H0 are neither fixed nor relaxed here.

## 11. Feature flags

None. MODEL_ROUTING_MODE is not introduced or used as a rollback claim. Existing production callers remain active.

## 12. Tests executed

Commands and local logs (all from this subrelease):

| Command | Log | Result |
|---|---|---|
| `node --test tests/model-request.test.mjs tests/model-deadline.test.mjs tests/streaming.test.mjs tests/research-path.test.mjs tests/security-intent.test.mjs tests/visual-reading.test.mjs` | `artifacts/v4-8-1-baseline-tests.log` | Pre-change baseline: 47 passed, 0 failed/skipped |
| `node --test tests/model-catalog.test.mjs tests/visual-reading.test.mjs tests/model-call-inventory.test.mjs` | `artifacts/v4-8-1-targeted-tests.log` | Initial implementation: 33 passed, 0 failed/skipped |
| `pnpm test` | `artifacts/v4-8-1-unit-tests.log`, final documentation verification: `artifacts/v4-8-1-final-unit-tests.log` | 72 unit-test files / 532 passed, 0 failed, cancelled, skipped or todo; exit 0 |
| `node scripts/check-model-call-inventory.mjs --baseline` | `artifacts/v4-8-1-inventory-check.log` | 4 production transports, 10 callers, 1 direct diagnostic; historical UTF-8/LF baseline hashes verified; exit 0 |
| `node artifacts/v4-8-1-audit.mjs` | `artifacts/v4-8-1-change-audit.json` | Exact-byte baseline comparison: 13 tracked files changed, 1,360 unchanged |
| `git diff --check` | Local command result | Exit 0; no whitespace errors |

The manifest refresh helper `node artifacts/v4-8-1-manifest.mjs` records 458 packaged Harness files; the full suite checks every recorded byte length/hash and documentation link. Existing MongoDB, UI, route-render and Linux deployment suites have no changed owners in this metadata/predicate subrelease; prior H0 results are historical and are not claimed as newly executed here.

## 13. Test results / change audit

Initial acceptance passed 532 tests: all 521 previously existing tests and 11 new Catalog cases. Review baseline repeated 33 related tests successfully, then three new negative regressions reproduced three schema defects (11 passed / 3 failed / 0 skipped before the fix). After correction, the related subset passes all 36 tests. Repeated runs are not added as distinct tests. No test is deleted, skipped or weakened. Vision compatibility covers 90 model/mode/key combinations; the initial report's count of 180 was a documentation arithmetic error, now corrected.

Exact tracked-file hashes were captured before edits under `artifacts/v4-8-1-baseline-hashes.json`. Of 1,373 starting tracked files, 13 changed as listed in section 2 and 1,360 are byte-identical; three files were added and none deleted. In particular, all pre-existing business tests, financial/Evidence/acquisition/Knowledge/recovery sources, dependency/lock files, environment/deployment configurations and CURRENT are unchanged. The one edited existing runtime owner is the explicitly reviewed Vision predicate extraction. The optional inventory historical hash check verifies the pinned V4.8.0 source provenance; it is not misrepresented as a current-file freeze.

## 14. Benchmark

No benchmarkable model-selection or inference behavior was introduced, so a live model quality/cost comparison is not applicable to V4.8.1. Legacy transport and financial/Evidence regressions are retained. No synthetic benchmark score or live-provider compatibility certification is claimed. Policy rollout still requires later release benchmark gates.

## 15. Security / privacy

Catalog does not include API keys, full env, URLs, prompts, images or hidden reasoning. Omitting base URLs also avoids serializing userinfo, query or path credentials. Closed-field validation rejects accidental secret fields and uses generic errors that do not echo values. Explicit Vision capability remains separate from credential readiness; unknown structured/reasoning support is not silently enabled.

This is internal metadata, not a public endpoint. Callers must still avoid putting secrets in model/provider identifiers. Credential resolution stays with existing server configuration; arbitrary endpoint safety and hidden-state isolation are not newly guaranteed by Catalog.

## 16. Rollback

Revert these three new files, the listed documentation/manifest updates and the Vision predicate extraction to the clean V4.8.0 baseline. No data, config, dependency, schema or environment rollback is required. No evidence or research record is deleted. Existing request paths are continuously available, with compatibility covered by regressions.

## 17. Known limitations / document conflicts

- Legacy declarations describe configured usage, not verified capabilities of arbitrary providers. Optional structured-output/reasoning support, token limits, provider identity and prices remain unknown.
- Catalog connection references are not credential snapshots or job pins; future normalization/migration must resolve them privately without exposing secrets.
- Existing direct transports and provider-specific thinking/Vision compatibility checks persist. INV-MDL-001–005 stay TARGET. Full Gateway/adapter and cross-provider reasoning isolation remain unfinished.
- Generic V4.8.1 template references to checkpoint/usage persistence and routing-mode rollout conflicted with its metadata-only scope; the specification now assigns those to their actual later subreleases.
- The release overview's historical grouped numbering remains explicitly non-authoritative; the normalized detailed index controls execution.

## 18. Deferred work / stop

V4.8.2 request/response normalization is next, after user authorization. V4.8.3/V4.8.4 caller migration, policy, telemetry, health, model-state compatibility, escalation and rollout remain deferred. V4.9/V5.x/V6.0 work was not implemented. CURRENT remains `V4.8`; no V4.8.2 work is included in this subrelease.

## V4.8.1 review and optimization — 2026-09-10

The review found and corrected these reproducible issues:

| Priority | Finding / consequence | Correction / evidence |
|---|---|---|
| P2 | A one-hole purpose array passed `some()` validation and became `[undefined]` / JSON `[null]`, outside the purpose contract | Validate bounded dense array data descriptors and allowed values before copying; reject custom array properties/iterators |
| P2 | Non-enumerable required fields passed presence/type validation but disappeared under object spread | Require enumerable own data properties on profile, capabilities and pricing; validated snapshots preserve required fields |
| P2 | Getters were repeatedly read during validation/copying and could change values or throw caller-controlled errors | Reject accessors using descriptors without executing getters; validate copied data records and retain generic validation errors |
| P3 | Report overstated the Vision truth table as 180 combinations | Corrected to 5 × 6 × 3 = 90; test execution counts were unaffected |

The three new negative regression tests failed against the pre-fix implementation and pass after the fix. Initial 11 Catalog tests remain unchanged. Review edits are limited to `server/model-catalog.mjs`, `tests/model-catalog.test.mjs`, the Gateway contract, implementation map, this report and refreshed `MANIFEST.json`. No additional file was created or deleted for delivery during review. The prior Vision predicate extraction is unchanged by this review.

No new architecture owner, field/schema version, persistence, migration, dependency, environment variable, feature flag, public API, provider request or resume/recovery behavior was introduced. The internal constructor now rejects invalid/executable property shapes; ordinary generated/frozen/JSON-round-tripped profiles remain compatible. Existing request and investment-research behavior change remains 0. Security improves by excluding getter execution/error content during metadata validation; arbitrary JavaScript proxies are outside the configuration-data contract.

Review rollback can revert just the validator/test/documentation edits to the initial V4.8.1 state, without touching data or environment. Full subrelease rollback remains section 16. Benchmark applicability, existing limitations and deferred V4.8.2+ work remain as above. Integration tests are not claimed as executed by this review.

Review verification logs: `artifacts/v4-8-1-review-baseline.log` (33/33), `artifacts/v4-8-1-review-repro.log` (11 pass / 3 expected regression failures before correction), `artifacts/v4-8-1-review-targeted.log` (36/36). Commands: `node --test tests/model-catalog.test.mjs tests/visual-reading.test.mjs tests/model-call-inventory.test.mjs` for baseline/fixed checks; `node --test tests/model-catalog.test.mjs` for reproduction. Final full-suite and inventory verification follow.

Final review verification:

| Command | Actual result | Evidence |
|---|---|---|
| `pnpm test` | 535 passed / 0 failed, cancelled, skipped or todo; exit 0. Includes all 521 pre-V4.8.1 tests and 14 Catalog tests | `artifacts/v4-8-1-review-unit.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 4 production transports / 10 callers / 1 direct diagnostic; historical hashes verified; exit 0 | `artifacts/v4-8-1-review-inventory.log` |
| `node artifacts/v4-8-1-audit.mjs` | Baseline audit still shows 13 tracked files changed / 1,360 unchanged, plus the same three subrelease additions | `artifacts/v4-8-1-review-change-audit.json` |
| `git -c core.safecrlf=false diff --check` | Exit 0; no whitespace errors | Local command result |
| `node --test tests/harness.test.mjs` | Final report/manifest consistency: 7 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-1-review-harness.log` |

Harness packaging remains 458 files. No unresolved defect from this review blocks V4.8.1 within its internal-metadata scope. Stop here; CURRENT remains V4.8 and V4.8.2 requires separate authorization.

## V4.8.1 second review — independent compatibility assertions

Found one P2 test-coverage defect: the connection fallback test selected expected base/key using the returned `connectionRef` itself. An analysis profile incorrectly referencing Vision, or a Vision profile incorrectly referencing analysis, still passed all 14 Catalog tests. This was a blind spot in verification; the real generated profiles were correctly mapped.

The test now independently pins each profile ID to its contract-defined connection reference before retaining all original base/key fallback assertions. An additional regression exercises both existing router request owners with three configurations (analysis fallback, custom router override, legacy thinking-disabled override). It checks successful semantic completion and captured model, endpoint origin, analysis credential, streaming/tool options and the original 400/1200 output budgets. Assertions run after the calls, so the owners' fallback handlers cannot swallow assertion failures. Frozen profiles also explicitly pass constructor revalidation alongside JSON round trips.

Mutation evidence uses disposable copies under ignored `artifacts/`, never changes production source and runs every Catalog test in each copy. Before improvement, deliberately switching either analysis or Vision connection passed 14/14 tests (exit 0); afterwards each mutation is rejected by the strengthened connection test (14 pass / 1 fail, exit 1). The helper expects these failures and exits 0 only when they occur. These are deliberate verification experiments, not unresolved failures of the real implementation.

| Command | Actual result | Local evidence |
|---|---|---|
| `node --test tests/model-catalog.test.mjs` | Review baseline 14/14, exit 0 | `artifacts/v4-8-1-review2-baseline.log` |
| `node artifacts/v4-8-1-review2-mutations.mjs before` | Two incorrect temporary mappings both escaped the old tests | `artifacts/v4-8-1-review2-mutation-before-analysis.log`, `artifacts/v4-8-1-review2-mutation-before-vision.log` |
| `node artifacts/v4-8-1-review2-mutations.mjs after` | Both incorrect mappings detected; each temporary suite has 1 expected failure | `artifacts/v4-8-1-review2-mutation-after-analysis.log`, `artifacts/v4-8-1-review2-mutation-after-vision.log` |
| `node --test tests/model-catalog.test.mjs tests/research-path.test.mjs tests/security-intent.test.mjs tests/visual-reading.test.mjs` | 39 passed / 0 failed/skipped; exit 0 | `artifacts/v4-8-1-review2-targeted.log` |
| `pnpm test` | 536 passed / 0 failed, cancelled, skipped or todo; 72 files; exit 0 | `artifacts/v4-8-1-review2-unit.log` |
| `node scripts/check-model-call-inventory.mjs --baseline` | 4 production transports / 10 callers / 1 diagnostic; historical hashes verified; exit 0 | `artifacts/v4-8-1-review2-inventory.log` |
| `node --test tests/harness.test.mjs` | 7 passed / 0 failed/skipped; final 458-file manifest and documentation checks; exit 0 | `artifacts/v4-8-1-review2-harness.log` |

Only `tests/model-catalog.test.mjs`, the Gateway contract's testing evidence, this report and `MANIFEST.json` are edited in this second review. No additional deliverable file is added or removed. No production source, architecture owner, schema, migration, environment/dependency, feature flag, security policy, public API, checkpoint or recovery behavior changes. Existing runtime and investment-research behavior delta is 0; no live provider or database call occurs. Integration suites are not rerun or claimed as newly passed. No new runtime defect was found within the reviewed scope; arbitrary provider capability certification and full Gateway behavior remain outside this stage.

Rollback for this review is limited to its test/documentation/manifest changes; no runtime or data rollback is needed. Benchmark applicability and deferred releases remain as sections 14 and 18. CURRENT stays V4.8; V4.8.2 is not started.
