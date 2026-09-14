# Hypothesis Contract
Implementation Status: FUTURE; target V5.7.

A Hypothesis is one possible explanation among competing explanations.

It has:
- statement;
- affected claim(s);
- supporting evidence;
- counter evidence;
- alternative hypotheses;
- status.

A research process must be able to retain multiple plausible hypotheses instead of prematurely collapsing to one narrative.

## Current implementation evidence

agent-execution already accepts public hypotheses as text in a job plan. This is not the canonical Hypothesis entity/evaluation loop described here.

See the [current implementation map](../architecture/current-implementation-map.md). This contract text alone changes no persisted object, field requirements, API, migration or financial meaning.
