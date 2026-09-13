import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runJudgeBenchmark} from '../scripts/judge-benchmark.mjs';
import {compareJudgeSamples} from '../benchmark/statistics.mjs';
test('V5.2.8 frozen hard conflict safety set is graded without claiming real model quality',()=>{
 const r=runJudgeBenchmark();assert.equal(r.passed,true);assert.equal(r.modelRequests,0);assert.equal(r.qualityAccepted,false);assert.equal(r.comparison.liveEvidence,false);assert.equal(r.comparison.candidate.cases,12);assert.equal(r.comparison.candidate.criticalErrors,0);
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/judge-v52.json',import.meta.url))).cases;
 const samples=structuredClone(r.samples);samples[1].output.citations.pop();const corrupt=compareJudgeSamples(f,samples);assert.ok(corrupt.candidate.criticalErrors>0);
 assert.throws(()=>compareJudgeSamples(f,samples.slice(1)));samples[0].fixtureHash='bad';assert.throws(()=>compareJudgeSamples(f,samples));
});
