# Current Implementation Map

Status: current
Release: Platform V5.3 / Knowledge K1.0.0

## Runtime

FastAPI owns port 3001, `/api`, SSE, research lifecycle, MongoDB/GridFS, model access, document reading and built frontend delivery. `server/` and all Node backend entrypoints have been removed. The production image contains Python only; its Node build stage compiles the React application.

## Owners

| Area | Owner |
|---|---|
| HTTP, middleware, SSE | `python_backend/api/factory.py`, `api/middleware.py`, `api/security.py`, `api/events.py` |
| Input contracts and plans | `api/schemas.py`, `domain/contracts.py`, `domain/models.py` |
| Research and recovery | `application/research_service.py`, `application/recovery.py`, `application/workflow.py`, `application/baseline.py` |
| Analysis planning, Prompt plans and context | `application/calculation_service.py`, `application/context_compiler.py`, `application/prompt_governance.py`, `domain/review.py` — registered Prompt IDs, safe execution metadata, bounded repair history and required calculation-evidence completeness |
| Model boundary and governance | `infrastructure/model_gateway.py`, `infrastructure/model_adapter.py`, `infrastructure/model_pricing.py`, `domain/model_governance.py` |
| Optional independent review and judge | `domain/independent_review.py`, `domain/judge.py`, `application/independent_review.py`, `application/research_service.py` — complete original-cutoff evidence, durable single-dispatch sessions, advisory judge and final audit; configured empty by default |
| Knowledge snapshots and receipts | `application/knowledge.py`, `cli.py` |
| Documents and evidence | `infrastructure/documents.py`, `infrastructure/official_evidence.py`, `infrastructure/web_research.py`, `infrastructure/data_archive.py`, `domain/evidence.py`, `domain/web_evidence.py` — identical rendered vision pages reuse transcription by image digest while retaining separate unverified page blocks |
| Securities and market data | `domain/securities.py`, `infrastructure/market.py`, `infrastructure/data_providers.py` |
| Company logo display assets | `infrastructure/company_logos.py` — keyless Wikidata listing lookup and Wikimedia thumbnails; bounded memory cache, no local company mapping or financial evidence writes |
| Financial calculations | `domain/calculations.py`, `domain/financial.py`, `domain/analytics.py` |
| Persistence and migration | `infrastructure/mongo_storage.py`, `cli.py` |
| Browser UI | `src/` |
| Client display and view-model rules | `src/domain/` |

## Compatibility

Public API paths and MongoDB/GridFS names remain stable. New tasks pin K1.0.0 and the Python execution compatibility scope. Historical records remain readable; no migration destructively rewrites originally reported data. Old Node module imports are intentionally unsupported.

Model-call records may add body-free `promptContext` metadata. Research context receipts now write version 2 with calculation-evidence completeness. Absence and version-1 receipts remain readable and are not backfilled.

## Validation boundary

`python_tests/` owns backend tests. `tests/` owns focused frontend unit checks, Vitest/Testing Library component interactions and SSR routes. `tsconfig.strict.json` checks the first reviewed TypeScript boundary while Vite continues to parse and build the complete client. FastAPI OpenAPI generates `src/generated/api-schema.ts`, and CI rejects drift. Architecture checks reject recreated `server/` or `shared/` directories, JavaScript/TypeScript backend benchmarks, Node backend start commands, backend-only npm dependencies and unapproved global frontend state libraries. `benchmark/` contains the Python-only migration acceptance suite.

Completed pre-V5.3 release maps have been removed. This document and executable code define current runtime ownership.
