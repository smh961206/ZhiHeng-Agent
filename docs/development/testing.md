# Testing Strategy

## CURRENT executable baseline (H0)

The pre-H0 checkout has 69 node:test unit files / 505 tests, eight MongoDB integration files, five route-render assertions, a Playwright/Edge UI runner with imported scenario modules, and a Linux deployment integration script. H0 adds seven Harness static tests. Counts from actual runs, rather than source estimates, are authoritative in the H0 completion report.

Run every entry below from the repository root:

```text
pnpm test
pnpm test:mongodb
node --test tests/knowledge-api.integration.mjs tests/research-resume.integration.mjs
pnpm test:routes
pnpm test:ui
bash tests/deploy.integration.sh
```

`pnpm test` discovers only `tests/*.test.mjs`. `test:mongodb` lists six files; the two extra integration files above are required. The UI runner imports its scenario modules, so they are not separate node:test runners. Do not set UI_TEST_FILTER for full acceptance. Deployment is a separate existing Linux test, not included in package scripts.

### Isolated test environment

- Set MONGODB_URI explicitly to a disposable loopback MongoDB. Integration tests create UUID-named temporary databases and clean up only those databases. Do not run against the production database/service or invoke the application migration command on real data.
- Start a loopback Vite frontend using the existing local Vite binary. UI_BASE_URL chooses the port; UI_ARTIFACT_SUBDIR separates results; PLAYWRIGHT_MODULE may reference an existing external Playwright installation. The runner uses Edge and intercepts synthetic APIs, without a real research backend.
- Run deployment in Linux with Docker Compose. Its script copies the runtime into mktemp, names an isolated Compose project and exercises deployment/upgrade/backup/rollback/failure handling. H0's approved preparation fix includes shared/ in this copy. All original assertions remain intact. Never use production Compose project/volumes for this test.
- Environment-only helpers, logs and screenshots belong in ignored artifacts or isolated test containers; no dependency/lockfile/production configuration changes are needed.

### Harness checks and evidence

`tests/harness.test.mjs` checks navigation, current paths, status declarations, normalized H0 section order, manifest hashes and the deployment fixture COPY boundary. It does not require future Gateway/Fact/ResearchState runtime modules. MANIFEST.json excludes itself and records packaged file byte sizes and SHA-256; refresh its entries after any packaged Harness edit. The inventory hashes preserve the pre-H0 runtime baseline, not a permanent prohibition on later authorized evolution.

Record each command, environment, exit code, test counts and failures. Missing services/browser dependencies are not passes. A product defect discovered in H0 is diagnosed and reported without changing runtime; unresolved failures prevent CURRENT handoff. See [fitness baseline](architecture-fitness.md) and [audit findings](../releases/H0/audit-findings.md).

The user's follow-up authorization permits the three UI test alignment repairs detailed in [failure analysis](../releases/H0/test-failure-analysis.md). Preserve all registered scenarios, business/Evidence/recovery checks and the original test timeout. Mobile directory checks establish report scrolling; asynchronous retry checks await state settlement. Delivery scope and metadata assertions follow current accessible UI controls. Exclude test/document/artifact edits from the temporary test server's file watching to avoid reload interference; final acceptance must unset UI_TEST_FILTER.

## TARGET test architecture

Layers:
1. Unit tests
2. Contract tests
3. Architecture fitness tests
4. Integration/resume tests
5. Golden fixtures
6. Release benchmark
7. Red-team/adversarial tests

High-priority adversarial cases:
- wrong year/unit/currency;
- A/H/ADR identity confusion;
- restated historical financials;
- prompt injection in web/PDF/image;
- user-supplied wrong premise;
- missing data;
- conflicting sources;
- one-off profit;
- cycle-peak earnings;
- pending tool calls during model/provider failure.
