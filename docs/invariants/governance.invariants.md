# Governance Invariants

- INV-GOV-001 [TARGET V6]: secrets never enter public/client artifacts.
- INV-GOV-002 [TARGET V6]: human overrides are traceable and never silently overwritten.
- INV-GOV-003 [TARGET V6]: restricted data obeys provider-routing/data-right rules.
- INV-GOV-004 [TARGET V6]: critical audit history is append-oriented.

## H0 enforcement evidence and limits

Current access/publicJob/vision error guards and backend-only environment configuration provide some secrecy protections; tests access, streaming, visual-reading cover those paths. This does not implement V6.0 tenant/RBAC/data-right/override/audit governance. No rule is promoted to universally enforced from these partial checks.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
