# Release Dependencies

| Release | Prerequisite | Owns |
|---|---|---|
| H0 | Current repository | Harness/control plane |
| V4.8 | H0 | Model infrastructure |
| V4.9 | V4.8 | Multimodal model infrastructure |
| V5.0 | V4.8; V4.9 where vision champion applies | Evaluation/model champions |
| V5.1 | V5.0 | Cost/cache/budget |
| V5.2 | V5.0/V5.1 | Exceptional flagship/judge |
| V5.3 | Stable current Knowledge snapshot | Knowledge engineering |
| V5.4 | V5.3 ontology foundation recommended | Source/Evidence/Retrieval |
| V5.5 | V5.4 source/evidence contracts + V5.3 ontology | Identity/Fact |
| V5.6 | V5.5 Fact + current deterministic tools | Calculation/Assumption/Claim DAG |
| V5.7 | V5.6 structured claims/assumptions | Belief/Forecast/Research State |
| V5.8 | V5.7 Research State + dependencies | Event/Continuous Research |
| V5.9 | V5.7 Research State; V5.8 helpful | Decision |
| V5.10 | V5.9 Decision + V5.5 identity | Portfolio |
| V5.11 | Versioned K/Fact/State/Decision | Replay/Learning |
| V6.0 | Stable V5 domain systems | Multi-user platform/governance |

## Dependency rule

A downstream release must not create its own replacement for an upstream domain merely to avoid completing the upstream contract.
