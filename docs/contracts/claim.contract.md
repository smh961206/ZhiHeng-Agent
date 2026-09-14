# Claim Contract
Implementation Status: FUTURE; target V5.6.

Independent advisory review inputs use explicit basis and actual evidence/tool references, but remain completed conclusions rather than canonical Claims. An optional Judge may select only an original conclusion or retain `insufficient_to_decide`; it cannot create a Fact/Claim, backfill provenance or replace a human override. Canonical Claim status remains FUTURE.

Fields:
`claimId`, `statement`, `category`, `horizon`, `status`, supportingEvidenceIds, counterEvidenceIds, factIds, calculationIds, assumptionIds, dependencies, unresolvedGaps, invalidationConditions.

Status:
unverified | supported | partially_supported | conflicted | refuted | insufficient_evidence | needs_revalidation

## Current implementation evidence

Current report statements, citations and audit checks are not canonical Claim identities/dependency records.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
