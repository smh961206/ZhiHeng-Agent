import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
import {assignModelExperiment,validateModelExperiment,modelExperimentAlgorithm} from '../server/model-experiment.mjs';
import {createChampionJobModelState,createJobModelState,createPolicyJobModelState,assertJobModelState,withJobModelState,modelStatePin,hasPolicyModelState,hasChampionModelState,noteModelFailure} from '../server/model-state.mjs';
import {createBenchmarkModelCatalog} from '../server/model-catalog.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {publicModelRouting} from '../server/model-routing.mjs';
import {resumeScope,researchResume,pendingToolCalls} from '../server/research-resume.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {escalateAtCheckpoint} from '../server/model-escalation.mjs';
import {publicJob} from '../server/job-stream.mjs';
import {runAgent} from '../server/agent.mjs';

const env={...championTestEnv(),MODEL_ROUTING_MODE:'legacy',FEATURE_VISION_ROUTING:'false',LLM_MODEL:'deepseek-flash',LLM_BASE_URL:'https://legacy.invalid',LLM_ROUTER_MODEL:'deepseek-flash',LLM_VISION_MODEL:'deepseek-flash',LLM_VISION_BASE_URL:'https://legacy.invalid',LLM_VISION_API_KEY:'test-key',LLM_PRO_MODEL:'deepseek-flash',LLM_PRO_BASE_URL:'https://pro.invalid'};
let originalEnv,originalFetch,registryRoot;
test.before(()=>{
 originalEnv=process.env;originalFetch=globalThis.fetch;
 registryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'zh-experiment-approval-'));
 Object.assign(env,{MODEL_ROUTING_MODE:'champion',MODEL_CHAMPION_ENABLED:'true',MODEL_AB_ENABLED:'true',MODEL_CHAMPION_POLICY_VERSION:'test-policy-1',MODEL_CHAMPION_REGISTRY_FILE:path.join(registryRoot,'registry.json')});
 const policy=championTestPolicy(env);
 fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:policy.id,policies:[policy]}));
 process.env={...originalEnv,...env};globalThis.fetch=async()=>assert.fail('Real model requests are forbidden');
});
test.after(()=>{process.env=originalEnv;globalThis.fetch=originalFetch;if(registryRoot)fs.rmSync(registryRoot,{recursive:true,force:true});});
const jobInput=(id='experiment-job',mode='B')=>({id,createdAt:'2026-09-03T00:00:00.000Z',mode});
function makeJob(group='candidate',policy=championTestPolicy(env)){
 let job,selection;
 for(let i=0;i<1000;i++){job=jobInput('experiment-'+i);selection=assignModelExperiment(job,policy);if(selection.group===group)break;}
 assert.equal(selection.group,group);
 Object.assign(job,{status:'failed',input:{question:'synthetic',mode:job.mode,securities:[],sources:[{id:'S1',text:'actual saved evidence'}]},events:[],marketData:{asOf:'2025-01-01'},modelState:createChampionJobModelState(env,selection)});
 job.checkpoint={version:1,scope:resumeScope(job),phase:'research',pendingRound:true,draft:'',modelState:structuredClone(job.modelState),
  messages:[{role:'assistant',content:null,reasoning_content:'PRIVATE-CHAMPION',tool_calls:[{id:'done',type:'function',function:{name:'read_rules',arguments:'{}'}},{id:'pending',type:'function',function:{name:'read_rules',arguments:'{}'}}]},{role:'tool',tool_call_id:'done',content:'saved'}],
  toolRecords:[{toolCallId:'done',toolName:'read_rules',result:{text:'saved'}}],evidence:[{sourceId:'S1',text:'saved'}]};
 return job;
}
const response=()=>Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:'mock output'}}]});

