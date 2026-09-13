# M1.1.0–M1.1.3 Completion Report

## Outcome

The first M1.1 implementation batch is active for new modelState-v4 tasks. It reduces initial serialized tool definitions, compacts long Researcher histories earlier at safe boundaries and gives Writer a dedicated evidence packet with deterministic integrity findings. Existing research capabilities and old task recovery remain available.

The platform presentation is synchronized with this behavior. Home and handbook explain path-scoped preparation in investor language without exposing internal release tracks; the workbench shows a distinct three-step execution preview for every research path; the platform popover explains research principles instead of model internals; history prioritizes research state and judgment; and research details prioritize basis, progress and source coverage while retaining saved model assignment and actual call/Token records inside the collapsed “服务与用量记录” troubleshooting section.

The home and handbook now have separate user roles. Home introduces the product, explains the value of evidence-backed and updateable research, presents applicable research scenarios, and leads users from a first experience to the service offering. Handbook is the operating manual: its default tutorial covers creation, materials, progress, report reading, reuse, and failure recovery, while method, usage boundaries, and terminology remain available as reference chapters.

## Engineering record

| Item | Result |
| --- | --- |
| Release/subrelease | M1.1.0–M1.1.3 |
| Architecture | Extended existing Agent, research-context, execution, telemetry and existing platform presentation owners; added a presentation-only `ResearchModelSummary` extracted from the prior document-reading panel; no parallel runtime subsystem |
| Schema | Additive optional `modelState.contextVersion=1`; public cost API receives additive `usage` fields |
| Migration | No backfill; modelState v1–v3 and pre-M1.1 v4 records without `contextVersion` stay on the historical request path |
| Environment | No new variables or files |
| Feature activation | Automatic for modelState v4; historical states remain compatible |
| Recovery | Pending tool calls remain uncompressed; original evidence, tool receipts, cutoff and model pins remain stored |
| Security/privacy | Token aggregates contain counts only; no prompt, evidence body, hidden reasoning or credential is added |
| Rollback | Restore the pre-M1.1 runtime and presentation files; additive API fields can be ignored by old clients |

## Automated context-footprint check

`pnpm benchmark:context` performs no model or network calls and requires no manual validation. Across the six path definitions, the initial serialized tool payload falls from 132,195 to 111,518 characters, a deterministic reduction of 20,677 characters (15.64%). Mode A was already constrained and remains unchanged; B, C, D, E and F all shrink.

This character measurement is not presented as provider Token usage. Actual input/output/cache Token values continue to come only from normal ModelCall telemetry, with missing provider values retained as unknown.

## Compatibility and limitations

- The first batch does not yet delta-pack Auditor repair rounds or change Vision requests.
- Writer integrity findings are supplied to Writer and Auditor so unsupported material is removed or retained as missing; final deterministic validation remains authoritative.
- Historical requests, including pre-M1.1 v4 tasks without `contextVersion`, deliberately keep their previous tool definitions and rule text, so their pinned wire and checkpoint hashes remain stable.
- Token reduction percentages from real research remain observational until enough ordinary tasks have provider-reported usage.

## Verification

All verification below is automated. No paid model trial, manual acceptance step or external model credential was used.

| Check | Result |
| --- | --- |
| Full unit suite | 946 passed, 0 failed |
| Release gate | 167 passed, 0 failed |
| MongoDB integration | 9 passed, 0 failed |
| Route rendering | 5 routes passed |
| Production build | Passed |
| Context footprint check | Passed; 15.64% deterministic initial tool-payload reduction |
| Full browser interaction suite | 338 passed, 0 failed; in-memory API fixtures only |
| Local browser read-only inspection | Passed; right-top status, investor-facing home and handbook copy, workbench path preview, reordered research process and collapsed advanced records verified |
| Diff whitespace validation | Passed |

Playwright is now a development dependency, so a clean checkout can run `pnpm test:ui` without a separately installed browser-test package. The suite covers the home, handbook, workbench, history and research detail pages at mobile, tablet, desktop and wide-screen sizes, including keyboard navigation, deep links, lazy loading, failure recovery and export choices. The shared UI wait bound is 15 seconds to tolerate occasional Vite compilation or browser garbage-collection pauses during the 338-scenario run while still failing a stalled interaction.

## Deferred work

M1.1.4–M1.1.7 remain deferred: Auditor repair-loop incremental packets, stable-prefix refinement, Vision deduplication review and longer-run per-delivery comparisons. M1.2 cross-task dependency reuse remains a separate future change.
