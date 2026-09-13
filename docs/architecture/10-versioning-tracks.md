# Versioning and Capability Tracks

## Core releases

H0 → V4.8 → V4.9 → V5.0 → V5.1 → V5.2 → V5.3 → V5.4 → V5.5 → V5.6 → V5.7 → V5.8 → V5.9 → V5.10 → V5.11 → V6.0.

## Active release lines

- Platform V-Series: the product and execution code, including model capabilities.
- K-Series: independently published and activated Knowledge rules, currently K1.0.0.

M1.0 and M1.1 remain engineering milestone records delivered with the platform. They are not a third release line, model selection, activation pointer or recovery check.

Execution compatibility 1 and output contract 7 are internal schema/behavior counters. Model state, model connection and context pins also remain internal compatibility data. They change only when their corresponding contracts require it, not whenever the platform version changes. See [ADR-017](../adr/ADR-017-platform-execution-compatibility.md).

## Future planning labels

The labels below describe roadmap domains, not currently maintained release systems:

- D-Series: Data / Security identity
- R-Series: Retrieval
- F-Series: Facts / calculations
- C-Series: Claim / causal reasoning
- B-Series: Belief / calibration
- V-Series: Forecast / valuation
- DP-Series: Decision policy
- P-Series: Portfolio
- L-Series: Learning
- E-Series: Evaluation
- G-Series: Governance
- UX-Series: Research workspace

A core release may integrate domain milestones. Future release systems require an explicit design and active-release authorization; these labels do not create them.

## H0 calibration

CURRENT: execution ships with the platform and new plans pin execution compatibility 1 plus output contract 7. K-pinned legacy framework-4.7 tasks retain their exact saved scope for compatible recovery. Knowledge activation uses a reviewed pointer and persists concrete K identity per task. Parser, model state and schema counters are internal compatibility metadata. Historical V4.x Knowledge is read-only and outside active execution. Full pinning for every future domain remains FUTURE.
