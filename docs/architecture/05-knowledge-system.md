# Knowledge System

## Baseline

The repository already has modular Knowledge plus snapshots. V5.3 evolves this instead of replacing it.

## Target layers

```text
constitution/
ontology/
methodology/
playbooks/
contracts/
manifest/
```

## Knowledge means

“How should ZhiHeng research?”

It does not mean:
- current company opinions;
- current price targets;
- current thesis conclusions.

## Target governance lifecycle — FUTURE

Production/benchmark issue
→ Root-cause classification
→ Knowledge Change Proposal
→ Lint
→ Rule tests
→ Domain regression
→ Full benchmark
→ Human approval
→ New K snapshot

## Long-term trend

Natural-language rule
→ structured rule
→ executable invariant / deterministic engine where appropriate.

Knowledge should not grow forever as prompt text.

## H0 calibration

CURRENT: ENTRY/modules.json/modules/rules, indexed sections, lazy rule loading, validated complete job snapshots, same-version update handling and exact usage/excerpt provenance. FUTURE: target directory layering, ontology, canonical Rule IDs/K-Series and full proposal/regression/governance lifecycle. Existing snapshot pinning must be reused.
