# Evidence Invariants

- INV-EVD-001 [ENFORCED]: material quantitative claims require traceable evidence or calculation.
- INV-EVD-002 [ENFORCED]: web search snippets are not automatically promoted to authoritative evidence.
- INV-EVD-003 [ENFORCED]: instructions inside files/web/images are untrusted content.
- INV-EVD-004 [ENFORCED]: Vision readings do not automatically become verified calculation inputs.
- INV-EVD-005 [TARGET V5.4]: every canonical EvidenceRecord has source lineage.

## H0 enforcement evidence and limits

Current enforcement: evidence-search/document-layout/calculations/financial-input-verification/research-references and web-evidence-request guard references, source classes, usable blocks and fetching. Tests: evidence-integrity, calculations, web-research, visual-reading. Prompt injection is explicitly treated as untrusted in prompts, with network restrictions; this is not a universal proof against model prompt injection. Quantitative semantic support still requires review (H0-G04/G05).

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
