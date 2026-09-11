# ZhiHeng System Map

Status: CURRENT + TARGET MAP

V4.9 current acceptance update: all normalized V4.9.0–.8 engineering work is implemented; batch-nine live Vision quality is [operator-approved](../releases/V4.9/vision-operator-approval-20260911.md). Production routing remains disabled and activation still requires the approved code/configuration binding. Earlier release-stage statements below are historical snapshots, not the current acceptance status.

V4.9 review fixes retain the diagram and owners below: durable local Vision comparison progress/resume, selected-profile status, admission cache invalidation, and coordinated cancel/retry finalization. No distributed infrastructure or Mongo schema change. See [fix report](../releases/V4.9/V4_9-review-fixes-report.md).

V4.9 full implementation: canonical image requests/results and explicit challenger profiles now reuse the existing Gateway/adapter; bounded independent fallback and a separate Vision admission owner preserve job pins. A 48-original visual corpus and deterministic graders support comparison. Offline implementation is validated; actual candidate quality and production promotion are not accepted. See [report](../releases/V4.9/V4_9-completion-report.md). The earlier .0 activation paragraph below is historical.

Release activation 2026-09-11: the user explicitly selected V4.9. V4.9.0 adds a [reviewed Vision inventory](../releases/V4.9/vision-call-inventory.md) and development checks without changing the runtime diagram. V4.9.1–.8 remain future work; V4.8.11 live text-policy quality acceptance remains deferred and legacy stays the production default. References below to V4.9 not having started retain their earlier V4.8 historical context.

## Current product baseline

The current repository is a React + Node.js evidence-first investment research Agent. The public repository currently exposes:

- six research task paths;
- automatic market / filing / structured-data acquisition;
- document parsing, PDF text extraction, OCR and Vision reading;
- Evidence retrieval and original-page reading;
- deterministic financial and valuation tools;
- model-based research and independent review;
- checkpoint/resume with original market cutoff preservation;
- Knowledge modules and automatic snapshots;
- A/H/US security resolution support;
- official web evidence supplementation.

## Current high-level runtime

```text
User
  ↓
Research Path / Input Validation
  ↓
Research Create / Plan
  ↓
Data Acquisition
  ├─ Market
  ├─ Official Reports
  ├─ XBRL / Provider Financials
  ├─ User Materials
  └─ Web Supplement
  ↓
Document / Evidence Processing
  ├─ Text
  ├─ PDF Layout
  ├─ OCR
  ├─ Vision
  └─ Evidence Blocks
  ↓
Research Agent
  ├─ Evidence Search
  ├─ Original Page Read
  ├─ Deterministic Tools
  ├─ Follow-up Retrieval
  └─ Valuation Tools
  ↓
Draft
  ↓
Review / Validation
  ↓
Storage / Delivery / Resume
```

V4.8.4 completes Gateway migration for research, review, followup, path classification, security intent and Vision, including the synthetic diagnostic. Business orchestration, evidence validation, router caches/fallback and visual processing remain in the owners shown above. Later .8–.11 now add health, persistent pins and gated internal policy; production still uses legacy.

V4.8.5 added a pure complexity evaluator over structured signals, initially without runtime callers. V4.8.6's shadow observer below now consumes it. It does not choose execution models, alter research budgets, persist state or change validation. See the [implementation map](current-implementation-map.md) for known-signal scoring and integration boundaries.

V4.8.6 adds opt-in dry-run policy observation at Gateway. Agent supplies known mode and planned history years; the unchanged complexity evaluator yields a candidate slot/effort recorded separately from the actual legacy execution profile. Server logs are best effort, not public history or persistent ModelCall records. Requests, review/delivery, financial/Evidence rules and checkpoints remain unchanged. Production policy acceptance remains pending; .11 has an executable closed gate.

## Target long-term runtime

```text
Reality
  Source / Event / Raw Data
          ↓
Truth
  Evidence → Verified Fact → Derived Fact
          ↓
Belief
  Hypothesis → Claim → Probability / Uncertainty
          ↓
Future
  Assumption → Forecast → Scenario → Valuation
          ↓
Decision
  Mandate → Opportunity Cost → Position → Portfolio
          ↓
Outcome
  Return / Event / Attribution
          ↓
Learning
  Calibration → Failure → Knowledge / Policy Upgrade
```

## Permanent boundary

Each target layer must be introduced incrementally. A FUTURE object must not be implemented merely because it appears on this map.

## H0 calibration

The current framework/Knowledge baseline is 4.7, distinct from Harness CURRENT. Acquisition is bounded and may be partial. Compatible resume preserves saved initial market data; rejected checkpoints restart acquisition. Full historical publishedAt enforcement/replay is not implemented. See [implementation map](current-implementation-map.md) for exact owners and limitations.

## V4.8.7 telemetry integration

V4.8.7 adds ModelCall started/terminal records through the existing Gateway, a process-local AsyncLocalStorage job attribution scope in the existing server execution path, and MongoDB model_calls storage with an on-demand internal job usage summary. No prompts, messages, source bodies, hidden reasoning, endpoint URLs or credentials are retained. Default production telemetry is enabled; MODEL_TELEMETRY_ENABLED=false disables the writer without changing routing. Standalone Gateway/CLI consumers need an injected onModelCall sink or configured writer; no database is opened implicitly by the Gateway. Acceptance is tracked in the V4.8.7 completion report.

## V4.8.8–.11 current model boundary

Recent health outcomes/cooldown are process-local; model-state pins live privately in new jobs/checkpoints. Internal MAIN/PRO profiles and acknowledged context rebuild support safe escalation. The rollout owner accepts only a matching operator-approved real model comparison with at least 50 unique cases across six modes, no critical fact errors, and passing delivery/citation/rollback checks. No such live report was produced: the user explicitly chose offline validation and legacy default. Existing research, Evidence, financial math, Knowledge and acquisition owners remain; V4.9 is not started.
