# Model Gateway

Status: ACCEPTED

## Decision

Business logic expresses a model purpose and required capability. Provider identity, model identity, endpoint details, credentials and wire-protocol behavior belong behind the Model Gateway.

## Current implementation

`python_backend/infrastructure/model_gateway.py` is the single model transport boundary and `infrastructure/model_adapter.py` owns the wire protocol. They load schema-v2 configuration, resolve the model assigned to a pipeline purpose, validate credentials and perform complete or streaming requests. `python_backend/domain/model_governance.py` provides deterministic health, candidate and usage helpers.

## Consequences

- Business modules must not call provider endpoints or branch on concrete model names.
- Configuration and adapters may contain provider-specific details.
- Missing configuration or credentials fail explicitly.
- Public status excludes endpoints, credentials, prompts and hidden reasoning.
- Saved task compatibility, model identity, research cutoff and Knowledge pins cannot be silently rewritten.
- A new transport or routing policy must extend this boundary instead of creating a parallel model client.

See the [current implementation map](../architecture/current-implementation-map.md) and [model system](../architecture/04-model-system.md).
