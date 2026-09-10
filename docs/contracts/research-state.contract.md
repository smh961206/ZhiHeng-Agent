# Research State Contract
Implementation Status: PARTIAL; target V5.7.

Research State becomes the canonical structured representation of a company's research state.

Contains:
thesis, claims, beliefs, verified/relevant facts, assumptions, valuation, risks, catalysts, monitoring metrics, invalidation conditions, known gaps, version metadata.

Reports are renderers of Research State after migration; reports are not the long-term system of record.

## H0 implementation evidence

Jobs contain plan, sources, tool/checkpoint records, report and structured review/result fields. agent-execution public plans and saved Knowledge receipts are CURRENT. Canonical company ResearchState with Claim/Belief/Fact references and state renderer is FUTURE V5.7. Tests: research-contract, research-resume, research-record.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
