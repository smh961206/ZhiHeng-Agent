# Model Gateway Contract
Implementation Status: FUTURE until V4.8; becomes CURRENT after V4.8 acceptance.

## Request
`purpose`, `messages`, `tools`, `responseFormat`, `reasoningEffort`, `stream`, `signal`, `routingContext`.

## Purpose
router | research | review | followup | vision | future: judge

## Reasoning
off | low | medium | high | max

## Response
Must normalize:
- message
- profile/provider/model/tier
- token usage if available
- latency/TTFT
- estimated billing if pricing known

## Forbidden
- business logic branching on concrete model name;
- leaking API keys;
- exposing reasoning_content;
- cross-provider hidden state;
- sending images to profiles without imageInput.

## H0 implementation evidence

Current owners are model-routing/model-request/model-deadline/model-stream, agent completion, research-path, security-intent and vision-model. Direct provider configuration and model-name capability checks remain. This request/response API is FUTURE; H0 must not introduce it.

See [implementation map](../architecture/current-implementation-map.md) and [audit findings](../releases/H0/audit-findings.md). H0 changes no persisted object, field requirements, API, migration or financial meaning.
