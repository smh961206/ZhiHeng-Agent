import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {runBenchmark,readBenchmarkRun,persistBenchmark} from '../benchmark/runner.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
import {temporaryBenchmark} from './fixtures/benchmark.mjs';
import {objectHash,sha256} from '../benchmark/fixtures.mjs';
import {benchmarkTaskClass} from '../server/model-task-class.mjs';
import {validateCase} from '../benchmark/case.mjs';
const profile=createLegacyModelCatalog({}).profiles[0];
const options=(f,execute)=>({...f,profiles:[profile],executorVersion:'test-v1',codeHash:'test-code',execute});
test('V5.0 recorded long-document/review class comes only from typed frozen case signals',async t=>{
 for(const [signals,expected] of [[{mode:'B',documentPages:60},'long_document'],[{purpose:'review'},'review']]){
  const f=temporaryBenchmark(t),c={...f.case,taskSignals:signals},bytes=JSON.stringify([c]);
  fs.writeFileSync(path.join(f.suiteDirectory,'cases.json'),bytes);
  const manifestFile=path.join(f.suiteDirectory,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile));manifest.files.find(f=>f.kind==='cases').sha256=sha256(bytes);fs.writeFileSync(manifestFile,JSON.stringify(manifest));
  const result=await runBenchmark(options(f,async()=>({output:f.output,calls:[],taskSignals:{purpose:'vision'}})));
  assert.equal(benchmarkTaskClass(result.results[0]),expected);assert.deepEqual(result.results[0].taskSignals,signals);
  const row=result.results[0];row.taskSignals={purpose:'vision'};const run=result.run;run.units[0].resultHash=objectHash(row);
  fs.writeFileSync(path.join(f.directory,'results',row.unitId+'.json'),JSON.stringify(row));fs.writeFileSync(path.join(f.directory,'run.json'),JSON.stringify(run));
  assert.throws(()=>readBenchmarkRun(f.directory,{suiteDirectory:f.suiteDirectory,codeHash:'test-code'}),/task signals/);
 }
 for(const s of [null,[],{documentPages:'60'},{purpose:'unknown'},{toolWorkflow:'true'},{cost:0}])assert.throws(()=>validateCase({...temporaryBenchmark(t).case,taskSignals:s}),/task signals/);
});
test('V5.0.4 transient Windows file locks retry only persistence with a fixed limit',async()=>{
 let calls=0;await persistBenchmark('unused',{}, {writer:()=>{if(++calls<3)throw Object.assign(Error(),{code:'EPERM'});},wait:async()=>{}});assert.equal(calls,3);
 calls=0;await assert.rejects(persistBenchmark('unused',{}, {writer:()=>{calls++;throw Object.assign(Error(),{code:'EACCES'});},wait:async()=>{}}));assert.equal(calls,5);
});
test('V5.0.4 repeatable run stores per-case identities, actual metrics and no private channels',async t=>{
 const f=temporaryBenchmark(t);let calls=0;
 const execute=async({task,fixture})=>{calls++;assert.equal(task.expectedFacts,undefined);assert.equal(fixture.referenceOutput,undefined);return {output:f.output,calls:[{id:'call',status:'succeeded',profile:profile.id,purpose:'research',reasoning_content:'PRIVATE',usage:{inputTokens:0,outputTokens:null}}]};};
 const result=await runBenchmark({...options(f,execute),repeats:2});assert.equal(calls,2);assert.equal(result.summary.profiles[0].passed,2);assert.equal(result.summary.qualityAccepted,false);assert.equal(result.summary.profiles[0].usage.unknownBillingCalls,2);
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 await runBenchmark({...options(f,execute),repeats:2,resume:true});assert.equal(calls,2);
 await assert.rejects(runBenchmark({...options(f,execute),repeats:1,resume:true}),/changed/);
});
test('V5.0.4 uncertain dispatch is durable and never silently repeated',async t=>{
 const f=temporaryBenchmark(t);let calls=0;const execute=async()=>{calls++;throw Error('secret provider body');};
 await assert.rejects(runBenchmark(options(f,execute)),/secret provider body/);
 await assert.rejects(runBenchmark({...options(f,execute),resume:true}),/outcome unknown/);assert.equal(calls,1);
 assert.ok(!fs.readFileSync(path.join(f.directory,'run.json'),'utf8').includes('secret provider body'));
});
test('V5.0.4 invalid outputs and unsupported capabilities remain failed samples',async t=>{
 const f=temporaryBenchmark(t);const result=await runBenchmark(options(f,async()=>({output:{reasoning_content:'PRIVATE'},calls:[]})));
 assert.equal(result.summary.profiles[0].passed,0);assert.equal(result.results[0].output,null);assert.equal(result.summary.profiles[0].dimensions.facts.assessed,0);
 const g=temporaryBenchmark(t),denied={...profile,capabilities:{...profile.capabilities,textInput:false}};let calls=0;
 const r=await runBenchmark({...options(g,async()=>{calls++;}),profiles:[denied]});assert.equal(calls,0);assert.equal(r.results[0].failure,'unsupported_capability');
});
test('V5.0.4 rejects changed output/code and concurrent writer before execution',async t=>{
 const f=temporaryBenchmark(t);await runBenchmark(options(f,async()=>({output:f.output,calls:[]})));
 const file=path.join(f.directory,'results',fs.readdirSync(path.join(f.directory,'results'))[0]);const r=JSON.parse(fs.readFileSync(file));r.output.facts[0].value=0;fs.writeFileSync(file,JSON.stringify(r));
 assert.throws(()=>readBenchmarkRun(f.directory,{suiteDirectory:f.suiteDirectory,codeHash:'test-code'}),/changed/);
 await assert.rejects(runBenchmark({...options(f,async()=>{}),resume:true,codeHash:'new'}),/code changed/);
 fs.writeFileSync(path.join(f.directory,'runner.lock'),'other owner');await assert.rejects(runBenchmark({...options(f,async()=>{}),resume:true}),/EEXIST/);
});
