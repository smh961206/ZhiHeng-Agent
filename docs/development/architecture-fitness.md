# Architecture Fitness

Status: current for Platform V5.3 / Knowledge K1.0.0.

## Executable boundaries

| Boundary | Current evidence |
|---|---|
| Python is the only backend runtime; retired Node dependencies and imports stay absent | `python_tests/test_no_node_backend_runtime.py`, `tests/typescript-migration.test.ts` |
| FastAPI owns application routes and built frontend delivery | `python_tests/test_fastapi_entrypoint.py`, `tests/routes.integration.ts` |
| Model behavior remains behind the provider-neutral gateway and governance layer | `python_tests/test_config_and_contracts.py`, `python_tests/test_model_governance.py` |
| Knowledge snapshots remain immutable, pinned and integrity checked | `python_tests/test_knowledge.py` |
| Evidence, documents and web acquisition preserve source boundaries | `python_tests/test_evidence.py`, `python_tests/test_documents.py`, `python_tests/test_web_evidence.py` |
| Financial and derived calculations remain deterministic | `python_tests/test_financial.py`, `python_tests/test_calculations.py`, `python_tests/test_analytics.py` |
| Recovery preserves compatibility and does not invent progress | `python_tests/test_recovery.py`, `tests/research-recovery.test.ts`, `tests/research-progress.test.ts` |
| Client presentation does not fabricate securities, citations, report state or warnings | focused tests under `tests/*.test.ts` |

These checks prove their concrete cases. They do not prove that every relevant source was discovered, every model response is correct or every future contract is implemented. Missing coverage remains a gap rather than permission to weaken evidence, point-in-time, provenance, financial or recovery rules.

## Future planning

Future V5.4–V6.0 specifications and the Master Roadmap remain planning material. They become executable scope only when `docs/releases/CURRENT` and explicit user authorization activate them. Architecture tests must not create empty future modules merely to make planning documents appear implemented.
