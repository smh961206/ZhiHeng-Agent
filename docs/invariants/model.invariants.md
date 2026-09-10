# Model Invariants

- INV-MDL-001 [TARGET V4.8]: business code does not infer capability from concrete model names.
- INV-MDL-002 [TARGET V4.8]: data absence is never a model escalation reason.
- INV-MDL-003 [TARGET V4.8]: 429/5xx/transport failures are provider-health failures, not automatic intelligence escalation.
- INV-MDL-004 [TARGET V4.8]: do not switch providers/models between assistant tool_calls and execution of those calls.
- INV-MDL-005 [TARGET V4.8]: hidden provider reasoning is not transported across providers.
- INV-MDL-006 [ENFORCED]: reasoning_content is never user-facing/public telemetry.

## H0 enforcement evidence and limits

Current enforcement: model-stream retains reasoning only in private messages; job-stream publicJob removes checkpoints; streaming and research-resume tests cover public leakage. model-request retries pre-response transport failures without tier switching. Cross-provider state isolation and catalog/routing policies remain V4.8 targets. No new model guard is imposed on legacy code in H0.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.

## V4.8.1 evidence

Catalog serialization and schema tests in `tests/model-catalog.test.mjs` exclude credentials/URLs and require explicit capability fields, preserving unknowns. Vision catalog metadata and runtime readiness reuse the same legacy image predicate, tested against the previous truth table. This does not enforce INV-MDL-001 through INV-MDL-005: business calls are not migrated and state isolation/policy are still future work. INV-MDL-006 remains unchanged; no reasoning or public telemetry field is added.