test('V5.0.11 assignment is pure, deterministic, policy-bound and freezes both arms',()=>{
 const policy=championTestPolicy(env),before=structuredClone(policy),job=jobInput(),selection=assignModelExperiment(job,policy);
 assert.deepEqual(policy,before);assert.deepEqual(job,jobInput());assert.deepEqual(selection,assignModelExperiment(job,policy));
 assert.ok(Object.isFrozen(selection));assert.equal(selection.algorithm,modelExperimentAlgorithm);
 const expected=Number.parseInt(createHash('sha256').update(JSON.stringify([job.id,policy.id])).digest('hex').slice(0,8),16)%100;
 assert.equal(selection.bucket,expected);
 assert.deepEqual(validateModelExperiment(JSON.parse(JSON.stringify(selection)),{job,policy}),selection);
 for(const group of ['baseline','candidate'])assert.equal(makeJob(group,policy).modelState.selection.profileId,group==='candidate'?'main-challenger':'main');
 assert.doesNotMatch(JSON.stringify(selection),/test-key|https:|PRIVATE/);
});

test('V5.0.11 hash bucket does not change when percent changes, but an existing selection rejects the new policy',()=>{
 const a=championTestPolicy(env,{percent:10}),b=championTestPolicy(env,{percent:90}),job=jobInput();
 const first=assignModelExperiment(job,a),second=assignModelExperiment(job,b);
 assert.equal(first.bucket,second.bucket);assert.notEqual(first.policyHash,second.policyHash);
 assert.throws(()=>validateModelExperiment(first,{job,policy:b}),e=>e.code==='model_experiment_invalid');
 assert.deepEqual(first,assignModelExperiment(job,a));
});

test('V5.0.11 denies disabled/dry-run, unknown scope and approvals after job creation',()=>{
 for(const stage of ['disabled','dry-run'])assert.throws(()=>assignModelExperiment(jobInput(),championTestPolicy(env,{stage,percent:0})),/Invalid model experiment/);
 const policy=championTestPolicy(env);
 assert.throws(()=>assignModelExperiment({...jobInput(),createdAt:'2026-09-01T00:00:00Z'},policy),/Invalid model experiment/);
 assert.doesNotThrow(()=>assignModelExperiment({...jobInput(),createdAt:policy.review.approvedAt},policy));
 for(const mode of ['A','E','unknown',null])assert.throws(()=>assignModelExperiment(jobInput('job',mode),policy),/Invalid model experiment/);
 const production=championTestPolicy(env,{stage:'production',percent:100});assert.equal(assignModelExperiment(jobInput(),production).group,'candidate');
 const quick=assignModelExperiment(jobInput('quick','A'),championTestPolicy(env,{taskClasses:['quick_screen']}));
 assert.equal(quick.effort,'low');assert.equal(quick.taskClass,'quick_screen');
 assert.throws(()=>validateModelExperiment({...quick,effort:'high'}),/Invalid model experiment/);
});

test('V5.0.11 selection rejects extra/missing fields, getters and corrupt assignment invariants',()=>{
 const policy=championTestPolicy(env),job=jobInput(),selection=assignModelExperiment(job,policy);
 for(const mutate of [s=>s.extra='PRIVATE',s=>delete s.configurationHash,s=>s.version=2,s=>s.bucket=(s.bucket+1)%100,s=>s.bucket=String(s.bucket),s=>s.percent='50',s=>s.percent=0,s=>s.percent=100,s=>s.group='other',s=>s.profileId='pro',s=>s.baselineId=s.candidateId,s=>s.algorithm='other',s=>s.classifierVersion='2',s=>s.taskClass='review',s=>s.mode='A',s=>s.configurationHash='bad',s=>s.policyHash='bad',s=>s.effort='medium',s=>s.approvedAt='2027-01-01T00:00:00Z']){
  const other=structuredClone(selection);mutate(other);assert.throws(()=>validateModelExperiment(other),e=>e.code==='model_experiment_invalid');
 }
 for(const change of [{id:'other-job'},{createdAt:'2026-09-04T00:00:00Z'},{mode:'C'}])assert.throws(()=>validateModelExperiment(selection,{job:{...job,...change}}),/Invalid model experiment/);
 const other=structuredClone(selection);Object.defineProperty(other,'bucket',{enumerable:true,get(){assert.fail('getter invoked');}});assert.throws(()=>validateModelExperiment(other),/Invalid model experiment/);
});

