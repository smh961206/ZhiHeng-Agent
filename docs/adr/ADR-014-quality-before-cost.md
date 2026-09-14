# Quality Before Cost

Status: ACCEPTED

## Decision

Model selection order is Capability → Quality → Health → Cost. A cheaper model cannot be selected when it materially reduces required research quality.

## Current implementation

`python_backend/domain/model_governance.py` filters candidates by declared purpose, enablement and health, then ranks eligible candidates by quality and stable priority. Usage cost remains unknown when token usage or pricing is missing. The current schema-v2 pipeline normally assigns configured models directly by purpose; automatic Champion promotion, A/B rollout and benchmark-driven production switching are not active systems.

## Consequences

- Missing data, provider failure and financial-validation failure do not authorize a stronger model.
- Cost optimization applies only after capability, quality and health requirements pass.
- Unknown cost must remain unknown rather than becoming zero.
- Model changes cannot silently alter saved task identity, evidence, cutoff or recovery state.
- Production promotion requires separate measured evidence and explicit authorization.
- Provider/model names remain configuration data and never become business rules.

See the [current model system](../architecture/04-model-system.md).
