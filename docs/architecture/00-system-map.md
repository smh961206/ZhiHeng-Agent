# ZhiHeng System Map

Status: CURRENT + TARGET MAP

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
