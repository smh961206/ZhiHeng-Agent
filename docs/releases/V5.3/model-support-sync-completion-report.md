# Python 模型支持能力同步完成报告

## 1. Release / subrelease implemented

Platform V5.3 migration supplement. It synchronizes Critical Reviewer, Judge, research-budget accounting, strict model configuration and deterministic Vision-quality grading. Legacy automatic model governance is explicitly retired.

## 2. Modified files

Core changes are in `python_backend/application/research_service.py`, `python_backend/api/factory.py`, `python_backend/config.py`, `python_backend/infrastructure/model_gateway.py`, evidence/web/document adapters, environment templates, deployment overlays, configuration documents and the Node-to-Python parity records.

## 3. New files

`python_backend/domain/research_budget.py`, `python_backend/domain/vision_quality.py`, four focused Python test files, `config/research-budget.example.json`, `compose.budget.yaml`, the synchronization report and this completion report.

## 4. Removed files

None. The already removed Node backend remains absent. Champion/Challenger, A/B, drift, complexity routing and checkpoint escalation were not recreated.

## 5. Architecture changes

Optional independent reviews use the existing Model Gateway and research orchestrator. Budget accounting uses one job-scoped ledger shared by model, evidence collection, web and Vision calls. Vision quality is a pure deterministic domain grader and cannot write facts.

## 6. Schema changes

Additive private `budgetState` version 1 and `flagshipState` version 2 may appear on new jobs. Public cost responses may add a `budget` aggregate. Absence retains disabled behavior.

## 7. Migrations

No database migration, collection, index or backfill. Historical jobs remain unchanged.

## 8. Environment changes

Added `RESEARCH_BUDGET_FILE` and `RESEARCH_BUDGET_MODE=disabled|dry-run|enforce`. Production may mount a private budget file through `compose.budget.yaml`.

## 9. Compatibility impact

Existing schema-v2 model files remain valid. Model entries now reject unknown fields and invalid quality, priority, context-window, price or currency metadata. Existing jobs without the additive states remain readable.

## 10. Resume / recovery impact

Resource and independent-review reservations are persisted before dispatch. An unfinished or uncertain reservation blocks automatic replay. Completed outcomes are revalidated against input, model-configuration and outcome hashes.

## 11. Feature flags

Research budget defaults to `disabled`; `dry-run` records decisions; `enforce` blocks new resources at configured limits. Empty `criticalReviewer` and `judge` pipeline arrays keep those stages disabled.

## 12. Tests executed

Focused domain, Gateway, pricing, cache, independent-review, Judge, research recovery, documents, evidence-provider and FastAPI tests; full Python suite; Ruff; mypy; TypeScript typecheck and production build; Python migration benchmark; model, pricing and budget configuration checks; deployment-script syntax check.

## 13. Test results

Full Python suite: 169 passed, 1 skipped. Focused model-support suite: 42 passed. Ruff, mypy, TypeScript typecheck, production build, all three configuration checks and deployment-script syntax validation passed.

## 14. Benchmark results

The deterministic Python migration benchmark passed all five current cases. Vision table quality has focused deterministic regression tests. No paid or real-model benchmark was run.

## 15. Security / privacy implications

Budget and independent-review state are private job payloads. Public responses expose aggregates only. Credentials, endpoints, prompts, evidence bodies and hidden reasoning are removed from stored review outcomes and public telemetry.

## 16. Rollback path

Disable the budget mode and clear optional review stage assignments for new work. Drain jobs with active reservations before code rollback. Do not delete receipts or rewrite hashes/cutoffs. No database rollback is required.

## 17. Known limitations

Real provider behavior and real-model review quality remain unverified. Cost enforcement requires declared context windows and point-in-time price records; otherwise unknown cost fails closed. Vision grading requires a trusted expected table and therefore remains an offline validation facility.

## 18. Deferred future-release work

Distributed quota infrastructure, multi-instance budget coordination beyond existing optimistic job persistence, real-model effectiveness studies and later Platform capabilities remain deferred. Retired legacy automatic model governance remains out of scope.
