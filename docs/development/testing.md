# Testing Strategy

Layers:
1. Unit tests
2. Contract tests
3. Architecture fitness tests
4. Integration/resume tests
5. Golden fixtures
6. Release benchmark
7. Red-team/adversarial tests

High-priority adversarial cases:
- wrong year/unit/currency;
- A/H/ADR identity confusion;
- restated historical financials;
- prompt injection in web/PDF/image;
- user-supplied wrong premise;
- missing data;
- conflicting sources;
- one-off profit;
- cycle-peak earnings;
- pending tool calls during model/provider failure.
