# Investment Domain Object Model

Status: CURRENT — H0 classification of target objects, not a claim that all canonical contracts exist.

CURRENT = implemented named behavior; PARTIAL = existing predecessor with incomplete target contract; FUTURE = design reservation; DEPRECATED = approved migration away. No new deprecations in H0.

| Object | Implementation status | Current boundary |
|---|---|---|
| Source | PARTIAL | Current source objects and hashes; unified time/identity contract future |
| Evidence | PARTIAL | Current blocks/pages/citations; canonical EvidenceRecord future |
| Issuer | FUTURE | Directory company/CIK fields are not canonical issuer identity |
| Security | PARTIAL | Current A/H/US resolution; stable entity contract future |
| Listing | FUTURE | Current exchange labels are not time-bounded Listing entities |
| ShareClass | FUTURE | Current share-basis guards are not canonical share-class history |
| Metric | PARTIAL | Current aliases/provider metrics; ontology future |
| Fact | PARTIAL | Current observations and original-number checks; verified Fact engine future |
| Calculation | PARTIAL | Current deterministic tools/records; formula identity and DAG future |
| Assumption | FUTURE | Current basis text/parameters; registry future |
| Hypothesis | FUTURE | Current public plan text; canonical entity/evaluation future |
| Claim | FUTURE | Current citations/audit; canonical claim dependencies future |
| Belief | FUTURE | Current confidence labels; calibrated belief objects future |
| Forecast | FUTURE | Current DCF projections; driver Forecast engine future |
| Scenario | PARTIAL | Current sensitivity/dividend scenarios; canonical world-state branches future |
| Valuation | PARTIAL | Current math/snapshots/review; unified lineage future |
| Event | PARTIAL | Current shareholder/disclosure events; general materiality/dependency propagation future |
| ResearchState | PARTIAL | Current structured jobs/review; canonical company state future |
| ResearchDelta | FUTURE | Current earnings baseline comparison; canonical delta future |
| Mandate | FUTURE | Current portfolio constraints; mandate entity future |
| Decision | FUTURE | Current research action output; decision-policy engine future |
| Position | FUTURE | No canonical holding engine |
| Portfolio | FUTURE | Current portfolio research mode; canonical allocation engine future |
| Outcome | FUTURE | researchOutcome is a summary, not realized attribution |
| Failure | FUTURE | Current errors/receipts; normalized learning registry future |
| KnowledgeRule | PARTIAL | Current indexed modules/sections and pinned usage; stable Rule IDs/ontology future |

See [implementation map](current-implementation-map.md). FUTURE objects must not be implemented before their owning release.
