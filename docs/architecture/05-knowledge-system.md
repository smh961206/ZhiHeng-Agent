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

## Governance lifecycle — CURRENT in V5.3

Production/benchmark issue
→ Root-cause classification
→ Knowledge Change Proposal
→ Lint
→ Rule tests
→ Domain regression
→ Full benchmark
→ Human approval
→ New K snapshot

V5.3 stores 26 high-impact Rule IDs, an ordered constitution, canonical ontology, regression IDs and K1.0.0 governance in the existing module catalog. `knowledge/current.json` explicitly activates one immutable K-Series snapshot, and tasks pin its concrete K version and governance fingerprint. The research framework version no longer controls Knowledge; active loading accepts only K-Series snapshots. Pre-K release directories, automatic snapshots and their archive metadata have been removed. Publication-time source labels preserved inside K1.0.0 are descriptive metadata rather than filesystem dependencies and remain unchanged to protect the released fingerprint. Resolver/compiler output is deterministic and remains a dry-run comparison surface while the existing module-loading algorithm reads only the activated K snapshot. Critical lint failures block publication.

## Long-term trend

Natural-language rule
→ structured rule
→ executable invariant / deterministic engine where appropriate.

Knowledge should not grow forever as prompt text.

## Current calibration

CURRENT: ENTRY/modules.json/modules/rules, indexed sections, lazy rule loading, validated complete job snapshots, exact usage/excerpt provenance, canonical Rule IDs, constitution/ontology, resolver/compiler, lint/regression, K-Series pinning, KCP/debt validation, runtime-binding metadata, and impact/decay analysis. Physical directory separation and broad promotion of prose rules into engines remain future work.