test('V5.0.11 v3 state survives JSON and key rotation while preserving legacy profiles and private checkpoints',()=>{
 for(const group of ['baseline','candidate']){
  const job=makeJob(group),state=job.modelState;assertJobModelState(JSON.parse(JSON.stringify(job)),env);
  assertJobModelState(job,{...env,LLM_MAIN_API_KEY:'rotated',LLM_MAIN_CHALLENGER_API_KEY:'rotated-candidate'});
  assert.equal(state.version,3);assert.equal(state.routingMode,'champion');assert.deepEqual(state.escalationHistory,[]);
  assert.deepEqual(state.profiles.slice(1),createJobModelState(env).profiles.slice(1));
  assert.equal(state.profiles.length,3);assert.equal(state.profiles[0].id,state.selection.profileId);
  assert.equal(publicModelRouting(env,state).analysisModel,state.profiles[0].model);
  assert.doesNotMatch(JSON.stringify(publicJob(job)),/PRIVATE-CHAMPION|policyHash|configurationHash|connectionIdentity|selection/);
 }
});

test('V5.0.11 full two-arm configuration hash catches capability/thinking changes and endpoint/model drift',()=>{
 for(const group of ['baseline','candidate']){
  const job=makeJob(group),before=structuredClone(job);
  const caps=JSON.parse(env.LLM_MAIN_CHALLENGER_CAPABILITIES);
  for(const changes of [
   {LLM_MAIN_CHALLENGER_MODEL:'changed'},{LLM_MAIN_CHALLENGER_BASE_URL:'https://changed.invalid'},
   {LLM_MAIN_BASE_URL:'https://changed-main.invalid'},
   {LLM_MAIN_CHALLENGER_CAPABILITIES:JSON.stringify({...caps,jsonSchema:false})},
   {LLM_MAIN_CHALLENGER_THINKING:'omit',LLM_MAIN_CHALLENGER_CAPABILITIES:JSON.stringify({...caps,reasoningControl:false})},
  ])assert.throws(()=>assertJobModelState(job,{...env,...changes}),e=>e.code==='model_state_incompatible');
  assert.deepEqual(job,before);
 }
});

test('V5.0.11 all three analysis purposes dispatch the fixed profile and never enter v2 escalation',async()=>{
 for(const group of ['baseline','candidate']){
  const job=makeJob(group),before=structuredClone(job),wires=[];
  const g=createModelGateway({env,fetchImpl:async(url,options)=>{wires.push({url:String(url),body:JSON.parse(options.body)});return response();}});
  await withJobModelState(job,async()=>{
   assert.equal(hasChampionModelState(),true);assert.equal(hasPolicyModelState(),false);
   for(const purpose of ['research','review','followup']){
    assert.equal(modelStatePin(purpose,env).id,job.modelState.active.profileId);
    await g.complete({purpose,messages:[{role:'user',content:'synthetic'}]});
   }
  });
  assert.equal(wires.length,3);assert.ok(wires.every(w=>w.body.model===job.modelState.profiles[0].model&&w.body.reasoning_effort==='low'));
  assert.ok(wires.every(w=>w.url===(group==='candidate'?'https://candidate.invalid/chat/completions':'https://main.invalid/chat/completions')));
  for(let i=0;i<3;i++)noteModelFailure(job,'structured_output');
  assert.equal(await escalateAtCheckpoint(job,{phase:'research',messages:[],persist:()=>assert.fail('no escalation persistence')}),false);
  assert.deepEqual(job,before);
 }
});

