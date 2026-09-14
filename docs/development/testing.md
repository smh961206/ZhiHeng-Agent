# Testing Strategy

Status: current for Platform V5.3 / Knowledge K1.0.0.

## Default validation

Run tests directly related to the change. Broad UI regression, complete Docker deployment and rollback, real-model acceptance and model benchmarks require an explicit request.

Current commands:

```text
pnpm lint
pnpm typecheck
pnpm api:types:check
pnpm test
pnpm test:components
pnpm test:frontend
pnpm test:routes
pnpm test:python
pnpm build
```

- `tests/` owns focused browser-domain unit tests, TypeScript architecture checks and SSR route rendering.
- `tests/*.component.test.tsx` uses Vitest, Testing Library and jsdom for React interaction behavior.
- `tsconfig.strict.json` is the reviewed semantic type boundary; `tsconfig.json` remains the complete source-migration/build boundary while strict coverage expands by domain.
- `src/generated/api-schema.ts` is generated from FastAPI OpenAPI. `pnpm api:types:check` fails when the committed client contract is stale.
- `python_tests/` owns FastAPI, research, evidence, Knowledge, calculation, recovery and backend architecture tests.
- `tests/deploy.integration.sh` owns the isolated Linux deployment path and is run only when deployment validation is requested.
- Python tests that use `tmp_path` may need `--basetemp` on hosts whose system temporary directory is not writable.

## Architecture checks

Executable checks reject recreation of the retired `server/`, `shared/`, JavaScript/TypeScript backend benchmark and legacy Harness manifest boundaries. They also reject owned JavaScript source and imports into retired runtime roots. The retained `benchmark/` is Python-only migration acceptance code.

Tests must not pass by deleting assertions, weakening evidence or financial definitions, hiding missing data, bypassing point-in-time/provenance checks, or disabling resume and recovery guarantees.

## Test data safety

Use disposable loopback databases and synthetic fixtures. Never run tests against production databases, volumes, credentials or model services. Logs, screenshots and temporary test output belong in ignored artifact or temporary directories.

Git history may be used when an older test topology must be investigated. Only the commands above define the current executable test surface.
