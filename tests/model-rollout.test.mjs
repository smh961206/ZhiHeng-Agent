import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {modelRolloutFingerprint,validateModelRollout,modelRolloutStatus,createConfiguredJobModelState,assertModelRollout,publicModelSelection} from '../server/model-rollout.mjs';
import {createPolicyJobModelState,withJobModelState,noteModelFailure} from '../server/model-state.mjs';
import {escalateAtCheckpoint} from '../server/model-escalation.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/model-routing-offline-cases.json',import.meta.url)));
const env={...process.env,MODEL_ROUTING_MODE:'policy',LLM_MAIN_API_KEY:'synthetic',LLM_API_KEY:'synthetic'};
// Synthetic validator fixture only; never publish this as a real acceptance report.
const report=()=>({version:1,kind:'live-model-comparison',fingerprint:modelRolloutFingerprint(env),dryRunAccepted:true,rollbackVerified:true,approvedBy:'SYNTHETIC-UNIT-TEST',approvedAt:'2026-09-10T00:00:00Z',cases:Array.from({length:60},(_,i)=>({id:'synthetic-'+i,mode:'ABCDEF'[i%6],source:'live',baseline:{deliveryPassed:true,citationPassed:true,criticalFactErrors:0},candidate:{deliveryPassed:true,citationPassed:true,criticalFactErrors:0}}))});

test('public model settings describe admitted execution, not configured candidates or private approval details',()=>{
 const e={LLM_API_KEY:'PRIVATE_TEST_KEY',LLM_MODEL:'configured-analysis',LLM_VISION_MODEL:'configured-vision',LLM_VISION_INPUT:'images',
  LLM_VISION_CHALLENGER_MODEL:'DORMANT_CANDIDATE',LLM_MAIN_CHALLENGER_MODEL:'DORMANT_MAIN',MODEL_CHAMPION_REGISTRY_FILE:'PRIVATE_REGISTRY_PATH'};
 const expected={mode:'legacy',analysisModel:'configured-analysis',visionModel:'configured-vision',candidatesEnabled:false};
 assert.deepEqual(publicModelSelection(e),expected);
 assert.deepEqual(publicModelSelection({...e,MODEL_ROUTING_MODE:'dry-run'}),{...expected,mode:'dry-run'});
 for(const mode of ['policy','champion','unknown'])assert.deepEqual(publicModelSelection({...e,MODEL_ROUTING_MODE:mode}),expected);
 assert.deepEqual(publicModelSelection({...e,LLM_VISION_INPUT:'off'}),{...expected,visionModel:null});
 assert.doesNotMatch(JSON.stringify(publicModelSelection(e)),/PRIVATE|DORMANT|approvedBy|connection|reasons/);
});

test('rollout accepts only current live evidence with fifty unique cases, six modes, dry-run and rollback acceptance',()=>{
 assert.deepEqual(validateModelRollout(report(),env),{accepted:true,reasons:[]});
 for(const change of [r=>r.kind='offline-safety-comparison',r=>r.fingerprint='stale',r=>r.dryRunAccepted=false,r=>r.rollbackVerified=false,r=>r.approvedBy='',r=>r.cases=r.cases.slice(0,49),r=>r.cases[1].id=r.cases[0].id,r=>r.cases.forEach(c=>c.mode='A'),r=>r.cases[0].source='mock',r=>r.cases[0].candidate.citationPassed=false,r=>r.cases[0].candidate.deliveryPassed=false,r=>r.cases[0].candidate.criticalFactErrors=1]){
  const r=report();change(r);assert.equal(validateModelRollout(r,env).accepted,false);
 }
 assert.equal(validateModelRollout(fixture,env).accepted,false,'offline safety cases cannot unlock live policy');
 assert.equal(validateModelRollout(report(),{...env,LLM_MAIN_BASE_URL:'https://changed.invalid'}).accepted,false);
 assert.equal(validateModelRollout(report(),{...env,LLM_MAIN_API_KEY:'rotated'}).accepted,true);
 assert.equal(validateModelRollout(report(),{...env,LLM_REVIEW_FORMAT:'text'}).accepted,false);
 assert.equal(validateModelRollout(report(),{...env,LLM_TIMEOUT_MS:'60000',LLM_MAX_DURATION_MS:'90000'}).accepted,false);
});

