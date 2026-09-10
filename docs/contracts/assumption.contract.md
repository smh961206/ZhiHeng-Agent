# Assumption Contract
Implementation Status: FUTURE; target V5.6.

An Assumption is an explicit non-fact input used for forecast/scenario/valuation.

Fields:
`assumptionId`, `statement`, `value`, `unit`, `horizon`, evidence/basis, sensitivity, invalidationCondition, affects[].

Assumptions must never silently become facts.
