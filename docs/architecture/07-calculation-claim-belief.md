# Calculation / Claim / Belief

## Target Calculation contract — PARTIAL

Deterministic derivation with:
- formula ID/version;
- input fact IDs;
- input calculation IDs;
- assumption IDs;
- unit/currency;
- result.

## Claim — FUTURE

A proposition that can be supported, contradicted, or remain unresolved.

## Hypothesis — FUTURE

A competing explanation for a phenomenon.

## Belief — FUTURE

A calibrated confidence state attached to a Claim, not a synonym for the Claim.

## Dependency DAG — FUTURE

Source → Evidence → Fact → Derived Fact → Calculation → Claim → Belief → Forecast → Valuation → Decision.

When upstream data changes, downstream objects become stale/needs_revalidation before they are trusted again.

## H0 calibration

CURRENT: deterministic calculations and tool records. PARTIAL: canonical Calculation contract. FUTURE: formula registry, canonical Claim/Hypothesis/Belief entities, dependency DAG and automatic stale propagation. The formula/input IDs described above are target fields, not current storage fields.
