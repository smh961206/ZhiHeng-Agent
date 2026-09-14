# Research Cutoff Compatibility and Error Presentation Report

Status: COMPLETE
Release: Platform V5.3 / Knowledge K1.0.0

## 1. Release/subrelease implemented

This is a V5.3 compatibility correction for historical research retries plus a research-detail error-presentation improvement. It does not create another release line.

## 2. Modified files

- `python_backend/application/recovery.py`
- `python_backend/application/research_service.py`
- `src/domain/research-recovery.ts`
- `src/components/ResearchDetail.tsx`
- `src/components/research-detail.css`
- `python_tests/test_recovery.py`
- `python_tests/test_research_service_recovery.py`
- `tests/research-recovery.test.ts`
- `docs/releases/V5.3/README.md`
- `docs/releases/V5.3/migration.md`
- `docs/releases/V5.3/schema.md`
- `docs/releases/V5.3/rollback.md`

## 3. New files

- this completion report.

## 4. Removed files

None.

## 5. Architecture changes

The existing recovery boundary now owns lazy conversion of the retired runtime's cutoff representation. The browser display-domain layer owns safe, actionable presentation of persisted execution errors. Provider, evidence and financial boundaries are unchanged.

## 6. Schema changes

On explicit retry or startup recovery, a legacy input missing `researchCutoff` may add `researchCutoffSource: legacy-createdAt`. Its `researchCutoff` and an absent plan cutoff receive the UTC-normalized immutable `createdAt`. The change is additive.

## 7. Migrations

No bulk migration runs. Dual-read/lazy-new-write behavior materializes the legacy cutoff only when the task is retried or recovered. Existing explicit values are preserved. Invalid or absent creation times reject recovery.

## 8. Environment changes

None.

## 9. Compatibility impact

Historical Node tasks can enter the current Python retry path without a `KeyError`. Current jobs are unchanged because they already persist an explicit cutoff. Public API routes remain stable.

## 10. Resume/recovery impact

The legacy cutoff remains the original creation time, matching the retired runtime's point-in-time semantics. Materializing it changes an old checkpoint scope, so an incompatible checkpoint is discarded instead of being silently resumed. No retry receives the current time.

## 11. Feature flags

None.

## 12. Tests executed

- Python cutoff-recovery and research-service recovery tests.
- Frontend research-recovery tests.
- Ruff and MyPy for changed Python files.
- ESLint and TypeScript compilation for changed frontend files.
- Server-rendered regression for five application routes.
- Headless Chrome validation against the actual failed historical task page.

## 13. Test results

Python related suite: 24 passed. Full frontend unit suite: 54 passed. Component suite: 2 passed. Ruff, MyPy, ESLint, TypeScript compilation and the production build passed. Browser validation confirmed the redesigned summary content and zero visible raw `researchCutoff` identifiers.

## 14. Benchmark results

No benchmark change was required. The earlier complete V5.3 offline benchmark remains 5/5 passed; this correction is covered by focused compatibility regression tests.

## 15. Security/privacy implications

The UI suppresses raw internal field identifiers and gives users bounded recovery guidance. No source content, model body, credentials or hidden reasoning is added. The fix does not call a model or external data provider.

## 16. Rollback path

Drain launching retries and deploy the prior code. Older readers ignore the additive provenance field and understand the explicit cutoff. Do not remove or refresh a materialized historical cutoff.

## 17. Known limitations

Legacy records missing both an explicit cutoff and a valid original `createdAt` cannot be safely retried and must start a new research task. Persisted historical error events remain unchanged in storage; the browser presents them safely without destructive rewriting.

## 18. Deferred future-release work

A bulk historical backfill is intentionally deferred because it is unnecessary and would rewrite dormant records. Broader structured error-code migration can be considered in a future active Platform release.
