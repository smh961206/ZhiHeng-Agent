# Claim Contract
Implementation Status: FUTURE; target V5.6.

Fields:
`claimId`, `statement`, `category`, `horizon`, `status`, supportingEvidenceIds, counterEvidenceIds, factIds, calculationIds, assumptionIds, dependencies, unresolvedGaps, invalidationConditions.

Status:
unverified | supported | partially_supported | conflicted | refuted | insufficient_evidence | needs_revalidation

## H0 implementation evidence

Current report statements, citations and audit checks are not canonical Claim identities/dependency records.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
