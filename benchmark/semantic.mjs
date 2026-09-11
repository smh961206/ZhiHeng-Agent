import {freeze, identifier, jsonData, requireBenchmark, timestamp, validateCase} from './case.mjs';
import {canonical, objectHash} from './fixtures.mjs';
import {gradeCase} from './graders.mjs';

// Policy only: no model client, dispatch hook, acceptance threshold or winner.
export const semanticPolicy = freeze({
  version: '1.0.0',
  trust: 'benchmark-only',
  automaticModelCalls: false,
  acceptanceEligible: false,
  requiresChainOfThought: false,
  limits: {records: 32, textCharacters: 100000, commentCharacters: 600, quoteCharacters: 600},
  rubrics: [
    {
      id: 'expression_clarity', version: '1.0.0',
      scope: 'Readability and organization of the public answer; not factual correctness or delivery validation.',
      anchors: [
        'The public explanation is unintelligible.',
        'Frequent ambiguity or disorganization obstructs understanding.',
        'The explanation is understandable with substantial rereading.',
        'The explanation is clear with minor ambiguity or repetition.',
        'The explanation is clear, precise and well organized throughout.',
      ],
    },
    {
      id: 'argument_coherence', version: '1.0.0',
      scope: 'How clearly the public argument connects stated premises, alternatives and conclusions; not verification of premises, math, evidence coverage or financial truth.',
      anchors: [
        'No intelligible connection between stated premises and conclusions.',
        'Major unexplained leaps obscure the public argument.',
        'The argument is traceable but key transitions remain unclear.',
        'The argument explains its transitions with minor gaps.',
        'The public argument clearly explains its transitions and the limits of its conclusions.',
      ],
    },
  ],
});

const check = (ok, message) => requireBenchmark(ok, `semantic ${message}`);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const opaque = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,199}$/.test(value);
function fields(value, keys) {
  check(value && !Array.isArray(value) && typeof value === 'object'
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k)), 'closed record required');
}
function model(value) {
  fields(value, ['profileId', 'profileVersion', 'profileHash', 'provider', 'model', 'modelVersion']);
  check(identifier(value.profileId) && identifier(value.profileVersion) && hash(value.profileHash)
    && (value.provider === null || identifier(value.provider)) && opaque(value.model)
    && (value.modelVersion === null || opaque(value.modelVersion)), 'model identity/version');
  return value;
}
// Reject private channels structurally, including inside deterministic output.
// This is not a detector for secrets or hidden reasoning pasted into public prose.
function publicData(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    check(!['reasoning', 'reasoningcontent', 'chainofthought', 'cot', 'privatecontinuation', 'messages', 'apikey', 'authorization']
      .includes(key.replace(/[_-]/g, '').toLowerCase()), 'private fields forbidden');
    publicData(child);
  }
}

function prepare(input) {
  const context = jsonData(input);
  fields(context, ['suite', 'caseId', 'output', 'candidate']);
  const {suite, output} = context;
  check(suite && suite.version === 1 && identifier(suite.id) && identifier(suite.benchmarkVersion)
    && timestamp(suite.frozenAt) && hash(suite.hash) && suite.hash === objectHash(suite.manifest)
    && suite.id === suite.manifest.id && suite.benchmarkVersion === suite.manifest.benchmarkVersion
    && suite.frozenAt === suite.manifest.frozenAt && Array.isArray(suite.cases), 'frozen suite identity');
  check(identifier(context.caseId), 'case ID');
  const matches = suite.cases.filter(c => c?.id === context.caseId);
  check(matches.length === 1, 'unique case required');
  const c = validateCase(matches[0]);
  const fixture = suite.fixtures?.[c.fixture];
  check(fixture && fixture.version === 1 && fixture.id === c.fixture && fixture.fixtureVersion === c.fixtureVersion
    && Array.isArray(fixture.sources) && Array.isArray(fixture.market) && Array.isArray(fixture.assets), 'fixture identity');
  check([...fixture.sources, ...fixture.market].every(s => s && timestamp(s.publishedAt)
    && Date.parse(s.publishedAt) <= Date.parse(c.cutoff))
    && fixture.market.every(m => timestamp(m.observedAt) && Date.parse(m.observedAt) <= Date.parse(c.cutoff)), 'future or undated fixture');
  fields(output, ['evaluation', 'text']);
  check(typeof output.text === 'string' && output.text.length <= semanticPolicy.limits.textCharacters, 'public text bound');
  publicData(output);
  const candidate = model(context.candidate);
  const binding = freeze({
    policyVersion: semanticPolicy.version, policyHash: objectHash(semanticPolicy),
    benchmarkVersion: suite.benchmarkVersion, suiteHash: suite.hash,
    caseId: c.id, caseHash: objectHash(c), fixtureId: fixture.id,
    fixtureVersion: fixture.fixtureVersion, fixtureHash: objectHash(fixture),
    outputHash: objectHash(output), candidateHash: objectHash(candidate),
  });
  return {c, fixture, output, candidate, binding, frozenAt: suite.frozenAt};
}

