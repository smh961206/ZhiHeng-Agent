import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {runBenchmark} from '../benchmark/runner.mjs';
import {freezeBaseline,validateBaseline} from '../benchmark/baseline.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
import {temporaryBenchmark} from './fixtures/benchmark.mjs';
test('V5.0.5 immutable baseline binds metrics/model/runtime/grader without inventing quality acceptance',async t=>{
 const f=temporaryBenchmark(t);await runBenchmark({...f,profiles:[createLegacyModelCatalog({}).profiles[0]],executorVersion:'test-v1',codeHash:'code',execute:async()=>({output:f.output,calls:[]})});
 const options={...f,id:'baseline-v1',outputFile:path.join(f.root,'baseline.json'),codeHash:'code',policyVersion:'legacy',acceptedAt:'2026-09-11T00:00:00Z'};
 const b=freezeBaseline(options);assert.equal(b.metrics.passed,1);assert.equal(b.qualityAccepted,false);assert.equal(b.evidenceKind,'simulation');assert.equal(b.environment.node,process.version);assert.deepEqual(validateBaseline(b),b);
 assert.throws(()=>freezeBaseline(options),/EEXIST/);assert.throws(()=>validateBaseline({...b,policyVersion:'other'}),/changed/);
});
