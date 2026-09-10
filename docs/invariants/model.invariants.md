# Model Invariants

- INV-MDL-001 [TARGET V4.8]: business code does not infer capability from concrete model names.
- INV-MDL-002 [TARGET V4.8]: data absence is never a model escalation reason.
- INV-MDL-003 [TARGET V4.8]: 429/5xx/transport failures are provider-health failures, not automatic intelligence escalation.
- INV-MDL-004 [TARGET V4.8]: do not switch providers/models between assistant tool_calls and execution of those calls.
- INV-MDL-005 [TARGET V4.8]: hidden provider reasoning is not transported across providers.
- INV-MDL-006 [ENFORCED/TARGET]: reasoning_content is never user-facing/public telemetry.