/** Supply a suite from loadFrozenSuite and the exact public output to be scored. */
export function createSemanticBinding(context) {
  return prepare(context).binding;
}

function validateRecord(input, prepared) {
  const record = jsonData(input);
  fields(record, ['version', 'id', 'binding', 'grader', 'scoredAt', 'scores']);
  check(record.version === 1 && identifier(record.id), 'record identity/version');
  check(canonical(record.binding) === canonical(prepared.binding), 'binding mismatch');
  check(timestamp(record.scoredAt) && new Date(record.scoredAt).toISOString() === record.scoredAt
    && Date.parse(record.scoredAt) >= Date.parse(prepared.frozenAt), 'scoring timestamp');
  const grader = record.grader;
  let relation;
  if (grader?.kind === 'human') {
    fields(grader, ['kind', 'reviewerId']);
    check(identifier(grader.reviewerId), 'human reviewer identity');
    relation = 'human';
  } else {
    fields(grader, ['kind', 'profile']);
    check(grader.kind === 'model', 'grader kind');
    const profile = model(grader.profile), candidate = prepared.candidate;
    // A profile alias or changed settings cannot disguise the same model as independent.
    relation = profile.model === candidate.model && profile.provider === candidate.provider ? 'self'
      : profile.provider === null || candidate.provider === null || profile.modelVersion === null
        || candidate.modelVersion === null ? 'unknown' : 'external-model';
  }
  check(Array.isArray(record.scores) && record.scores.length === semanticPolicy.rubrics.length, 'complete rubric slots required');
  const scores = semanticPolicy.rubrics.map(rubric => {
    const matches = record.scores.filter(s => s?.rubricId === rubric.id);
    check(matches.length === 1, 'unique supported rubric required');
    const score = matches[0];
    fields(score, ['rubricId', 'rubricVersion', 'score', 'quote', 'comment']);
    check(score.rubricVersion === rubric.version, 'rubric version');
    check(score.score === null || Number.isInteger(score.score) && score.score >= 0 && score.score <= 4, 'integer score 0..4 or null');
    check(text(score.comment, semanticPolicy.limits.commentCharacters), 'brief public comment required');
    check(score.score === null ? score.quote === ''
      : text(score.quote, semanticPolicy.limits.quoteCharacters) && prepared.output.text.includes(score.quote), 'public output quote required');
    return score;
  });
  return {...record, scores, relation, acceptanceEligible: false};
}

/** Validate externally supplied observations. Never call a model or infer acceptance. */
export function evaluateSemanticPolicy(context, inputs = []) {
  const prepared = prepare(context);
  const raw = jsonData(inputs);
  check(Array.isArray(raw) && raw.length <= semanticPolicy.limits.records, 'record count bound');
  const records = raw.map(record => validateRecord(record, prepared));
  check(new Set(records.map(r => r.id.toLowerCase())).size === records.length, 'duplicate record ID');
  const reviewerKeys = records.map(r => r.grader.kind === 'human'
    ? `human:${r.grader.reviewerId.toLowerCase()}` : `model:${objectHash(r.grader.profile)}`);
  check(new Set(reviewerKeys).size === records.length, 'duplicate reviewer; resolve explicitly');
  records.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  // Recompute the existing hard grade over the SAME hashed evaluation output.
  const deterministic = gradeCase(prepared.c, prepared.fixture, prepared.output.evaluation);
  return freeze({
    version: 1, binding: prepared.binding, candidate: prepared.candidate, deterministic,
    status: records.length === 0 ? 'unassessed' : records.every(r => r.scores.every(s => s.score !== null)) ? 'assessed' : 'partial',
    records, acceptanceEligible: false, trust: 'benchmark-only',
  });
}
