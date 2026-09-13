# M1.1 Migration

No command or data backfill is required.

1. Deploy the new code and restart the service.
2. New schema-v2 jobs save `modelState.contextVersion=1` and use M1.1 contexts.
3. Existing v4 jobs without the field continue the historical request path when resumed.
4. Existing v1–v3 jobs continue their original routing and context behavior.
5. Existing ModelCall records immediately participate in the additive Token aggregate where provider usage is present; missing values remain unknown.

Research records, source identities, publication times, calculation receipts and cutoffs are never rewritten.
