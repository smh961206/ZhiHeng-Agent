# Model System

Status: current
Release: Platform V5.3 / Knowledge K1.0.0

## Runtime ownership

`python_backend/infrastructure/model_gateway.py` and `python_backend/infrastructure/model_adapter.py` are the only model transport boundary. Business modules select a purpose such as `researcher`, `writer`, `vision`, `evidenceVerifier`, `auditor`, `criticalReviewer` or `judge`; they do not select a provider by name or call provider endpoints directly.

`config/models.local.json` uses schema version 2. It declares provider-neutral model entries and maps pipeline purposes to those entries. Secrets are resolved only through the configured environment-variable names. Invalid files, missing models and missing credentials fail explicitly.

## Request behavior

The gateway sends OpenAI-compatible `/chat/completions` requests through `httpx`, supports complete and streaming responses, applies bounded connect and request timeouts, and exposes only safe public selection/status data. Provider credentials, prompts and hidden model reasoning are not written to public history.

## Governance

`python_backend/domain/model_governance.py` owns deterministic supporting rules:

- token usage and price calculation preserve unknown cost when usage or pricing is missing;
- request fingerprints bind purpose, messages and contract version;
- candidate selection filters by declared purpose, enablement and health before sorting by quality and priority;
- repeated failures can temporarily block a candidate;
- usage summaries distinguish known and unknown cost calls.

These helpers do not establish a benchmark platform, Champion registry, A/B rollout system or automatic model promotion. The removed benchmark and historical release archives are not runtime dependencies.

## Compatibility and recovery

Saved model identity and execution compatibility remain part of task recovery. A resumed task must retain its original research cutoff, Knowledge snapshot and compatible execution scope. Configuration changes do not silently rewrite historical records or replace a human override.

## Current configuration

The checked-in example maps normal analysis and vision stages to configured models and leaves critical-review and judge stages empty. Concrete provider/model names belong only in configuration adapters; business behavior must remain capability and purpose based.

Both optional stages now have Python orchestration. `application/independent_review.py` owns durable one-dispatch sessions; `domain/independent_review.py` owns admission and complete point-in-time context; `domain/judge.py` owns comparison and advisory output validation. `research_service.py` triggers exceptional critical review after failed ordinary repair, and handles a typed audit `judgeRequest` before final audit. `domain/research_budget.py` supplies the optional Python-native resource ledger without affecting model choice or evidence scope. No Champion registry or distributed worker service is introduced. See [implementation and compatibility report](../releases/V5.3/independent-review-migration.md).

## Validation boundary

Python tests verify gateway configuration, streaming, model-governance calculations and the absence of a Node backend runtime. Architecture checks reject direct provider behavior outside the Python gateway boundary.
