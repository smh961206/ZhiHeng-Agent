# ZhiHeng-Agent Engineering Instructions

ZhiHeng is an evidence-first investment research system evolving toward an Investment Intelligence OS.

## 1. Required reading before changes

Before changing code:

1. Inspect the current implementation.
2. Read `docs/releases/CURRENT`.
3. Read `docs/architecture/00-system-map.md`.
4. Read `docs/architecture/current-implementation-map.md`.
5. Read the current release specification.
6. Read contracts and invariants for every domain you modify.
7. Read relevant ADRs.
8. Search the repository for existing implementations before creating new modules.

## 2. Source-of-truth priority

Use this priority:

1. Current executable code and tests
2. Domain contracts
3. Enforced system invariants
4. Accepted ADRs
5. Current release specification
6. Architecture documentation
7. Master roadmap
8. Historical conversation context

If they conflict, do not silently choose one. Preserve production safety, document the conflict, and make the smallest compatible change allowed by the current release.

## 3. Permanent investment-research rules

- Evidence comes before conclusions.
- Missing data must remain missing.
- Never invent financial values.
- Never upgrade a model merely because data is unavailable.
- Financial period, currency, share basis, accounting scope, and valuation basis must remain explicit.
- Derived values must be reproducible.
- Verified facts must remain traceable to source evidence.
- Forecasts, assumptions, estimates, and observations must never masquerade as verified facts.
- Counter-evidence must not be silently discarded.
- Point-in-time research must not use information published after the research cutoff.
- Historical originally-reported data must not be destructively overwritten by later restatements.
- Research resume must preserve the original market/data cutoff unless explicitly starting a new research job.
- Hidden model reasoning must never be exposed or persisted as public execution history.
- Human overrides must never be silently replaced.
- Reports are views; long-term canonical state belongs in structured research objects.
- Deterministic financial math and hard validation belong in programs, not in free-form model reasoning.

## 4. Architecture rules

- Business logic must not depend on provider/model names.
- Provider-specific behavior belongs behind Model Gateway adapters.
- Prefer extending existing modules over creating parallel subsystems.
- Hybrid retrieval may augment exact/structured retrieval but must not replace exact financial evidence retrieval.
- Vector similarity is not a financial truth source.
- Multi-agent orchestration is not the default architecture.
- Do not introduce distributed infrastructure until real multi-worker/multi-instance requirements exist.
- Stable entity identity, point-in-time semantics, provenance, and dependency lineage are first-class architecture concerns.
- Facts, calculations, claims, beliefs, forecasts, decisions, and outcomes must have distinct semantics.

## 5. Release boundary

Read `docs/releases/CURRENT`.

Implement only the active release unless the user explicitly changes it.

Future roadmap documents are not permission to implement future features.

When an out-of-scope improvement is discovered:
- record it as deferred;
- do not implement it opportunistically.

## 6. Existing-capability rule

Before creating a new subsystem, inspect current modules.

Examples:
- Model: `model-routing.mjs`, `model-stream.mjs`, `vision-model.mjs`
- Knowledge: `knowledge.mjs`, `knowledge-excerpt.mjs`, `knowledge-snapshots.mjs`
- Evidence: `evidence-search.mjs`, `evidence-followup.mjs`
- Security: `security-resolver.mjs`, `security-intent.mjs`, `security-exchanges.mjs`, `sec-directory.mjs`
- Financial: `financial-observations.mjs`, `financial-input-verification.mjs`, `data-basis.mjs`, `inline-xbrl.mjs`
- Calculations: `calculations.mjs`, `cashflow-bridge.mjs`, `normalized-earnings.mjs`, `research-sensitivity.mjs`, valuation modules
- Research lifecycle: `research-context.mjs`, `research-workflow.mjs`, `research-resume.mjs`, `research-output.mjs`
- Recovery: `job-checkpoints.mjs`, `calculation-recovery.mjs`

Do not create a second parallel implementation without an approved migration plan.

## 7. Schema changes

All persistent schema changes require:

- compatibility analysis
- migration strategy
- rollback strategy
- tests
- point-in-time impact analysis
- provenance impact analysis

Prefer:

additive schema
→ dual read if needed
→ new write
→ verified backfill
→ cutover
→ later cleanup

Do not destructively rewrite historical research records.

## 8. Testing

Never make tests pass by:
- deleting tests
- skipping validation
- weakening evidence requirements
- weakening review contracts
- changing financial definitions without an approved contract/ADR
- hiding missing data
- bypassing point-in-time checks
- bypassing provenance
- disabling resume/recovery guarantees

Run existing tests plus release-specific tests.

## 9. Architecture fitness

If an architecture boundary can be automatically tested, prefer an executable architecture test over prose alone.

Examples:
- business modules cannot call LLM provider endpoints directly;
- forecasts cannot be stored as verified facts;
- verified facts require source lineage;
- direct report text cannot become canonical state by accident.

## 10. Completion report

Every implementation must report:

1. Release/subrelease implemented
2. Modified files
3. New files
4. Removed files
5. Architecture changes
6. Schema changes
7. Migrations
8. Environment changes
9. Compatibility impact
10. Resume/recovery impact
11. Feature flags
12. Tests executed
13. Test results
14. Benchmark results where applicable
15. Security/privacy implications
16. Rollback path
17. Known limitations
18. Deferred future-release work

Do not report only “done”.

## H0 calibration notes

Use `CODEX_EXECUTION_PROTOCOL.md` and `docs/releases/H0/DETAILED_INDEX.md` for H0 order. The Model Gateway rule is an accepted target boundary: current direct call sites are mapped, not migrated in H0. Runtime framework/Knowledge version 4.7 is distinct from the Harness release pointer. See `docs/releases/H0/audit-findings.md` for current enforcement gaps; permanent rules above are unchanged.
