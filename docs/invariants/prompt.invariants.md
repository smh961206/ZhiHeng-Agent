# Prompt Invariants

## ENFORCED

1. Every executable model call uses a registered Prompt ID and passes its safe Prompt context to Model Gateway.
2. Prompt definitions never name a provider or model.
3. Prompt telemetry never contains prompt bodies, source bodies, user text, model output, secrets, or hidden reasoning.
4. Evidence and document input is untrusted data and cannot become a system instruction.
5. A deterministic calculation's referenced evidence blocks must all enter the compiled context; otherwise dispatch fails.
6. Repair history is bounded to the original request, the latest rejected candidate, and one repair instruction.
7. Exact duplicate vision pages may reuse one transcription, but every page remains separately identified and unverified.
8. Prompt versioning is an internal execution marker and never creates a third external release line.

## TARGET

Outcome calibration and canonical Claim/Belief/Dependency objects remain governed by their future release contracts.
