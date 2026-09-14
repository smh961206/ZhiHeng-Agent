# Prompt Manifest Contract

Status: CURRENT

Every production model call is represented by a registered, provider-neutral Prompt definition and a compiled Prompt plan.

## Definition

A definition has a stable `prompt_id`, model-gateway `purpose`, positive integer version, owning domain, input trust classification, output contract, lifecycle, P0–P4 risk class, contract dependencies and executable call sites. The release inventory is `docs/releases/V5.3/prompt-inventory.json`; executable code must match it exactly. New tasks can compile only `active` definitions.

## Execution

- Business code continues to select only a purpose. Model/provider selection remains inside Model Gateway.
- A Prompt plan contains the exact ordered messages sent to the gateway and safe telemetry derived from them.
- Dynamic evidence, documents and user text remain user content. They cannot alter system policy.
- Repair calls retain the immutable base request and only the latest rejected candidate plus its validation error.
- Complete point-in-time independent reviews remain persist-before-dispatch and non-replayable while uncertain.

## Telemetry and privacy

Telemetry may store Prompt ID/version, manifest fingerprint, context version/completeness, message/count statistics and serialized character count. The fingerprint binds definition metadata and a one-way digest of static system policy; multimodal prompts also bind the fixed transcription instruction and media type marker. Dynamic document bytes, evidence and user content do not enter that digest. Prompt bodies, document text, user questions, model responses and hidden reasoning must not be stored in Prompt telemetry.

## Compatibility

New jobs pin a body-free `promptState` containing the inventory fingerprint and Prompt versions. A changed inventory cannot silently resume those jobs. Historical jobs without `promptState`, calls without `promptContext` and receipts at version 1 remain readable. No backfill may invent Prompt identity, provenance, or completeness.
