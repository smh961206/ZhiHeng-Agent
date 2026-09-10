# V4.8 Current Code Map

Codex must verify this against the checkout.

Likely current model-related modules:
- `server/model-routing.mjs`
- `server/model-stream.mjs`
- `server/agent.mjs`
- `server/agent-execution.mjs`
- `server/research-path.mjs`
- `server/vision-model.mjs`
- `server/material-vision.mjs`
- `server/evidence-followup.mjs`
- review-related code such as `review-format.mjs`, valuation review and agent review paths

Supporting modules whose semantics must be preserved:
- `server/research-context.mjs`
- `server/job-checkpoints.mjs`
- `server/research-resume.mjs`
- `server/research-workflow.mjs`
- `server/research-output.mjs`
- `server/storage.mjs`
- `server/schema-migrations.mjs`

Search the full repository for:
- `LLM_`
- `/chat/completions`
- `/responses`
- `modelRouting(`
- `reasoning_content`
- `thinking`
- `image_url`
- `fetch(`

Do not assume this list is exhaustive.
