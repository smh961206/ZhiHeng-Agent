# H0 audit findings

Status: CURRENT — audit of baseline `b7592abc4b888e218bbdfca958230366919ea3bb`; no runtime remediation in H0.

## Confirmed documentation deviations

| ID | Evidence / deviation | H0 correction / owning future work |
|---|---|---|
| H0-D01 | Model map omitted request/deadline wrappers and path/intent direct calls. | Map all owners and safety differences; V4.8/V4.9 convergence remains FUTURE. |
| H0-D02 | Knowledge snapshot pinning and precise rule-read provenance understated as future versioning. | Record current snapshot/index/excerpt implementation and tests; full K-Series governance remains V5.3. |
| H0-D03 | Object tables mixed CURRENT/PARTIAL/FUTURE without specifying what exists. | Use one implementation status per object, with explicit current predecessor and future boundary. |
| H0-D04 | Review/validation, GridFS payload ownership, delivery retry, UI/shared and acquisition modules missing or compressed. | Expand map and complete tracked inventory. |
| H0-D05 | Benchmark prose implies an executable quality system; directory contains three design files. | Mark benchmark framework FUTURE; preserve existing fixtures/diagnostics as CURRENT capabilities. |
| H0-D06 | H0 README/implementation subrelease names diverged from detailed index; generic template invites runtime changes. | Normalize H0.0–H0.3 and remove inappropriate runtime/schema/feature boilerplate. |
| H0-D07 | package test script covers 69 files / 505 cases; test:mongodb omits knowledge-api and research-resume integration files. | Document every runner; no package script mutation required. |
| H0-D08 | Linux deployment fixture omits shared/ although Dockerfile copies it and application imports it. | User-approved test-preparation exception: add shared/ to temporary copy list; preserve every assertion. |
| H0-D09 | Future release headers tied FUTURE status to CURRENT activation; V4.8 overview groups seven steps while its normalized index lists twelve. | Separate authorization from implementation/acceptance in future headers. Mark overview groupings historical; DETAILED_INDEX and normalized subrelease files are execution authority. No future specification/runtime is implemented by H0. |

## Architecture overlap and duplication risks

| Area | Current ownership distinction | Required future discipline |
|---|---|---|
| LLM transport | agent completion uses request/deadline/stream; path, security intent and Vision independently call completion endpoints. | Document distributed transport guards; consolidate only in V4.8/V4.9 with compatible request/response semantics. |
| SEC identity | sec-directory resolves ticker/CIK/company; security-exchanges retrieves exchange information. | Share existing source/cache boundaries where appropriate; do not introduce an independent master. |
| Report/web reading | official-reports and web-evidence share extraction/integrity but differ in acquisition/authority policy. | Reuse parsing while preserving trust and network boundaries; do not flatten them into a permissive fetcher. |
| Evidence / finance | evidenceBlocks is shared by retrieval and calculation verification; financial observations/vendor rows are predecessors to canonical Facts. | Extend the common block/source lineage, not a second financial truth store. |
| Calculation / scenario | sensitivities reuse dcf/dividend and returned tool records; valuation review compares records; valuation history fetches provider history. | Wrap existing math with lineage in V5.6 and scenario objects in V5.7; similarly named files are not interchangeable. |
| Knowledge | backups preserve content; snapshots select/pin validated runtime content; excerpts serve saved receipts. | Preserve all three responsibilities; historical CORE/FULL archives are not active duplicate source content. |
| Recovery / delivery | checkpoints save progress; retry resumes or restarts; calculation recovery helps repair tool failures; delivery retries durable terminal writes. | No parallel universal recovery subsystem without ownership and migration. |
| Server / shared | same-domain filenames separate server state transitions from frontend-safe projections and checks. | Follow imports before declaring duplication; do not move trust boundaries based on names. |

These are observed overlapping responsibilities and integration risks, not a claim that all are redundant implementations. H0 consolidates no runtime module.

## Invariant / ADR gaps and technical debt

| ID | Current fact and evidence | Obligation and disposition |
|---|---|---|
| H0-G01 | Provider/model branching and direct business call sites exist (agent, research-path, security-intent, vision-model). | ADR-002/014 are ACCEPTED design decisions, not evidence of Gateway implementation. Record FUTURE V4.8/V4.9; preserve current capability restrictions. |
| H0-G02 | Compatible resume reuses original sources/marketData; retry without compatible checkpoint rebuilds/recollects under the same job ID (research-retry). | INV-PIT-003 / INV-RES-004 enforce resume preservation. Broad “every retry/old job” wording is inaccurate. The explicit-new-job requirement is not fully represented by the restart branch; document the conflict, preserve code, defer lifecycle/PIT remediation. |
| H0-G03 | Web/disclosure followup can acquire additional material; no universal researchAsOf/publishedAt rejection was found. | ADR-004 and INV-PIT-001 remain obligations. Saved initial data is not full historical replay. V5.5/V5.11 must cover time/revision semantics. No retroactive guarantee or fabricated cutoff is added. |
| H0-G04 | verifyFinancialInputs returns matched-needs-review; period/column/currency/scope still need review. Validators enforce selected fields/evidence gates; prompts cover additional semantic obligations. | Evidence/financial invariants are retained unchanged. They are not proof of universal automatic financial verification; canonical Fact/type engines remain future. |
| H0-G05 | Review validates structure/references and requires audit information; counter-evidence retention and prompt-injection resistance also depend on model compliance. | INV-EVD-001/003, INV-RES-002/003 are mandatory but not mechanically proven for arbitrary content. Document coverage limits, not downgrade obligations or bypass gates. |
| H0-G06 | Private provider reasoning is persisted in checkpoint messages and omitted from publicJob/deltas; tests exercise this. | INV-MDL-006 concerns public exposure. Do not “fix” private same-provider continuation by stripping required state. Cross-provider isolation remains V4.8. |
| H0-G07 | Pending unsaved terminal results live in an in-memory Map (research-delivery). | Same-process save retry is CURRENT; durable recovery of an unsaved final result across process loss is not guaranteed. Do not advertise it; future lifecycle/reliability work requires release authorization. |
| H0-G08 | GridFS retains previous job payloads for readers; TTL caches can expire and replace entries. No canonical originally-reported/restated Fact store exists. | ADR-004/005/009/013 only partially realized. Job versions/cache hashes must not be called Fact revision ledger or immutable replay archive. Retained payload growth is operational debt. |
| H0-G09 | User-provided portfolio constraints and structured review decisions already exist, but no canonical mandate/position/decision policy registry or append-only override ledger exists. | Preserve current inputs and decision output; ADR-010/015 target engines remain V5.9/V6.0. |
| H0-G10 | Diagnostic/smoke scripts can call real providers/models; benchmark folder has no runner. | Frozen cases, graders, quality/cost promotion and statistical comparison remain V5.0+; H0 makes no model-quality claim. |

No accepted ADR decision was reversed. No ENFORCED rule was weakened. Current enforcement evidence is separated from unproven semantic coverage in the invariant notes and architecture-fitness document.

## H0 boundaries

Full UI execution exposed pre-existing selector, layout, copy and synchronization mismatches. The user's subsequent instruction to resolve them authorizes the three test-only repairs documented in [test failure analysis](test-failure-analysis.md), with all scenarios and equivalent business validations preserved. These findings never authorize runtime changes; any unresolved test failure still prevents acceptance.

No business/API/schema/financial/Evidence/Knowledge-content/acquisition changes. No V4.8+ feature implementation. If an existing test exposes a product defect, diagnose and report it without fixing runtime in H0; CURRENT stays H0 until the full acceptance gate passes. Environment failures are not test passes.
