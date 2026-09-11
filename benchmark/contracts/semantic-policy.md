# V5.0.3 bounded semantic grader policy

Status: implemented offline policy, version `1.0.0`. This is auxiliary benchmark
evidence, never live model quality acceptance or production promotion.

## Interface for V5.0.4

`benchmark/semantic.mjs` exports:

- `semanticPolicy`: deeply frozen versioned policy and rubric anchors.
- `createSemanticBinding(context)`: immutable content binding for a scorer to copy.
- `evaluateSemanticPolicy(context, records = [])`: validates supplied scores and
  recomputes the existing `gradeCase` hard result on the same bound output.

`context` is the closed record `{suite, caseId, output, candidate}`. Obtain `suite`
from the existing `loadFrozenSuite(directory)`; do not manufacture or relabel it.
`caseId` selects exactly one case. `output` is `{evaluation, text}`: `evaluation`
is the unchanged V5.0.2 deterministic output and `text` is the exact public answer
being assessed (at most 100,000 characters, empty allowed when unassessed).
The caller must pair the actual public answer with its actual structured output;
this policy does not extract facts from prose or prove that pairing truthful.

`candidate` and a model grader's `profile` use a closed metadata descriptor:
`{profileId, profileVersion, profileHash, provider, model, modelVersion}`.
`profileHash` is the lowercase SHA-256 of the pinned, secret-free configuration;
profile ID/version are mandatory. Provider and model version must be explicit,
with `null` for genuinely unknown values. Never invent a revision or equate an
alias with an immutable provider revision. IDs are opaque, not routing rules.
This descriptor is an evaluation reference, not a second executable ModelProfile
or Catalog. The caller supplies its provenance; no profile lookup occurs.

A record has exactly:

```js
{
  version: 1,
  id: 'review-1',
  binding: createSemanticBinding(context),
  grader: {kind: 'human', reviewerId: 'reviewer-1'},
  // Model alternative: {kind: 'model', profile: descriptor}
  scoredAt: '2025-01-03T00:00:00.000Z',
  scores: semanticPolicy.rubrics.map(r => ({
    rubricId: r.id,
    rubricVersion: r.version,
    score: 3,
    quote: 'An exact substring of context.output.text',
    comment: 'Brief public observation about this rubric.'
  }))
}
```

Scoring time is canonical UTC with milliseconds, no earlier than suite freeze.
Each record requires exactly one slot for each supported rubric. Scores are
integers 0–4 or `null`; an abstention requires an empty quote and a brief reason
in `comment`. Numeric scores require a nonempty exact public-output quote.
Quotes/comments are at most 600 characters. At most 32 records are accepted.
Duplicate record IDs and human reviewer IDs are rejected case-insensitively;
duplicate model profile descriptors are also rejected. Revisions/conflicting
reviews must be resolved explicitly by the owner; no last-write-wins selection
or replacement of a human score by a model score exists here.

## Rubrics and deterministic priority

Only `expression_clarity` and `argument_coherence` are supported, each at
`1.0.0`. Their five explicit anchors live in `semanticPolicy`. They concern public
readability and the presentation of connections between stated premises and
conclusions. They do not establish truth or completeness of those premises.
Facts, missing values, periods/currency/share/accounting/valuation basis, math,
citations, evidence coverage, counter-evidence retention, cutoff, tools,
validation and delivery remain deterministic/hard requirements. No arbitrary
rubric registration, caller threshold, weight, combined score or pass override
is accepted. Changes to dimensions or anchors require a new reviewed version.

The result is `{version, binding, candidate, deterministic, status, records,
acceptanceEligible: false, trust: 'benchmark-only'}`. `deterministic` is the exact
existing `gradeCase` result. There is no overall `passed` field. `status` means
only assessment coverage: `unassessed`, `partial`, or `assessed`. Missing scores
remain null and are never imputed as zero. Records are sorted by ID; scores are
ordered by rubric. Results are detached, deeply frozen and JSON reproducible.

Model records are tagged `self` when provider/model match the candidate even
under a different profile alias; otherwise `unknown` if provider/revision
identity is incomplete, or `external-model`. These tags use declared metadata,
not authentication or proof of independent review. All human/model/self scores
remain individually visible and permanently ineligible to authorize acceptance.
Separate benchmark gates and governed human approval remain required under
ADR-011/014. No cost comparison or champion decision is implemented.

## Binding, privacy and trust boundary

Every record must exactly match the recomputed binding: policy version/hash,
benchmark version, suite manifest hash, case ID/hash, fixture ID/version/hash,
complete public output hash (text plus evaluation), and candidate metadata hash.
The existing canonical JSON/SHA-256 helpers are reused. Changes to text, facts,
case, cutoff, fixture, assets' descriptors, policy or candidate invalidate old
scores. LoadFrozenSuite remains the owner of file/asset byte validation; this
module performs identity and cutoff checks on its loaded data, not another file
loader. Hashes detect mismatches, not dishonest scorers or forged suites. Do not
rebind an old score to new material without rescoring it.

Only public output, scores and short public observations are needed. No private
continuation, provider reasoning, prompts, credentials or chain-of-thought fields
are accepted. Unknown scoring fields are rejected; private-channel keys are also
rejected recursively in output. Arbitrary prose is inert data, never instructions
to the policy. Structural checks cannot detect hidden reasoning/secrets pasted
into an allowed text field; callers remain responsible for public-only input.
Only hashes of source/case/output content enter the result, alongside small
public quote/comment excerpts and candidate/grader identity metadata.

## Scope, compatibility and rollback

Actual Gateway owner is `server/model-gateway.mjs`, not the historical suggested
`server/model-gateway/` directory. The release README's historical `.3 = A/B`
grouping is superseded by DETAILED_INDEX and normalized V5.0.3. Existing owners
and contracts are preserved; only the user's three authorized files are added.
No shared documentation or execution log is modified.

No automatic model call, network, paid request, persistence, environment change,
feature flag, migration, external API, production routing, job pin or resume
change. The version-1 result is an in-memory benchmark artifact shape, not a
persistent research schema. Existing .0–.2 callers are unchanged. Rollback by
removing the optional semantic consumer/import preserves all .0–.2 behavior and
any retained assessment artifacts. No historical evidence is rewritten.

Validation: `node --test tests/benchmark-case.test.mjs tests/benchmark-fixtures.test.mjs tests/benchmark-graders.test.mjs tests/benchmark-semantic.test.mjs`.
Tests cover loaded-fixture reproducibility, content tampering, hard-fail priority,
unknown/self grading, missing scores, private channels, prompt injection and
bounded closed schemas. No live quality benchmark is applicable to this policy;
these fixtures establish implementation behavior only. Runner (.4), baseline,
live model execution, statistical comparison, champion/A-B/production promotion
remain deferred to their authorized subreleases.
