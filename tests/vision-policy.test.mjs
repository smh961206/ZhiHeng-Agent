import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {visionApprovalFixture} from './fixtures/vision-approval.mjs';
import {visionSimulationEnv,visionHash,runVisionBenchmark} from '../scripts/vision-benchmark.mjs';
import {validateVisionPromotion,visionRoutingStatus} from '../server/vision-policy.mjs';
import {createJobModelState,assertJobModelState,withJobModelState} from '../server/model-state.mjs';
import {readVisionImages,visionStatus} from '../server/vision-model.mjs';
import {publicModelRouting} from '../server/model-routing.mjs';
const env=visionSimulationEnv;
test('Vision gate requires measured comparison, frozen corpus, exact config, review and every critical dimension',()=>{
 const valid=visionApprovalFixture(env);assert.equal(validateVisionPromotion(valid.comparison,valid.approval,env).accepted,true);
 for(const mutate of [
  b=>b.comparison.measurement='simulated',b=>b.comparison.results.pop(),b=>b.comparison.results[1].id=b.comparison.results[0].id,
  b=>b.comparison.binding='changed',b=>b.comparison.corpus.cases[0].expected.cells[0].value='999',b=>b.approval.visualReviewPassed=false,
  b=>b.approval.rollbackVerified=false,b=>b.approval.reportHash='changed',
  b=>b.comparison.results[0].candidate.response.model='other',b=>b.comparison.results[0].candidate.response.extraction.trust='verified',
  b=>b.comparison.results[0].candidate.response.extraction.images[0].sha256='0'.repeat(64),
 ]){const bundle=structuredClone(valid);mutate(bundle);assert.equal(validateVisionPromotion(bundle.comparison,bundle.approval,env).accepted,false);}
 for(const field of ['value','unit','date','row','footnote']){
  const bundle=structuredClone(valid),output=JSON.parse(bundle.comparison.results[0].candidate.response.text);output.cells[0][field]=field==='value'?'999':'wrong';
  bundle.comparison.results[0].candidate.response.text=JSON.stringify(output);bundle.approval.reportHash=visionHash(JSON.stringify(bundle.comparison));
  assert.ok(validateVisionPromotion(bundle.comparison,bundle.approval,env).reasons.includes('critical_quality_regression'));
 }
 assert.equal(validateVisionPromotion(valid.comparison,valid.approval,{...env,LLM_VISION_CHALLENGER_MODEL:'changed'}).accepted,false);
});
test('inactive or invalid challenger config leaves legacy available; promotion and rollback preserve saved identities',async()=>{
 const directory=fs.mkdtempSync(join(tmpdir(),'vision-admission-')),file=join(directory,'acceptance.json'),saved={...process.env};
 try{
  const legacy=createJobModelState(env);assert.equal(visionRoutingStatus({...env,FEATURE_VISION_ROUTING:'true'}).active,'legacy');
  assert.doesNotThrow(()=>createJobModelState({...env,LLM_VISION_CHALLENGER_THINKING:'invalid'}));
  fs.writeFileSync(file,JSON.stringify(visionApprovalFixture(env)));
  const active={...env,FEATURE_VISION_ROUTING:'true',VISION_ACCEPTANCE_FILE:file};
  assert.equal(visionRoutingStatus(active).active,'candidate');
  assert.equal(visionStatus(active).model,env.LLM_VISION_CHALLENGER_MODEL);
  assert.equal(visionStatus(active).visionModel,env.LLM_VISION_CHALLENGER_MODEL);
  const candidate=createJobModelState(active);assert.equal(candidate.profiles.find(p=>p.purposes.includes('vision')).id,'vision-challenger');
  assert.equal(publicModelRouting(active,candidate).visionModel,env.LLM_VISION_CHALLENGER_MODEL);
  assertJobModelState({modelState:legacy},active);assertJobModelState({modelState:candidate},active);
  const rotated={...active,LLM_VISION_CHALLENGER_API_KEY:'rotated'};assertJobModelState({modelState:candidate},rotated);
  Object.assign(process.env,active);const hosts=[];
  const fetcher=async url=>{hosts.push(url.hostname);return Response.json({choices:[{finish_reason:'stop',message:{content:'unverified'}}]});};
  for(const modelState of [legacy,candidate])await withJobModelState({modelState},()=>{
   assert.equal(visionStatus(active).model,modelState.profiles.find(p=>p.purposes.includes('vision')).model);
   return readVisionImages([{page:1,dataUrl:'data:image/png;base64,AA=='}],{env:active,prompt:'read',fetcher});
  });
  await withJobModelState({},()=>readVisionImages([{page:1,dataUrl:'data:image/png;base64,AA=='}],{env:active,prompt:'read',fetcher}));
  assert.deepEqual(hosts,['baseline.invalid','challenger.invalid','baseline.invalid']);
  const rollback={...active,FEATURE_VISION_ROUTING:'false'};assert.equal(visionRoutingStatus(rollback).active,'legacy');
  const output=execFileSync(process.execPath,['--input-type=module','-e',"process.argv.push('--check');await import('./scripts/start-legacy.mjs');if(process.env.FEATURE_VISION_ROUTING!=='false')process.exit(2);"],{env:{...process.env,...active},encoding:'utf8'});
  assert.equal(JSON.parse(output).active,'legacy');
  assertJobModelState({modelState:legacy},rollback);assert.throws(()=>assertJobModelState({modelState:candidate},rollback),{code:'model_state_incompatible'});
  assert.deepEqual(candidate,JSON.parse(JSON.stringify(candidate)));
 }finally{for(const key of Object.keys(process.env))if(!Object.hasOwn(saved,key))delete process.env[key];Object.assign(process.env,saved);fs.rmSync(directory,{recursive:true,force:true});}
});

