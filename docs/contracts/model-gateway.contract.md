# Model Gateway Contract
Implementation Status: PARTIAL. V4.8.1 implements configuration profiles only; the request/response Gateway and call migration remain FUTURE.

## ModelProfile v1 — CURRENT

Owner: `server/model-catalog.mjs`. `createModelProfile(input)` validates a closed metadata shape, copies nested values and returns a deeply frozen profile. `createLegacyModelCatalog(env = process.env)` returns `{schemaVersion: 1, profiles}`. These are internal configuration APIs, with no HTTP route, persistence or request dispatch.

Profiles, capabilities and non-null pricing must be plain records with enumerable own data properties. Accessors and hidden required fields are rejected without invoking getters. Purposes must be a dense ordinary array with no custom properties or iterator overrides. Validation copies these data values before checking them, so accepted metadata survives a JSON round trip with the same required fields and values. Invalid metadata receives a generic error, without echoing caller values or executing property getters. This contract concerns configuration data, not sandboxing arbitrary JavaScript proxies.

| Field | Required semantics |
|---|---|
| schemaVersion / source | `1` / `legacy-env` |
| id / model | Nonempty configuration ID / opaque model ID; model value is preserved, not normalized |
| provider / protocol | Provider ID or `null`; generated legacy profiles use `null` / `openai-chat-completions`. Protocol does not establish provider identity |
| connectionRef | `legacy-analysis` or `legacy-vision`; resolve through existing `modelRouting(env)` on the server. No base URL, API key or full environment in metadata |
| tier | `legacy`; names such as “pro” do not establish an intelligence tier |
| purposes | Nonempty unique subset of `research`, `review`, `followup`, `router`, `vision`; no judge implementation |
| capabilities | All seven fields required: `textInput`, `imageInput`, `streaming`, `toolCalling`, `jsonObject`, `jsonSchema`, `reasoningControl`; each boolean or `null` |
| contextWindow / maxOutputTokens | Positive safe integer token limit or `null`; provider limits, not current per-request budgets |
| pricing | `null` when unknown; otherwise `{currency, unit: 'per-million-tokens', input, output, cacheRead}`. Currency is a three-letter uppercase code; each rate is a finite nonnegative number or `null`. Explicit zero is distinct from missing |

Capabilities describe configured legacy transport usage, not certification of an arbitrary endpoint. Analysis declares text/stream/tools, blocks raw images, and leaves structured-output/reasoning control unknown. Router declares text without streaming/tools. Vision image support follows the existing exact legacy model / explicit `images` opt-in / `off` rule, shared with `visionStatus`; missing credentials affect readiness, not declared image capability. Unsupported or unused legacy paths are false; unconfirmed optional provider support remains null. These declarations do not activate policy routing or weaken current request/validation guards.

Legacy profiles are `legacy-analysis` (research/review/followup), `legacy-router` (both path and security intent), and `legacy-vision`. The router reuses the analysis connection and preserves `LLM_ROUTER_MODEL || analysisModel`. Analysis/Vision model defaults and empty-string fallbacks reuse `model-routing.mjs`. No price, token limit or provider is inferred from a model name; generated pricing and limits are always null.

Connection refs are lookup instructions, not connections or pinned snapshots. Existing transports still read their current environment. No credential resolver, credential snapshot, model selection, Gateway request or checkpoint pin is introduced here. Future call migration must resolve credentials privately and preserve the existing independent Vision key/base fallback. The catalog is internal metadata, not a new public configuration endpoint; callers must still avoid placing secrets in model/provider identifiers.

Tests: `tests/model-catalog.test.mjs` covers environment mapping, secret exclusion (including credential-bearing URLs), explicit/unknown capability semantics, immutable round trips, invalid schema/pricing, and legacy Vision request parity. Existing Vision/stream/router tests remain authoritative for actual transport behavior.

Connection tests independently pin the analysis/router/Vision identities to their expected connection refs; expectations must not be derived from the returned ref under test. Mocked requests from both path classification and security intent verify router override/fallback, analysis credentials/base, non-streaming mode, existing output budgets and legacy thinking options. These test existing owners without routing them through Catalog.

## Request — FUTURE
`purpose`, `messages`, `tools`, `responseFormat`, `reasoningEffort`, `stream`, `signal`, `routingContext`.

## Purpose
router | research | review | followup | vision | future: judge

## Reasoning
off | low | medium | high | max

## Response — FUTURE
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
