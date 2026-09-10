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
