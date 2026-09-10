# Forecast Contract
Implementation Status: FUTURE; target V5.7.

Forecast values are future derived values driven by explicit assumptions.

Forecasts must record:
- horizon/period;
- driver model;
- assumption IDs;
- source facts;
- scenario identity where applicable;
- epistemicType=forecast.

Initial engine scope: Revenue, Margin, FCF driver chains.

## H0 implementation evidence

dcf projects cash flows arithmetically from supplied growth/discount assumptions. This does not implement the canonical driver-based Forecast entity described here.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
