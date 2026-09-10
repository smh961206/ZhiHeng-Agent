# Belief Contract
Implementation Status: FUTURE; target V5.7.

Belief is confidence/probability associated with a Claim.

Fields may include:
`beliefId`, `claimId`, `prior`, `currentProbability`, `uncertaintyType`, `calibrationState`, update history.

Uncertainty types:
data | model | structural | future | irreducible

Probability should be historically calibrated over time, not treated as decorative LLM confidence.

## H0 implementation evidence

Current review confidence labels are not calibrated probabilities or a canonical Belief object.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