test('admission cache avoids repeated reads and invalidates approval, config, credentials, code and rollback changes',()=>{
 const directory=fs.mkdtempSync(join(tmpdir(),'vision-cache-')),file=join(directory,'acceptance.json');
 const active={...env,FEATURE_VISION_ROUTING:'true',VISION_ACCEPTANCE_FILE:file};
 const read=fs.readFileSync,stat=fs.statSync;let reads=0,codeChanged=false;
 try{
  const bundle=visionApprovalFixture(env);fs.writeFileSync(file,JSON.stringify(bundle));
  assert.equal(visionRoutingStatus(active).active,'candidate');
  fs.readFileSync=function(file,...args){reads++;const result=read.call(this,file,...args);return codeChanged&&String(file).endsWith('/model-adapter.mjs')?result+'\n// synthetic changed code':result;};
  fs.statSync=function(file,...args){const result=stat.call(this,file,...args);if(codeChanged&&String(file).endsWith('/model-adapter.mjs'))result.ctimeNs+=1n;return result;};
  const status=visionRoutingStatus(active);status.active='mutated';status.reasons.push('mutated');
  for(let i=0;i<5;i++)assert.deepEqual(visionRoutingStatus(active),{active:'candidate',reasons:[]});
  assert.equal(reads,0,'Unchanged admission must not reread source/report or regrade');
  assert.equal(visionRoutingStatus({...active,LLM_VISION_CHALLENGER_API_KEY:''}).active,'legacy');
  assert.equal(visionRoutingStatus({...active,LLM_VISION_CHALLENGER_API_KEY:'rotated'}).active,'candidate');
  assert.equal(visionRoutingStatus({...active,LLM_VISION_CHALLENGER_THINKING:'disabled'}).active,'legacy');
  assert.equal(visionRoutingStatus(active).active,'candidate');
  codeChanged=true;assert.equal(visionRoutingStatus(active).active,'legacy');
  codeChanged=false;assert.equal(visionRoutingStatus(active).active,'candidate');
  const before=stat(file),replacement=join(directory,'replacement');
  const bad=JSON.stringify(bundle).replace('"visualReviewPassed":true','"visualReviewPassed":null');
  fs.writeFileSync(replacement,bad);fs.utimesSync(replacement,before.atime,before.mtime);fs.renameSync(replacement,file);
  assert.equal(stat(file).size,before.size);assert.equal(visionRoutingStatus(active).active,'legacy');
  fs.writeFileSync(file,JSON.stringify(bundle));assert.equal(visionRoutingStatus(active).active,'candidate');
  assert.equal(visionRoutingStatus({...active,FEATURE_VISION_ROUTING:'false'}).active,'legacy');
  fs.unlinkSync(file);assert.equal(visionRoutingStatus(active).active,'legacy');
 }finally{fs.readFileSync=read;fs.statSync=stat;fs.rmSync(directory,{recursive:true,force:true});}
});
test('complete offline comparison never passes promotion and live mode cannot bypass explicit bounds',async()=>{
 const report=await runVisionBenchmark({render:async()=>[{page:1,dataUrl:'data:image/png;base64,AA=='}]});
 assert.equal(report.requests,96);assert.equal(report.results.length,48);assert.equal(report.measurement,'simulated');assert.equal(report.qualityAccepted,false);
 assert.equal(report.usage.candidate.usage.totalTokens.knownTotal,null);
 const approval={...visionApprovalFixture(env).approval,reportHash:visionHash(JSON.stringify(report)),approvedAt:new Date().toISOString()};
 assert.ok(validateVisionPromotion(report,approval,env).reasons.includes('live_measurements_required'));
 await assert.rejects(runVisionBenchmark({live:true}),/explicit paid authorization/);
 await assert.rejects(runVisionBenchmark({live:true,allowPaid:true,maxRequests:95,env}),/Request cap/);
});
