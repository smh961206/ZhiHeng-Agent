# V5.3 operator runbook

1. Generate or refresh the additive governance map with `pnpm knowledge:seed-governance`.
2. Run `pnpm knowledge:lint`. Any critical error blocks publication.
3. Run `pnpm benchmark:knowledge` and the release tests.
4. Run `pnpm knowledge:backup` to build one immutable snapshot after lint passes.
5. Run `pnpm knowledge:activate` to switch `knowledge/current.json` after review.
6. Confirm `/api/config` and new jobs contain `knowledgeVersion: K1.0.0`, `knowledgeFingerprint`, and a `knowledgeSnapshot.version` of `K1.0.0`.

For rollback, stop creating new jobs and explicitly activate a separately validated K-Series rollback version. Keep all K and V4.x archives intact. Do not rewrite checkpoints or historical hashes. Active K1.0.0 tasks must finish on their pinned snapshot or remain paused. V4.x is never reactivated by the current runtime.
