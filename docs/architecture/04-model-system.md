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

## Stable slots

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
