# V5.0 — Fully Normalized Detailed Index

User-authorized configuration migration: [unified model configuration runbook](model-config-migration-runbook.md). This extends the current release's configuration boundary; it does not activate future releases or resume paused live acceptance.

Configuration usage and onboarding: [configuration guide](../../configuration-guide.md) and [delivery report](configuration-guide-report.md). These document the current single-env-file plus model-JSON layout without activating any model policy.

User-authorized platform copy and interaction alignment: [frontend completion report](frontend-completion-report.md). This does not resume paused live acceptance or enable production candidates.

Current execution: all 14 engineering steps have implementations; release acceptance remains PARTIAL pending real full-research quality and operator review. See [completion report](completion-report.md), [execution log](execution-log.md) and [operations runbook](runbook.md).

Whole-release regression and maintenance: [regression report](regression-optimization-report.md). Completed-run budget validation, CLI argument checks and the unified release gate are covered; paused live acceptance remains paused.

Second whole-release regression: [review report](regression-review2-report.md), including strict drift CLI arguments and a fresh complete UI run against one production build. Real acceptance remains paused.

Every subrelease below follows `docs/development/NORMALIZED_RELEASE_STANDARD.md`.

Codex must execute them in order unless the user explicitly requests one specific subrelease.

- [V5.0.0 — Benchmark case contract](subreleases/V5_0_0-benchmark-case-contract.md)
- [V5.0.1 — Fixture loader](subreleases/V5_0_1-fixture-loader.md)
- [V5.0.2 — Deterministic graders](subreleases/V5_0_2-deterministic-graders.md)
- [V5.0.3 — Semantic grader policy](subreleases/V5_0_3-semantic-grader-policy.md)
- [V5.0.4 — Benchmark runner](subreleases/V5_0_4-benchmark-runner.md)
- [V5.0.5 — Baseline snapshot](subreleases/V5_0_5-baseline-snapshot.md)
- [V5.0.6 — Challenger profile integration](subreleases/V5_0_6-challenger-profile-integration.md)
- [V5.0.7 — Offline challenger run](subreleases/V5_0_7-offline-challenger-run.md)
- [V5.0.8 — Statistical comparison](subreleases/V5_0_8-statistical-comparison.md)
- [V5.0.9 — Task classification for champion](subreleases/V5_0_9-task-classification-for-champion.md)
- [V5.0.10 — Champion registry](subreleases/V5_0_10-champion-registry.md)
- [V5.0.11 — A/B assignment](subreleases/V5_0_11-a-b-assignment.md)
- [V5.0.12 — Production champion rollout](subreleases/V5_0_12-production-champion-rollout.md)
- [V5.0.13 — Model drift monitor baseline](subreleases/V5_0_13-model-drift-monitor-baseline.md)
