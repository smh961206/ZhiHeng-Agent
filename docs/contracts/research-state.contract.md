# Research State Contract

V4.9 authorized lifecycle repair: a cancelled job whose terminal save is still awaiting acknowledgement remains owned by its controller. An exact-version retry may wait up to five seconds for that execution's completion promise while holding the mutation lock; duplicates still fail. Only after durable finalization and controller release may capacity, persisted state and retry version be rechecked and one retry start. Timeout or failed delivery cannot bypass save recovery. This coordination is in memory, not a canonical ResearchState schema change.
Implementation Status: PARTIAL; target V5.7.

Research State becomes the canonical structured representation of a company's research state.

Contains:
thesis, claims, beliefs, verified/relevant facts, assumptions, valuation, risks, catalysts, monitoring metrics, invalidation conditions, known gaps, version metadata.

Reports are renderers of Research State after migration; reports are not the long-term system of record.

## H0 implementation evidence

Jobs contain plan, sources, tool/checkpoint records, report and structured review/result fields. agent-execution public plans and saved Knowledge receipts are CURRENT. Canonical company ResearchState with Claim/Belief/Fact references and state renderer is FUTURE V5.7. Tests: research-contract, research-resume, research-record.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.

## V4.8.9 modelState — CURRENT

Owners: server/model-state.mjs, server/model-connection.mjs, existing research-create/resume/retry, Agent/Gateway and private storage/public filters. New jobs/checkpoints pin mode/policy, profile/model/opaque endpoint identity and effort with empty escalation history. Absence alone retains historical legacy reads; corrupt or incompatible present state throws before dispatch/tool/retry acquisition. Key rotation does not change identity. Gateway verifies custom Catalog dispatch against pins; process-local job scopes isolate concurrent calls. No cross-provider escalation or canonical ResearchState is introduced. New jobs with unusable checkpoints refuse automatic reacquisition. Tests: tests/model-state.test.mjs and tests/model-state.integration.mjs, including actual process exit/restart with MongoDB and public-list exclusion. Current profile metadata is not hidden reasoning and is nevertheless private. Historical TARGET gaps remain distinguished from these local enforced pin guards.
