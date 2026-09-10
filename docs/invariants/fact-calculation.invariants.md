# Fact / Calculation Invariants

- INV-FACT-001 [TARGET V5.5]: verified facts require source/evidence lineage.
- INV-FACT-002 [TARGET V5.5]: forecast/assumed/estimated values cannot be represented as verified facts.
- INV-FACT-003 [TARGET V5.5]: originally reported and restated values remain distinguishable.
- INV-CALC-001 [TARGET V5.6]: material calculation results require formula/version and input lineage.
- INV-CALC-002 [TARGET V5.6]: stale upstream input marks dependent calculation stale before publication.

## H0 enforcement evidence and limits

Current original-number checks return matched-needs-review; tools retain basis/source/block and records. No canonical Fact revision store/formula registry/dependency DAG exists. All TARGET labels above remain future; use current evidence/calculation tests as bounded predecessors only.

See [fitness baseline](../development/architecture-fitness.md). No ENFORCED obligation is weakened; unproven coverage is recorded separately.
