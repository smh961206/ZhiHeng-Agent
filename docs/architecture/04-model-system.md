# Model System

## Baseline

Research/review and Vision are currently configured separately. Model behavior is still coupled to concrete provider/model configuration in current code.

## Target

```text
Business capability request
→ Model Gateway
→ Capability Gate
→ Quality / Policy
→ Health
→ Cost (only after quality)
→ Provider Adapter
```

## Stable slots — FUTURE

- ROUTER
- MAIN
- PRO
- VISION_PRIMARY
- VISION_FALLBACK
- JUDGE

Slots are stable. Concrete vendor/model names are replaceable.

## Permanent escalation rule

Data absence is not intelligence failure.

Provider outage is not intelligence failure.

Only repeatable capability/reasoning failures may justify model-tier escalation.

## H0 calibration

CURRENT: provider-configured research/review, path classification, security intent, Vision and their distinct transport guards. FUTURE: stable slots/catalog/Gateway, health/cost policy, escalation and cross-provider state compatibility. Do not enforce the target Gateway boundary against current call sites in H0.

The [V4.8.0 call inventory](../releases/V4.8/model-call-inventory.md) now records exact current transports, parameters, semantic callers, private state and guard differences. Static inventory checks track the existing direct endpoints until their authorized migration; they do not claim the target Gateway boundary is enforced.
