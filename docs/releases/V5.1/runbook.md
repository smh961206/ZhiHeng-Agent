# V5.1 operations

当前逐字段说明与可复制命令：[模型费用与缓存记录配置教程](../../cost-configuration-guide.md)。本页预算步骤仅记录 V5.1 发布时的历史行为，当前配置已退役预算限制。

Implementation Status: CURRENT for scoped engineering. Real model quality and measured production savings are not asserted. V5.0 live acceptance remains paused. No user-facing manual model picker is added.

## Observe costs

Open a saved research task → 研究过程 → 费用与研究预算. The panel loads GET /api/jobs/:id/cost only when opened. Unknown costs remain unknown; different currencies remain separate. The view includes calls by purpose/model, known costs, cache coverage and saved budget limits. Retry transport attempts without usage cannot be priced from a final successful response. These are model-fee estimates, excluding unknown external data-service fees.

Existing ModelCall storage is the source; no historical backfill runs. Disabled/missing telemetry cannot prove zero consumption. Successful telemetry is best-effort; only a configured budget uses mandatory durable accounting before work.

## Configure prices

Copy config/pricing.example.json to config/pricing.local.json (or pricing.production.json), retaining historical entries, and set MODEL_PRICING_FILE to that private file. The shipped empty registry intentionally leaves all prices unknown. A registry entry has profileId, connectionIdentity, recordedAt, and pricing. Obtain the opaque identity using the existing server/model-connection.mjs modelConnectionIdentity with the matching Catalog profile and effective server environment; never put endpoints or keys in the registry.

Pricing v1 requires schemaVersion, version, effectiveFrom, effectiveTo, currency, unit=per-million-tokens, input, output, cacheRead. Dates use canonical UTC milliseconds. Rates are finite nonnegative numbers or null. Entries bind exact profile/connection identity; effective windows are [from,to), non-overlapping. recordedAt cannot be later than the call. Unknown history is not reconstructed from a later price announcement.

Pricing v2 adds timezone (IANA) and tiers. Each tier has id, startMinute, endMinute, input, output, cacheRead. Minute intervals are half-open; start > end crosses midnight, and uncovered hours use base rates. Overlapping tiers are invalid. The same UTC call instant selects each candidate's local tier, including DST; no request is postponed to get a lower rate. Every calculated receipt retains the exact schedule, version, call time and hash.

The server reads a price snapshot before dispatch and does not fetch rates from the web. Invalid pricing leaves telemetry cost unknown. To validate a file without model calls, import loadPricingRegistry from server/model-pricing.mjs. The tests and frozen benchmark deliberately use synthetic rates, not current supplier quotes.

## Budget rollout and recovery

Copy config/research-budget.example.json to a private local/production file and set RESEARCH_BUDGET_FILE. With FEATURE_RESEARCH_BUDGET=false, new jobs save an observational budget. After reviewing reliable history and the quality consequences of the exact limits, set FEATURE_RESEARCH_BUDGET=true for newly created jobs. Actual environment files were not modified by this release.

Limits and mode are pinned at creation; existing jobs do not inherit a new file or switch from observation to enforcement. FEATURE_RESEARCH_BUDGET=false disables enforcement for saved budgeted jobs while preserving receipts. The existing quality approval fingerprint now binds the configured budget/mode and monetary pricing configuration; a changed budget invalidates the old approval instead of silently reducing research quality.

Budget resources are model calls, tool rounds, web searches/document reads, unique original pages per Vision request and elapsed duration. Network redirects/internal data-provider requests are not all counted as separate web operations. Existing acquisition, web, page and model limits still apply independently. Duration is enforced at new resource boundaries; an already running operation remains under its original transport deadline. Waiting between retries does not reset the original budget start or market/data cutoff.

A monetary reservation needs known rates and declared context/output ceilings; absent ceilings or prices stop enforced monetary work with an explicit gap. The reservation is a conservative estimate across allowed transport attempts, not provider invoice reconciliation. A retried request with unknown prior charges leaves cost incomplete and prevents subsequent monetary authorization. No token count is invented as an observation.

Every resource reservation and settlement is durably saved through the existing job owner. Completed tool rounds are not charged twice. A process loss with a reserved request, or a completed request whose output did not reach its original checkpoint, pauses instead of automatically replaying it. Reconcile the original operation before continuing; do not delete a reservation to guess it failed. There is no automatic uncertain-request reconciliation in this release. Compatible completed checkpoints continue with their original tools, sources and budget.

Near budget pressure, only exact repeated local retrieval over an unchanged source snapshot reuses its previous result. Other evidence, counter-evidence, calculations and validation are not removed by a guessed priority score. If required work cannot fit, the task fails with a saved gap and cannot become a validated delivery.

## Cost ranking and cache

server/model-champion.mjs exports rankModelCosts as a read-only operational API. It validates the existing artifact-bound quality policy, requested capabilities/effort, health and matching task/profile cost cohort before ranking. Currencies are separate. FEATURE_COST_ROUTER=true only labels the output dry-run; it never changes production selection or saved pins. A complete cheap cohort with quality regression still fails.

Cache-eligibility-1 requires at least 30 provider-observed calls across five jobs in the preceding seven days, at least 90% known coverage and an observed cached-token ratio of 50%. Exact text prefix/profile/connection must match. Cache advantage is never assumed for images or missing observations; no speculative cache discount is subtracted from measured effective task cost.

## Deployment and verification

For containers, explicitly bind private price and budget JSON files read-only and set their in-container paths. compose.models.yaml continues to own only model definitions; price/budget files are not silently copied into an image. Keep private files and policy registry under operator access control.

Run pnpm test:cost, pnpm test, existing Mongo/API/restart/UI/deployment suites, and `node scripts/cost-benchmark.mjs --out <new-file>`. The benchmark refuses overwrite and makes zero model requests. Its frozen six-case output distinguishes lower known cost from failed delivery, critical errors, unknown usage/retries and incomparable currencies. Existing text/Vision benchmarks continue to own model evaluation.