test('V5.0.11 custom catalog cannot override pinned capabilities, thinking, effort or profile',async()=>{
 const job=makeJob(),request={purpose:'research',messages:[{role:'user',content:'synthetic'}]};let calls=0;
 const fetchImpl=async()=>{calls++;return response();};
 for(const mutate of [p=>p.capabilities.jsonSchema=false,p=>{p.adapterOptions.thinking='omit';p.capabilities.reasoningControl=false;},p=>p.model='changed']){
  const catalog=structuredClone(createBenchmarkModelCatalog(env));mutate(catalog.profiles.find(p=>p.id==='main-challenger'));
  await assert.rejects(withJobModelState(job,()=>createModelGateway({env,catalog,fetchImpl}).complete(request)),e=>e.code==='model_state_incompatible');
 }
 const g=createModelGateway({env,fetchImpl});
 for(const change of [{routingContext:{profileId:'main'}},{reasoningEffort:'high'}])await assert.rejects(withJobModelState(job,()=>g.complete({...request,...change})),e=>e.code==='model_state_incompatible');
 assert.equal(calls,0);
});

test('V5.0.11 independent concurrent job scopes retain different fixed arms',async()=>{
 const jobs=[makeJob('baseline'),makeJob('candidate')];
 const g=createModelGateway({env,fetchImpl:async()=>response()});
 const results=await Promise.all(jobs.map(job=>withJobModelState(job,async()=>{await Promise.resolve();return g.complete({purpose:'research',messages:[{role:'user',content:'synthetic'}]});})));
 assert.deepEqual(results.map(r=>r.profile),['main','main-challenger']);assert.equal(hasChampionModelState(),false);
});

test('V5.0.11 resume/retry preserve cutoff, exact private messages and completed tool receipts',async()=>{
 const job=makeJob(),before=structuredClone(job),resumed=researchResume(job),next=await prepareResearchRetry(job);
 assert.deepEqual(resumed,job.checkpoint);assert.deepEqual(next.modelState,job.modelState);assert.deepEqual(next.marketData,job.marketData);
 assert.deepEqual(next.input.sources,job.input.sources);assert.deepEqual(next.checkpoint.messages,job.checkpoint.messages);
 assert.deepEqual(pendingToolCalls(next.checkpoint.messages).map(c=>c.id),['pending']);assert.deepEqual(job,before);
});

test('V5.0.11 corrupt v3 presence blocks resume, retry and Agent before data/tool/model work',async()=>{
 for(const mutate of [j=>delete j.modelState.selection,j=>j.modelState.selection=null,j=>j.modelState.version=4,j=>j.modelState.active.profileId='main',j=>j.modelState.escalationHistory.push({}),j=>j.modelState.configurationHash='bad',j=>j.id='other',j=>j.createdAt='2026-09-04T00:00:00Z',j=>j.mode='C',j=>delete j.checkpoint.modelState,j=>j.checkpoint.modelState.selection.percent=10]){
  const job=makeJob();mutate(job);const before=structuredClone(job);
  assert.throws(()=>researchResume(job),e=>e.code==='model_state_incompatible');
  await assert.rejects(prepareResearchRetry(job),e=>e.code==='model_state_incompatible');
  await assert.rejects(runAgent(job,()=>assert.fail('must not emit'),new AbortController().signal,{collectData:()=>assert.fail('must not collect')}),e=>e.code==='model_state_incompatible');
  assert.deepEqual(job,before);
 }
});

test('V5.0.11 no-state/v1/v2 remain exact and unassigned regardless of experiment configuration',()=>{
 assertJobModelState({},env);
 for(const factory of [createJobModelState,createPolicyJobModelState]){
  const state=factory({...env,MODEL_AB_ENABLED:'false'}),job={mode:'B',modelState:state,checkpoint:{modelState:structuredClone(state)}};
  assert.equal(Object.hasOwn(state,'selection'),false);assertJobModelState(job,env);
  assert.deepEqual(factory({...env,MODEL_AB_ENABLED:'true'}),state);
 }
});
