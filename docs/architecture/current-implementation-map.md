# Current Implementation Map

Status: CURRENT BASELINE — MUST BE RE-VALIDATED DURING H0

This map is based on the current public repository layout. Codex must re-check the real checkout before modifying code.

## Model / LLM

CURRENT:
- `server/model-routing.mjs`
- `server/model-stream.mjs`
- `server/vision-model.mjs`
- `server/material-vision.mjs`
- `server/visual-reading.mjs`

Observed direction:
- model routing is currently provider/model-config centric;
- streaming already contains important safety behavior;
- Vision is separate from research/review model behavior.

Target:
- converge through Model Gateway in V4.8/V4.9.
- do not build a second stream parser.

## Research orchestration

CURRENT:
- `server/agent.mjs`
- `server/agent-execution.mjs`
- `server/research-create.mjs`
- `server/research-workflow.mjs`
- `server/research-context.mjs`
- `server/research-output.mjs`
- `server/research-delivery.mjs`
- `server/research-path.mjs`

Target:
- preserve workflow semantics;
- gradually make Research State structured in V5.7;
- later introduce Research IR without replacing current context prematurely.

## Resume / recovery

CURRENT:
- `server/job-checkpoints.mjs`
- `server/research-resume.mjs`
- `server/research-retry.mjs`
- `server/calculation-recovery.mjs`

Permanent requirement:
- old jobs remain resumable;
- original market/data cutoff remains stable;
- pending model/tool boundaries must be safe before provider/model switches.

## Knowledge

CURRENT:
- `server/knowledge.mjs`
- `server/knowledge-excerpt.mjs`
- `server/knowledge-snapshots.mjs`
- `knowledge/`
- automatic version snapshots

Target:
- V5.3 evolves current system into Rule IDs, K-Series, ontology, resolver, linter and regression.
- do not replace current snapshot mechanism without proving migration.

## Evidence

CURRENT:
- `server/evidence-search.mjs`
- `server/evidence-followup.mjs`
- `server/agent-page-reader.mjs`
- `server/web-evidence.mjs`
- `server/web-evidence-request.mjs`
- `server/web-research.mjs`
- `server/data-archive.mjs`
- `server/document-integrity.mjs`

Target:
- V5.4 adds canonical Source/Evidence contracts, BM25, semantic retrieval and fusion.
- current exact / alias / page retrieval remains important.

## Document / OCR / Vision

CURRENT:
- `server/document-reader.mjs`
- `server/document-layout.mjs`
- `server/pdf-extractor.mjs`
- `server/pdf-processing.mjs`
- `server/pdf-ocr.mjs`
- `server/ocr-image.mjs`
- `server/material-vision.mjs`
- `server/visual-assets.mjs`
- `server/visual-reading.mjs`

Permanent requirement:
- Vision/OCR readings are not automatically verified financial facts.
- retain extraction limits and uncertainty metadata.

## Security identity

PARTIAL:
- `server/security-resolver.mjs`
- `server/security-intent.mjs`
- `server/security-exchanges.mjs`
- `server/sec-directory.mjs`

Target:
- evolve into stable Issuer/Security/Listing/ShareClass model in V5.5.
- do not create parallel “security master” while leaving resolver logic disconnected.

## Financial observations / data basis

PARTIAL:
- `server/financial-observations.mjs`
- `server/financial-input-verification.mjs`
- `server/data-basis.mjs`
- `server/inline-xbrl.mjs`
- `server/tushare-financials.mjs`
- `server/longbridge-fundamentals.mjs`

Target:
- these are primary candidates for evolution into the V5.5 Fact Engine.
- do not ignore or duplicate them.

## Calculations / valuation

CURRENT/PARTIAL:
- `server/calculations.mjs`
- `server/cashflow-bridge.mjs`
- `server/normalized-earnings.mjs`
- `server/reinvestment.mjs`
- `server/research-sensitivity.mjs`
- `server/valuation-snapshot.mjs`
- `server/valuation-history.mjs`
- `server/valuation-review.mjs`
- `server/shareholder-return.mjs`

Target:
- V5.6 adds formula identity, input lineage, assumptions and dependency DAG around existing math.
- financial formulas must not be casually rewritten.

## Storage / migration

CURRENT:
- `server/storage.mjs`
- `server/schema-migrations.mjs`
- `server/migrate.mjs`

Target:
- all later persistent objects use additive migration discipline.

## Test baseline

CURRENT:
The repository already contains substantial tests covering:
- agent behavior;
- calculations;
- evidence integrity;
- document parsing/OCR;
- research creation/path/delivery/recovery/resume;
- Knowledge modules/snapshots;
- market resilience;
- report citations/warnings;
- review recovery;
- framework alignment.

Every release must run the existing suite in addition to new tests.

## H0 action

H0 Codex must:
1. re-scan the actual checkout;
2. update this map when files changed;
3. flag overlapping responsibilities;
4. make no runtime behavior changes.
