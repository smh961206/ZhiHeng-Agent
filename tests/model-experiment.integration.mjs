import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
import {assignModelExperiment} from '../server/model-experiment.mjs';
import {createChampionJobModelState} from '../server/model-state.mjs';

// Fixed isolated service only. Never consume the application's database settings.
const uri='mongodb://127.0.0.1:27029';
for(const group of ['baseline','candidate'])test(`V5.0.11 ${group} v3 Mongo checkpoint survives process exit, key rotation and rejects configuration drift`,{timeout:45000},async t=>{
 const registryRoot=fs.mkdtempSync(path.join(os.tmpdir(),'zh-experiment-restart-approval-'));
 t.after(()=>fs.rmSync(registryRoot,{recursive:true,force:true}));
 const env={...championTestEnv(),MODEL_ROUTING_MODE:'legacy',FEATURE_VISION_ROUTING:'false',LLM_MODEL:'deepseek-flash',LLM_BASE_URL:'https://legacy.invalid',LLM_ROUTER_MODEL:'deepseek-flash',LLM_VISION_MODEL:'deepseek-flash',LLM_VISION_BASE_URL:'https://legacy.invalid',LLM_VISION_API_KEY:'test-key',LLM_PRO_MODEL:'deepseek-flash',LLM_PRO_BASE_URL:'https://pro.invalid'};
 // The real review pipeline requests json_schema; declare that capability explicitly.
 Object.assign(env,{MODEL_ROUTING_MODE:'champion',MODEL_CHAMPION_ENABLED:'true',MODEL_AB_ENABLED:'true',MODEL_CHAMPION_REGISTRY_FILE:path.join(registryRoot,'registry.json')});
 env.LLM_MAIN_CHALLENGER_CAPABILITIES=JSON.stringify({...JSON.parse(env.LLM_MAIN_CHALLENGER_CAPABILITIES),jsonSchema:true});
 const job={id:'resume-process',createdAt:'2026-09-03T00:00:00.000Z',mode:'B'};let selection,policy;
 for(let i=0;i<100;i++){policy=championTestPolicy(env,{id:'restart-'+group+'-'+i});selection=assignModelExperiment(job,policy);if(selection.group===group)break;}
 assert.equal(selection.group,group);
 env.MODEL_CHAMPION_POLICY_VERSION=policy.id;
 fs.writeFileSync(env.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:policy.id,policies:[policy]}));
 const state=createChampionJobModelState(env,selection),database='zhiheng_resume_test_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database});
 const run=(phase,extra={})=>new Promise((resolve,reject)=>{
  // Existing fixture uses only mock provider responses and exits after a durable tool receipt.
  const child=spawn(process.execPath,['tests/fixtures/resume-runtime.mjs'],{env:{...process.env,...env,...extra,MONGODB_URI:uri,MONGODB_DATABASE:database,RESUME_TEST_PHASE:phase},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='';const timer=setTimeout(()=>child.kill(),15000);
  child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
  child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);resolve({code,output});});
 });
 try{
  await storage.saveJob({...job,status:'queued',modelState:state,input:{question:'synthetic fixed champion restart',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
  const first=await run('first');assert.equal(first.code,73,first.output);
  const saved=await storage.getJob(job.id);assert.deepEqual(saved.checkpoint.modelState,state);assert.equal(saved.checkpoint.toolRecords.length,1);
  const caps=JSON.parse(env.LLM_MAIN_CHALLENGER_CAPABILITIES);
  const changed=await run('second',{LLM_MAIN_CHALLENGER_CAPABILITIES:JSON.stringify({...caps,jsonSchema:false})});
  assert.equal(changed.code,1,changed.output);assert.match(changed.output,/model_state_incompatible|model_rollout_closed/);
  const blocked=await storage.getJob(job.id);assert.deepEqual(blocked.checkpoint,saved.checkpoint);assert.deepEqual(blocked.input,saved.input);assert.equal(blocked.retryCount,undefined);
  const second=await run('second',{LLM_MAIN_API_KEY:'rotated-main',LLM_MAIN_CHALLENGER_API_KEY:'rotated-candidate'});assert.equal(second.code,0,second.output);
  const final=await storage.getJob(job.id);assert.equal(final.status,'completed');assert.deepEqual(final.modelState,state);assert.deepEqual(final.marketData,saved.marketData);
  assert.equal(final.events.filter(e=>e.type==='tool'&&e.toolCallId==='saved-call').length,1);
  assert.doesNotMatch(JSON.stringify(await storage.listJobs()),/modelState|configurationHash|policyHash|private-resume-reasoning/);
 }finally{
  await storage.close();const cleanup=new MongoClient(uri,{serverSelectionTimeoutMS:3000});
  try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}
 }
});
