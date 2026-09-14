# ADR-018: Python FastAPI backend

Status: Accepted

Date: 2026-09-14

## Context

The platform backend previously used Node.js for HTTP, research jobs, storage and provider calls. The user authorized a complete production service migration to Python FastAPI while preserving evidence-first rules and historical MongoDB records.

## Decision

FastAPI is the sole production backend runtime. It owns the existing `/api` contract, SSE job streams, task lifecycle, model gateway, document reads, MongoDB/GridFS persistence and static frontend delivery. The production image does not install or start Node.js. Node remains a frontend build-time tool only.

The Python service uses a validated immutable settings object as its configuration boundary. HTTP request models are explicit Pydantic contracts, shared errors retain the `{error: string}` envelope, and middleware owns request context and access policy. Research orchestration depends on provider-neutral storage and model gateway protocols so infrastructure details stay outside the application flow.

The existing `jobs`, `deleted_jobs`, `model_calls`, `report_cache`, `schema_migrations`, `job_payloads.files` and `job_payloads.chunks` names remain stable. Stored JSON remains readable through the same GridFS payload pointer design. No historical record is rewritten.

Platform V5.3 and Knowledge K1.0.0 remain the two public release lines. Execution compatibility and output contract numbers remain internal compatibility markers and do not form another release line.

## Consequences

- Deployment requires Python 3.11+ and has no Node backend process.
- React/Vite still uses Node during the image build and local frontend development.
- Existing API URLs and MongoDB storage locations stay stable.
- Invalid typed request bodies fail with HTTP 422 and retain the public error envelope.
- Each response carries `X-Request-ID`; completion logs include request id, method, path, status and elapsed time.
- Ruff, mypy, pytest and coverage configuration are versioned with the backend.
- Rollback uses the previous Git revision; no database rollback is required.
