# Architecture fitness baseline

Status: CURRENT — H0 checks existing boundaries without implementing future engines.

## Executable current checks

| Boundary | Existing evidence |
|---|---|
| Private checkpoint/reasoning versus public report/event output | streaming.test.mjs, research-resume.test.mjs |
| Source/block identity, snippets and numeric evidence quality | evidence-integrity.test.mjs, calculations.test.mjs, research-references.test.mjs |
| Missing data and incompatible financial bases | data-completeness.test.mjs, calculations.test.mjs, cashflow-bridge.test.mjs, valuation-policy.test.mjs |
| Current review contract and durable delivery | research-contract.test.mjs, review-format.test.mjs, research-delivery.test.mjs, jobs-delivery.integration.mjs |
| Compatible checkpoint and pending tool continuation | research-resume.test.mjs, research-resume.integration.mjs, review-recovery.test.mjs |
| Knowledge pinning, integrity, exact receipts and safe excerpts | knowledge-snapshots.test.mjs, knowledge-backup.test.mjs, knowledge-api.integration.mjs |
| Additive migration discipline and downgrade rejection | schema.integration.mjs, storage.integration.mjs |
| Public URL/authority restrictions | web-research.test.mjs, access.test.mjs |
| Harness navigation, statuses, current paths, manifest and deployment fixture inputs | harness.test.mjs |

These tests cover concrete cases. They do not establish universal semantic truth, full prompt-injection resistance, complete publication-time filtering or proof that all material counter-evidence was discovered. Mandatory rules retain their strength; gaps are in [audit findings](../releases/H0/audit-findings.md).

## Future checks, not H0 failures

- V4.8/V4.9: provider endpoints/model-name branching isolated behind Gateway adapters; provider switches safe at model/tool boundaries.
- V5.3: Rule IDs/ontology/governed K-Series publication in addition to existing snapshot pinning.
- V5.4/V5.5: canonical Source/Evidence/Fact lineage, restatement/time/entity validation.
- V5.6/V5.7: formula identity, dependency invalidation, canonical Claim/Belief/ResearchState and renderer boundaries.
- V5.11/V6.0: complete point-in-time replay, governance, human override and immutable audit boundaries.

Do not create empty future modules or impose these rules on unimplemented features to make H0 green. H0's zero-runtime-change audit compares tracked runtime hashes to its starting checkout; this one-release audit is not a permanent ban on future authorized edits.
