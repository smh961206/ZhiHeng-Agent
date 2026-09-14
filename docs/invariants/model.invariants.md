# Model Invariants

Current enforcement owners: `python_backend/infrastructure/model_gateway.py`, `infrastructure/model_adapter.py`, `python_backend/domain/model_governance.py`, `python_backend/application/research_service.py` and Python tests.

- **INV-MDL-001 [ENFORCED]:** Business code selects a model purpose and does not infer capability from concrete provider or model names.
- **INV-MDL-002 [ENFORCED]:** All model transport passes through the Python Model Gateway.
- **INV-MDL-003 [ENFORCED]:** Missing data is never a model escalation reason.
- **INV-MDL-004 [ENFORCED]:** Provider, transport and HTTP failures are health failures; they do not become evidence or reasoning-quality signals.
- **INV-MDL-005 [ENFORCED]:** Hidden provider reasoning, credentials, endpoints, prompts and source bodies are not exposed through public model status or telemetry.
- **INV-MDL-006 [ENFORCED]:** Unknown token usage or pricing produces unknown cost, never zero cost.
- **INV-MDL-007 [ENFORCED]:** Candidate selection requires declared purpose, enablement and current health before quality or priority ranking.
- **INV-MDL-008 [ENFORCED]:** Model configuration changes do not silently rewrite saved task identity, research cutoff, Knowledge snapshot or human overrides.
- **INV-MDL-009 [CURRENT]:** Critical-review and judge purposes remain unconfigured unless explicitly supplied; their absence does not weaken ordinary validation.
- **INV-MDL-010 [CURRENT]:** Benchmark, Champion and A/B rollout artifacts are not production runtime dependencies.
- **INV-MDL-011 [ENFORCED]:** Optional independent dispatch requires a durable reservation, pinned profile and complete original-cutoff evidence. Uncertain/rejected sessions cannot replay automatically. Judge output is advisory and cannot bypass final audit or overwrite human overrides. Tests: `python_tests/test_independent_review.py`, `python_tests/test_judge.py`.
- **INV-MDL-012 [ENFORCED]:** Research-budget reservations precede resource dispatch. Unknown usage or price never becomes zero cost, and an unfinished reservation blocks automatic replay.
- **INV-MDL-013 [ENFORCED]:** Vision quality scores remain benchmark evidence and never promote extracted values into verified financial facts.
- **INV-MDL-014 [ENFORCED]:** Unknown model configuration fields, embedded secret fields, non-finite quality values and invalid priority/window/currency metadata fail closed.
- **INV-MDL-015 [RETIRED]:** Champion/Challenger, A/B experiments, drift monitoring, complexity routing and checkpoint model escalation are intentionally excluded from the Python runtime.

Architecture fitness checks reject direct provider calls outside the infrastructure adapters, recreated Node backend model clients, model-name branching in business modules and public leakage of protected model context.
