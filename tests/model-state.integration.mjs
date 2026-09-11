import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {createJobModelState,createPolicyJobModelState} from '../server/model-state.mjs';

for(const [label,createState] of [['legacy',createJobModelState],['policy',createPolicyJobModelState]])test(`${label} pinned Mongo checkpoint survives process restart/key rotation; changed model blocks before pending work`,{timeout:30000},async()=>{
 const uri=process.env.MONGODB_URI;assert.match(uri??'',/^mongodb:\/\/127\.0\.0\.1:27029/,'requires isolated test service');
 const database='zhiheng_resume_test_'+randomUUID().replaceAll('-',''),storage=await createStorage({uri,database});
 const run=(phase,extra={})=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tests/fixtures/resume-runtime.mjs'],{env:{...process.env,LLM_MAIN_API_KEY:'synthetic-main',MONGODB_URI:uri,MONGODB_DATABASE:database,RESUME_TEST_PHASE:phase,...extra},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('exit',code=>resolve({code,output}));
 });
 try{
  const state=createState();
  await storage.saveJob({id:'resume-process',createdAt:new Date().toISOString(),status:'queued',mode:'B',modelState:state,input:{question:'synthetic pinned restart',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
  const first=await run('first');assert.equal(first.code,73,first.output);
  const saved=await storage.getJob('resume-process');assert.deepEqual(saved.checkpoint.modelState,state);assert.equal(saved.checkpoint.toolRecords.length,1);
  assert.doesNotMatch(JSON.stringify(await storage.listJobs()),/modelState|connectionIdentity|private-resume-reasoning/);
  const changed=await run('second',{LLM_MODEL:'different-model'});assert.equal(changed.code,1);assert.match(changed.output,/model_state_incompatible/);
  const blocked=await storage.getJob('resume-process');assert.deepEqual(blocked.checkpoint,saved.checkpoint);assert.deepEqual(blocked.input,saved.input);assert.equal(blocked.retryCount,undefined);
  const second=await run('second',{LLM_API_KEY:'rotated-synthetic-key'});assert.equal(second.code,0,second.output);
  const final=await storage.getJob('resume-process');assert.equal(final.status,'completed');assert.deepEqual(final.modelState,state);assert.equal(final.events.filter(e=>e.type==='tool'&&e.toolCallId==='saved-call').length,1);assert.deepEqual(final.marketData,saved.marketData);
 }finally{await storage.close();const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}}
});