test('missing/rejected evidence stays legacy; accepted initial policy uses complexity and rollback preserves saved pins',()=>{
 const path=new URL('../artifacts/rollout-test-'+randomUUID()+'.json',import.meta.url);
 const e={...env,MODEL_POLICY_ACCEPTANCE_FILE:path.pathname.replace(/^\/(?=[A-Za-z]:)/,'')};
 // URL decoding handles the workspace space on Windows.
 e.MODEL_POLICY_ACCEPTANCE_FILE=decodeURIComponent(e.MODEL_POLICY_ACCEPTANCE_FILE);
 try{
  assert.equal(modelRolloutStatus(e).active,'legacy');assert.equal(createConfiguredJobModelState(e,{mode:'A'}).version,1);
  fs.writeFileSync(path,JSON.stringify(fixture));assert.equal(modelRolloutStatus(e).active,'legacy');
  fs.writeFileSync(path,JSON.stringify(report()));assert.equal(modelRolloutStatus(e).active,'policy');
  assert.equal(createConfiguredJobModelState(e,{mode:'A'}).active.reasoningEffort,'low');
  assert.deepEqual(createConfiguredJobModelState(e,{mode:'B',historyYears:5}).active,{profileId:'pro',reasoningEffort:'max'});
  const job={modelState:createConfiguredJobModelState(e,{mode:'A'})},before=structuredClone(job);
  assertModelRollout(job,e);assert.throws(()=>assertModelRollout(job,{...e,MODEL_ROUTING_MODE:'legacy'}),e=>e.code==='model_rollout_closed');assert.deepEqual(job,before);
  assert.equal(createConfiguredJobModelState({...e,MODEL_ROUTING_MODE:'legacy'},{mode:'B'}).version,1);
 }finally{if(fs.existsSync(path))fs.unlinkSync(path);}
});

test('one-command legacy entry overrides inherited policy without modifying environment files or saved records',()=>{
 const result=spawnSync(process.execPath,['scripts/start-legacy.mjs','--check'],{env:{...env},encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{requested:'legacy',active:'legacy',reasons:[]});
});

for(const c of fixture.cases)test(`offline baseline/candidate safety ${c.id}: ${c.mode} ${c.kind} x${c.count}`,async()=>{
 const messages=[{role:'system',content:'Evidence first'},{role:'user',content:'Synthetic task'}];
 const job={mode:c.mode,input:{sources:[]},modelState:createPolicyJobModelState(),checkpoint:undefined};
 job.checkpoint={messages:structuredClone(messages),toolRecords:[],evidence:[],draft:'',pendingRound:false,modelState:structuredClone(job.modelState)};
 for(let i=0;i<c.count;i++)noteModelFailure(job,c.kind);
 await escalateAtCheckpoint(job,{phase:'research',messages,persist:async()=>{}});
 const dispatched=[];
 const g=createModelGateway({env,fetchImpl:async(u,o)=>{dispatched.push(JSON.parse(o.body));return Response.json({choices:[{message:{role:'assistant',content:'synthetic response; not a quality measurement'},finish_reason:'stop'}]});}});
 await g.complete({purpose:'research',messages});
 await withJobModelState(job,()=>g.complete({purpose:'research',messages}));
 assert.equal(dispatched.length,2);assert.equal(dispatched[0].model,env.LLM_MODEL||'deepseek-flash');assert.equal(dispatched[0].reasoning_effort,undefined);
 assert.equal(dispatched[1].model,'glm-5.3-flash');assert.equal(dispatched[1].reasoning_effort,c.expectedEffort);
 assert.equal(fixture.qualityAcceptance,false);
});
