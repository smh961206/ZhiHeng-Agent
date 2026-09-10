# H0 test failure analysis and resolution

Status: CURRENT — historical failures and authorized test-only repairs. Final acceptance is recorded in [completion report](completion-report.md).

## Authorization and unchanged boundaries

The initial H0 scope allowed only deployment fixture preparation. After the 22 UI failures were reported, the user instructed “解决”. This authorizes resolving those stale test contracts and synchronization defects in `tests/workspace-ui.integration.mjs`, `tests/workflow-ui-scenarios.mjs` and `tests/agent-capabilities-ui-scenarios.mjs`. It does not authorize product changes. Runtime source, Knowledge, finance, Evidence, acquisition, model behavior, dependencies and configuration remain at the original baseline.

All 271 registered scenarios are retained. No scenario, fixture, business validator or financial assertion is deleted or skipped. Obsolete presentation assertions are replaced with explicit assertions against the existing UI. Original retry, cutoff/input preservation, export eligibility, privacy, upload and no-silent-job-creation checks remain. Test timeouts and the acceptance runner are unchanged.

## Reproduction history

The first full UI run had 248 passed / 23 failed; a normal Vite server logged Harness-triggered page reloads. A second isolated full run had 249 passed / 22 failed, all 271 executed, exit 1. These failures and screenshots remain under `artifacts/h0-ui/` and `artifacts/h0-ui-final/`; they are not retrospectively marked passed.

The first repair iteration had 14/25 related scenarios pass. It exposed previously unreachable stale expectations, and one retry scenario was interrupted by a Vite reload caused by a test-file edit. The second iteration passed 22/25; the remaining three mobile directory checks raced tab/navigation scroll restoration. After awaiting the settled reading tools, the five corresponding mobile/desktop scenarios passed. These are diagnostic subset runs, not substitutes for full acceptance. The final server excludes docs, tests and ignored artifacts from watching; final acceptance removes UI_TEST_FILTER and executes all 271 scenarios.

## Causes, repairs and retained checks

| Group | Current-code evidence / cause | Test-only resolution and retained coverage |
|---|---|---|
| UI-01 | RecentResearch.jsx renders rr-status, optional rr-outcome and time; rr-mode no longer exists. | Check four timestamps, exact first-record creation time/title, existing statuses, active link, export and report navigation. |
| UI-02 | ResearchDetail.jsx ReadingTools exposes the compact directory only in report view after the article crosses the toolbar threshold. Tab/navigation effects restore scroll asynchronously; drafts have a different accessible article label. Desktop uses a persistent trigger. | Establish report tab and scroll into the actual article; await visible tools with the existing bounded eventual helper. Test mobile absence on other tabs/empty reports and desktop disabled state. Preserve layout, keyboard focus, retained headings, draft privacy and export blocking. Capture the open directory without a screenshot helper scrolling it closed. |
| UI-03 | ResearchActions export composes Button with PopoverTrigger, yielding data-slot=popover-trigger. | Explicitly check the export trigger slot and button slots for all other actions; preserve responsive layout/navigation/export checks. |
| UI-04 | An empty automatic ResearchWorkbench awaits input and shows generic examples. The deep example is now an explicit BYD A-share question; depth help wording changed. | Select deep research before choosing its example. Assert the current A-share question, capital return/common equity/valuation basis, complete depth, five years, CN/002594 payload, and no job creation until submit. No A/H identity or financial rule is changed. |
| UI-05 | audit-coverage.mjs displays included/total ratios: 3/5 evidence blocks and 2/4 tool records. | Check both exact ratios, omitted-record limits and “资料已送审不等于事实已核实”. Evidence coverage is not reduced or relabeled as verified truth. |
| UI-06 | A fixture hold release resolves a Promise; HTTP responses, React updates and SSE failures arrive asynchronously. | Await each running/failed transition before the original state assertions. Retain double-click request lock, same ID/date/URL/input/sources/baseline, no create call, retry counts, stream reconnection and completion checks. No fixed sleeps, timeout increase or assertion retry after a failure. |
| UI-07 | A first-run mobile click was detached during a Vite reload; it passed the isolated full rerun. A repair iteration also observed a test-file reload. | Preserve the scenario. Exclude Harness/test-file changes in an ignored test-server configuration and retain every run's result; do not infer a product defect solely from this environmental interference. |
| UI-08 | ResearchMaterials is wrapped by workbench-materials-target; deep execution overview can occur between securities and that wrapper. | Assert common-parent document ordering after securities and immediately before settings. Preserve actual image upload, OCR text, original image dimensions, no remote requests/browser OCR workers, exactly one backend request and verified=false submitted material. |
| UI-09 | ResearchPreparation uses a Sheet for delivery scope instead of preparation-outline details/summary; report/review/evidence metadata is in the preparation facts. | Assert closed state, click and keyboard opening, current scope and limitation copy, Escape/focus restoration, eight shareholder-return sections, fixed eight-year submitted window, invalid-code blocking, optional materials and no silent submit. |
| UI-10 | ResearchCapabilities uses the catalog title “回到指定原页” and the link “查看取证与复核说明”. | Assert current copy and use the region-scoped handbook link. Preserve absence of unsupported example pages/tabs, overflow checks and zero research creation. |

## Deployment and environment

The Linux deployment test omitted `shared/` while Dockerfile and application imports require it. Its approved one-list correction copies that directory into the temporary build context; all original deployment assertions remain byte-equivalent. Expected injected build and migration failures are assertions in the successful lifecycle test, not acceptance failures.

The local Docker engine was initially stopped during the repair turn. Starting the installed Docker Desktop restored the Linux engine; no repository dependency or runtime setting changed. MongoDB runs use a dedicated loopback container and UUID temporary databases. UI APIs use in-memory synthetic fixtures. Deployment uses a unique Compose project and a read-only source mount.

## Acceptance evidence

Original baseline hashes are preserved in `artifacts/h0-baseline-hashes.json`; the tracked repository inventory remains the pre-H0 inventory. The change audit explicitly allows the three authorized UI files and the exact deployment copy exception, while all 917 other protected files must match baseline. The pre/post UI scenario-name census must be identical. The full completion report records final command exit codes, actual counts, logs, remaining limitations and CURRENT handoff; any unresolved failure keeps CURRENT=H0.
