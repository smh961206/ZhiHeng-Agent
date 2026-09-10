# Belief Contract
Implementation Status: FUTURE; target V5.7.

Belief is confidence/probability associated with a Claim.

Fields may include:
`beliefId`, `claimId`, `prior`, `currentProbability`, `uncertaintyType`, `calibrationState`, update history.

Uncertainty types:
data | model | structural | future | irreducible

Probability should be historically calibrated over time, not treated as decorative LLM confidence.
