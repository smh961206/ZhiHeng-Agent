# ZhiHeng System Map

Status: current architecture
Release: Platform V5.3 / Knowledge K1.0.0

## Current product baseline

ZhiHeng is an evidence-first investment research application with a React/TypeScript browser client and a Python FastAPI backend. Python owns all HTTP, research, evidence, financial, model and persistence behavior. Node is a frontend build and test dependency only.

```text
User → React client → FastAPI
                       ├─ input contract / six research modes
                       ├─ security and market adapters
                       ├─ official/vendor/web evidence + integrity archive
                       ├─ immutable Knowledge snapshot
                       ├─ bounded context compiler + deterministic analytics
                       ├─ provider-neutral Model Gateway
                       ├─ research lifecycle / checkpoint / SSE
                       └─ MongoDB + GridFS
```

## Permanent research boundary

Evidence precedes conclusions. Missing data stays missing. Facts, calculations, claims, assumptions, forecasts, decisions and outcomes retain distinct semantics. Period, currency, share basis, accounting scope, valuation basis, publication time and provenance travel with the value. Resume preserves the original cutoff and only accepts compatible execution and Knowledge snapshots.

## Runtime boundary

- Browser: `src/`, including client-only display/domain rules under `src/domain/`, plus Vite and frontend tests.
- Backend: `python_backend/` only.
- Knowledge source: `knowledge/`, with active K-Series pointer and immutable snapshots.
- Persistence: MongoDB collections and GridFS; reports are views rather than canonical facts.

Completed pre-V5.3 release archives have been removed. Current behavior is documented here, in executable code, contracts, invariants, accepted ADRs and the V5.3 release specification.

## Long-term direction

```text
Evidence → Verified fact → Derived fact → Claim/belief
         → Assumption/forecast/scenario → Decision → Outcome → Learning
```

Future objects require an active release specification; this map does not authorize opportunistic implementation.
