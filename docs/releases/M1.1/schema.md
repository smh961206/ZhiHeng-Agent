# M1.1 Schema Note

M1.1 adds one optional field to modelState v4:

```json
{"contextVersion": 1}
```

New schema-v2 tasks receive the field. Existing v4 tasks without it remain valid and use the historical request projection. Versions v1–v3 are unchanged. The field pins model-context construction only; it does not change evidence, financial facts, calculations, reports, model identities or the research cutoff.

The public cost response also adds a read-only `usage` object at task and per-purpose level. It contains only `knownTotal` and `unknownCalls` for input, output, total and cached-input Token values. No MongoDB backfill is required because the aggregate is derived from existing ModelCall records.
