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

At H0: CURRENT provider-configured research/review, path classification, security intent, Vision and their distinct transport guards. Catalog/Gateway and policy slots were FUTURE. Do not enforce the target Gateway boundary against current call sites in H0.

The [V4.8.0 call inventory](../releases/V4.8/model-call-inventory.md) now records exact current transports, parameters, semantic callers, private state and guard differences. Static inventory checks track the existing direct endpoints until their authorized migration; they do not claim the target Gateway boundary is enforced.

## V4.8.1 configuration Catalog — CURRENT

`server/model-catalog.mjs` defines validated immutable ModelProfile v1 and generates three legacy profiles from existing env: analysis, router override, Vision. `model-routing.mjs` remains the connection/default owner; `vision-model.mjs` exposes the single shared legacy image-capability predicate. Catalog carries safe connection references instead of URLs/keys, with explicit capabilities and nullable provider/price/token-limit metadata. Capabilities reflect legacy usage, not certification of arbitrary provider endpoints.

This internal metadata layer does not select models, send requests or pin jobs. Existing transports and public model routing retain their behavior. Gateway request normalization, caller migration, stable policy slots, health/cost policy, escalation and cross-provider compatibility remain FUTURE. See [contract](../contracts/model-gateway.contract.md) for current fields and future boundaries.
