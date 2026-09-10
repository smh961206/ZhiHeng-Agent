# Decision Contract
Implementation Status: FUTURE; target V5.9.

Decision derives from:
Research State + Mandate + Expected Return + Downside + Uncertainty + Opportunity Cost + Portfolio Context.

States may include:
Reject | Watch | Starter | Normal | HighConviction | Reduce | Exit

V5.9 produces recommendations/state only; it does not execute trades.

## H0 implementation evidence

research-output and shared/research-framework already produce structured research action/confidence and portfolio-readiness checks. They are not the canonical mandate-linked decision-policy engine.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
