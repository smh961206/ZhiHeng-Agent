import test from 'node:test';
import assert from 'node:assert/strict';
import {createJobModelState,assertJobModelState,withJobModelState} from '../server/model-state.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
import {researchResume,resumeScope,resumeSummary} from '../server/research-resume.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {runAgent} from '../server/agent.mjs';
import {publicJob} from '../server/job-stream.mjs';

const make=()=>{
 const job={id:'pin-test',status:'failed',mode:'B',input:{question:'synthetic',sources:[],securities:[]},events:[],marketData:{asOf:'2025-12-31'},modelState:createJobModelState()};
 job.checkpoint={version:1,scope:resumeScope(job),phase:'research',messages:[],toolRecords:[],evidence:[],modelState:structuredClone(job.modelState)};return job;
};
test('renaming configured models leaves historical pins intact and requires a new job',()=>{
 const historicalEnv={LLM_MODEL:'deepseek-v4-pro',LLM_VISION_MODEL:'deepseek-v4-flash-vision-exp'};
 const state=createJobModelState(historicalEnv);
 const job={mode:'B',modelState:state,checkpoint:{modelState:structuredClone(state)},marketData:{asOf:'2025-12-31'}};
 const before=structuredClone(job);
 assertJobModelState(job,historicalEnv);
 assert.throws(()=>assertJobModelState(job,{}),e=>e.code==='model_state_incompatible');
 assert.deepEqual(job,before);
 assert.deepEqual(createJobModelState({}).profiles.map(p=>p.model),['deepseek-flash','deepseek-flash','deepseek-flash']);
});
test('new pins survive JSON serialization and key rotation, but model/connection/mode/effort changes reject',()=>{
 const job=make(),env={...process.env};assertJobModelState(JSON.parse(JSON.stringify(job)));
 assertJobModelState(job,{...env,LLM_API_KEY:'rotated',LLM_VISION_API_KEY:'rotated-vision'});
 for(const change of [{LLM_MODEL:'changed'},{LLM_BASE_URL:'https://changed.invalid'},{LLM_VISION_MODEL:'changed'},{LLM_ROUTER_MODEL:'changed'},{MODEL_ROUTING_MODE:job.modelState.routingMode==='legacy'?'dry-run':'legacy'}])assert.throws(()=>assertJobModelState(job,{...env,...change}),e=>e.code==='model_state_incompatible');
 for(const mutate of [s=>s.profiles[0].reasoningEffort='high',s=>s.policyVersion=100,s=>s.escalationHistory.push({}),s=>s.extra='secret',s=>s.profiles.reverse()]){
  const other=structuredClone(job);mutate(other.modelState);other.checkpoint.modelState=structuredClone(other.modelState);assert.throws(()=>assertJobModelState(other),e=>e.status===409);
 }
 assert.doesNotMatch(JSON.stringify(job.modelState),/https:|api_key|reasoning_content/i);
});
test('corrupt new pin presence never downgrades to legacy; rejected resume cannot reacquire or run tools',async()=>{
 for(const corrupt of [j=>j.modelState=null,j=>delete j.modelState,j=>delete j.checkpoint.modelState,j=>j.checkpoint.modelState.profiles[0].model='different',j=>j.modelState.version=2]){
  const job=make();corrupt(job);const before=structuredClone(job);
  assert.throws(()=>researchResume(job),e=>e.code==='model_state_incompatible');
  assert.deepEqual(resumeSummary(job),{available:false,reason:'model_configuration_changed'});
  await assert.rejects(prepareResearchRetry(job,()=>assert.fail('must not read baseline')),e=>e.code==='model_state_incompatible');
  await assert.rejects(runAgent(job,()=>assert.fail('must not emit/start tools'),new AbortController().signal,{collectData:()=>assert.fail('must not collect')}),e=>e.code==='model_state_incompatible');
  assert.deepEqual(job,before);
 }
});
test('legacy absence stays absent; pinned retry preserves cutoff, sources and exact private pending-tool messages',async()=>{
 const legacy=make();delete legacy.modelState;delete legacy.checkpoint.modelState;
 assert.equal(researchResume(legacy).modelState,undefined);assert.equal((await prepareResearchRetry(legacy)).modelState,undefined);
 const job=make();job.checkpoint.messages=[{role:'assistant',content:null,reasoning_content:'private-marker',tool_calls:[{id:'pending',type:'function',function:{name:'read_rules',arguments:'{}'}}]}];
 const next=await prepareResearchRetry(job);assert.deepEqual(next.modelState,job.modelState);assert.deepEqual(next.checkpoint.messages,job.checkpoint.messages);assert.deepEqual(next.marketData,job.marketData);
 assert.doesNotMatch(JSON.stringify(publicJob(next)),/modelState|connectionIdentity|private-marker/);
 const missing=make();delete missing.checkpoint;await assert.rejects(prepareResearchRetry(missing),e=>e.code==='model_state_incompatible');
});
test('Gateway pins actual dispatch including custom catalog identity and explicit effort; async job scopes remain isolated',async()=>{
 const job=make(),oldFetch=global.fetch;let calls=0;
 try{
  global.fetch=async()=>{calls++;return Response.json({choices:[{message:{role:'assistant',content:'ok'},finish_reason:'stop'}]});};
  const req={purpose:'research',messages:[{role:'user',content:'synthetic'}]};
  const g=createModelGateway({env:{...process.env,LLM_API_KEY:'synthetic'}});
  await withJobModelState(job,()=>g.complete(req));assert.equal(calls,1);
  for(const bad of [{...req,reasoningEffort:'high'},{...req,routingContext:{profileId:'legacy-router'}}])await assert.rejects(withJobModelState(job,()=>g.complete(bad)),e=>e.code==='model_state_incompatible');
  for(const routingContext of [null,[],42])await assert.rejects(withJobModelState(job,()=>g.complete({...req,routingContext})),e=>e.category==='invalid_request');
  const catalog=createLegacyModelCatalog();const changed={profiles:catalog.profiles.map(p=>p.id==='legacy-analysis'?{...p,model:'changed'}:p)};
  await assert.rejects(withJobModelState(job,()=>createModelGateway({catalog:changed}).complete(req)),e=>e.code==='model_state_incompatible');
  const results=await Promise.all([withJobModelState(job,async()=>{await Promise.resolve();return g.complete(req);}),withJobModelState({},async()=>{await Promise.resolve();return createModelGateway({env:{...process.env,LLM_API_KEY:'synthetic',LLM_MODEL:'other'}}).complete(req);})]);
  assert.equal(results[0].model,job.modelState.profiles[0].model);assert.equal(results[1].model,'other');assert.equal(calls,3);
 }finally{global.fetch=oldFetch;}
});
