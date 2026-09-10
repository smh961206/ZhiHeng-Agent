# Assumption Contract
Implementation Status: FUTURE; target V5.6.

An Assumption is an explicit non-fact input used for forecast/scenario/valuation.

Fields:
`assumptionId`, `statement`, `value`, `unit`, `horizon`, evidence/basis, sensitivity, invalidationCondition, affects[].

Assumptions must never silently become facts.

## H0 implementation evidence

Calculation basis contains assumption text and sensitivity inputs. There is no canonical assumptionId registry or propagation engine.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
