# System Invariants

Invariants are stronger than recommendations.

Statuses:
- ENFORCED: executable/current behavior must satisfy now.
- TARGET: design obligation for a future release.
- TRANSITION: enforced only when feature flag/path is enabled.

Future invariants must not be used as an excuse to implement future features early.

## H0 evidence discipline

ENFORCED is a mandatory obligation, not a claim that every semantic case is mechanically proven. Each domain records executable gates, tests and gaps separately. Never downgrade a rule to conceal a current violation. An ACCEPTED ADR and a TARGET invariant do not authorize early feature implementation.
