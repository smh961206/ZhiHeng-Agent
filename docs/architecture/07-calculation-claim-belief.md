# Calculation / Claim / Belief

## Calculation

Deterministic derivation with:
- formula ID/version;
- input fact IDs;
- input calculation IDs;
- assumption IDs;
- unit/currency;
- result.

## Claim

A proposition that can be supported, contradicted, or remain unresolved.

## Hypothesis

A competing explanation for a phenomenon.

## Belief

A calibrated confidence state attached to a Claim, not a synonym for the Claim.

## Dependency DAG

Source → Evidence → Fact → Derived Fact → Calculation → Claim → Belief → Forecast → Valuation → Decision.

When upstream data changes, downstream objects become stale/needs_revalidation before they are trusted again.
