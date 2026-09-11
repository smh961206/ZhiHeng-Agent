import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
import {publicModelSelection,championRolloutStatus,createConfiguredJobModelState,assertModelRollout} from '../server/model-rollout.mjs';
import {createResearchCreator} from '../server/research-create.mjs';
import {normalizeModelCall} from '../server/model-telemetry.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {withJobModelState,modelStatePin} from '../server/model-state.mjs';
const setup=t=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-rollout-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const env={...championTestEnv(),MODEL_ROUTING_MODE:'champion',MODEL_CHAMPION_ENABLED:'true',MODEL_AB_ENABLED:'true',MODEL_CHAMPION_REGISTRY_FILE:path.join(root,'registry.json'),MODEL_CHAMPION_POLICY_VERSION:'test-policy-1'};const policy=championTestPolicy(env);fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:policy.id,policies:[policy]}));return {env,policy};};
test('V5.0.12 explicit matching approval activates new jobs; all missing/off/dry-run gates retain legacy',t=>{
 const {env}=setup(t),job={id:'job1',mode:'B',createdAt:'2026-09-03T00:00:00.000Z'};
 assert.equal(championRolloutStatus(env).active,'champion');assert.equal(publicModelSelection(env).mode,'champion');assert.equal(publicModelSelection(env).analysisModel,null);assert.equal(publicModelSelection(env).candidatesEnabled,true);const state=createConfiguredJobModelState(env,{mode:'B'},job);assert.equal(state.version,3);assert.doesNotThrow(()=>assertModelRollout({...job,modelState:state},env));
 for(const extra of [{MODEL_CHAMPION_ENABLED:'false'},{MODEL_AB_ENABLED:'false'},{MODEL_ROUTING_MODE:'legacy'},{MODEL_CHAMPION_POLICY_VERSION:'different'},{LLM_MAIN_CHALLENGER_API_KEY:''},{MODEL_CHAMPION_REGISTRY_FILE:''}]){const changed={...env,...extra};assert.equal(createConfiguredJobModelState(changed,{mode:'B'},job).version,1);assert.throws(()=>assertModelRollout({...job,modelState:state},changed),e=>e.code==='model_rollout_closed');}
 assert.equal(createConfiguredJobModelState(env,{}, {...job,mode:'A'}).version,1);assert.equal(createConfiguredJobModelState(env,{}, {...job,createdAt:'2026-08-01T00:00:00Z'}).version,1);
 assert.equal(normalizeModelCall({routingMode:'champion'}).routingMode,'champion');
});
test('V5.0.12 later policy versions do not reassign saved jobs; rollback preserves original checkpoint',t=>{
 const {env,policy}=setup(t),job={id:'job1',mode:'B',createdAt:'2026-09-03T00:00:00Z'};job.modelState=createConfiguredJobModelState(env,{},job);job.checkpoint={modelState:structuredClone(job.modelState),marketData:{cutoff:'original'}};const saved=structuredClone(job);
 const newer=championTestPolicy(env,{id:'test-policy-2',percent:20});fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:newer.id,policies:[policy,newer]}));const next={...env,MODEL_CHAMPION_POLICY_VERSION:newer.id};assert.doesNotThrow(()=>assertModelRollout(job,next));assert.deepEqual(job,saved);
 fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:null,policies:[policy,newer]}));assert.throws(()=>assertModelRollout(job,next));assert.deepEqual(job,saved);
});
for(const change of ['revoked','invalidated'])test(`V5.0.12 Gateway rechecks ${change} approval between calls without dispatch or checkpoint changes`,async t=>{
 const {env,policy}=setup(t),job={id:'per-call-approval',mode:'B',createdAt:'2026-09-03T00:00:00.000Z'};
 const previousEnv=process.env;process.env={...previousEnv,...env};t.after(()=>{process.env=previousEnv;});
 job.modelState=createConfiguredJobModelState(env,{},job);
 assert.equal(job.modelState.version,3);
 job.checkpoint={modelState:structuredClone(job.modelState),marketData:{cutoff:'2025-01-01'},messages:[{role:'tool',tool_call_id:'completed-tool',content:'saved evidence'}],toolRecords:[{toolCallId:'completed-tool',result:{text:'saved evidence'}}]};
 const saved=structuredClone(job),wires=[];
 const gateway=createModelGateway({env,fetchImpl:async(url,options)=>{
  wires.push({url:String(url),body:JSON.parse(options.body)});
  return Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:'mock approved output'}}]});
 }});
 const request={purpose:'research',messages:[{role:'user',content:'synthetic approval recheck'}]};
 await withJobModelState(job,async()=>{
  const pin=structuredClone(modelStatePin('research',env));
  const result=await gateway.complete(request);
  assert.equal(result.profile,job.modelState.active.profileId);
  assert.equal(wires.length,1);assert.equal(wires[0].body.model,job.modelState.profiles[0].model);
  assert.deepEqual(job,saved);
  const registry={version:1,activePolicyId:change==='revoked'?null:policy.id,policies:[structuredClone(policy)]};
  if(change==='invalidated')registry.policies[0].review.pipelineReviewPassed=false;
  fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify(registry));
  await assert.rejects(gateway.complete(request),error=>error.code==='model_rollout_closed');
  assert.equal(wires.length,1);
  assert.deepEqual(modelStatePin('research',env),pin);
  assert.deepEqual(job.modelState,saved.modelState);assert.deepEqual(job.checkpoint,saved.checkpoint);
  assert.deepEqual(job,saved);
 });
});

test('V5.0.12 duplicate creation and uncertain insert acknowledgement persist one experiment assignment',async t=>{
 const {env}=setup(t),prior={};for(const [key,value] of Object.entries(env)){prior[key]=process.env[key];process.env[key]=value;}t.after(()=>{for(const [key,value] of Object.entries(prior))if(value===undefined)delete process.env[key];else process.env[key]=value;});
 let stored,executions=0,inserts=0;const create=createResearchCreator({storage:{isJobDeleted:async()=>false,getJob:async()=>stored,createJob:async job=>{stored=structuredClone(job);inserts++;throw Error('lost acknowledgement');}},jobs:new Map(),controllers:new Map(),pendingStarts:new Set(),mutations:new Set(),prepare:async(input,id)=>({id,mode:'B',createdAt:'2026-09-03T00:00:00Z',status:'queued',input,plan:{historyYears:5},events:[]}),execute:async()=>{executions++;}});
 const key=randomUUID(),[a,b]=await Promise.all([create({mode:'B'},key),create({mode:'B'},key)]);assert.equal(inserts,1);assert.equal(executions,1);assert.equal(stored.modelState.version,3);assert.deepEqual(a.job.modelState,b.job.modelState);
 process.env.MODEL_CHAMPION_ENABLED='false';const retry=await create({mode:'B'},key);assert.deepEqual(retry.job.modelState,stored.modelState);assert.equal(executions,1);
});
