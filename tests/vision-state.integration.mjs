import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {createJobModelState} from '../server/model-state.mjs';
import {visionSimulationEnv} from '../scripts/vision-benchmark.mjs';
import {visionApprovalFixture} from './fixtures/vision-approval.mjs';
test('candidate Vision pin survives a real Mongo/process restart; rollback pauses without replacing evidence', {timeout:30000},async()=>{
 const uri=process.env.MONGODB_URI;assert.match(uri??'',/^mongodb:\/\/127\.0\.0\.1:27029/);
 const directory=fs.mkdtempSync(join(tmpdir(),'vision-restart-')),file=join(directory,'acceptance.json');
 const env={...visionSimulationEnv,FEATURE_VISION_ROUTING:'true',VISION_ACCEPTANCE_FILE:file};
 fs.writeFileSync(file,JSON.stringify(visionApprovalFixture(env)));
 const database='zhiheng_resume_test_'+randomUUID().replaceAll('-',''),storage=await createStorage({uri,database});
 const run=(phase,extra={})=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tests/fixtures/resume-runtime.mjs'],{env:{...process.env,...env,MONGODB_URI:uri,MONGODB_DATABASE:database,RESUME_TEST_PHASE:phase,...extra},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('exit',code=>resolve({code,output}));
 });
 try{
  const state=createJobModelState(env);assert.equal(state.profiles.find(p=>p.purposes.includes('vision')).id,'vision-challenger');
  await storage.saveJob({id:'resume-process',createdAt:new Date().toISOString(),status:'queued',mode:'B',modelState:state,input:{question:'synthetic Vision pinned restart',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
  const first=await run('first');assert.equal(first.code,73,first.output);
  const saved=await storage.getJob('resume-process');assert.deepEqual(saved.checkpoint.modelState,state);
  const rollback=await run('second',{FEATURE_VISION_ROUTING:'false'});assert.equal(rollback.code,1);assert.match(rollback.output,/model_state_incompatible/);
  const blocked=await storage.getJob('resume-process');assert.deepEqual(blocked.checkpoint,saved.checkpoint);assert.deepEqual(blocked.input,saved.input);
  const second=await run('second',{LLM_VISION_CHALLENGER_API_KEY:'rotated-synthetic'});assert.equal(second.code,0,second.output);
  const final=await storage.getJob('resume-process');assert.equal(final.status,'completed');assert.deepEqual(final.modelState,state);assert.deepEqual(final.marketData,saved.marketData);
  assert.equal(final.events.filter(e=>e.type==='tool'&&e.toolCallId==='saved-call').length,1);
  assert.doesNotMatch(JSON.stringify(await storage.listJobs()),/modelState|connectionIdentity|private-resume-reasoning/);
 }finally{
  await storage.close();const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}
  fs.rmSync(directory,{recursive:true,force:true});
 }
});
