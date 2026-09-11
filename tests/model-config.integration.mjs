import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as pause} from 'node:timers/promises';
import {createServer} from 'node:net';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {createJobModelState,createPolicyJobModelState} from '../server/model-state.mjs';
import {previewModelConfig} from '../scripts/model-config.mjs';

for(const [label,createState] of [['legacy',createJobModelState],['policy',createPolicyJobModelState]])test(`${label} original pin resumes through file configuration across real process restart`,{timeout:30000},async()=>{
 const uri=process.env.MODEL_CONFIG_TEST_MONGODB_URI;
 assert.match(uri??'',/^mongodb:\/\/127\.0\.0\.1:\d+$/,'requires explicit isolated test URI');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'model-config-resume-'));
 const env={...process.env};for(const key of Object.keys(env))if(/^(LLM_|MODEL_|FEATURE_VISION_|VISION_ACCEPTANCE)/.test(key))delete env[key];
 Object.assign(env,{LLM_MODEL:'deepseek-flash',LLM_API_KEY:'synthetic-base',LLM_MAIN_API_KEY:'synthetic-main',LLM_VISION_INPUT:'off',MODEL_ROUTING_MODE:'legacy',FEATURE_VISION_ROUTING:'false',MODEL_TELEMETRY_ENABLED:'false'});
 const file=path.join(directory,'models.json');fs.writeFileSync(file,JSON.stringify(previewModelConfig(env)));
 const database='zhiheng_resume_test_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database});
 const run=(phase,extra={})=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tests/fixtures/resume-runtime.mjs'],{env:{...env,MODEL_CONFIG_FILE:file,MONGODB_URI:uri,MONGODB_DATABASE:database,RESUME_TEST_PHASE:phase,...extra},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('exit',code=>resolve({code,output}));
 });
 try{
  const state=createState(env);
  await storage.saveJob({id:'resume-process',createdAt:new Date().toISOString(),status:'queued',mode:'B',modelState:state,input:{question:'synthetic configuration migration',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
  const first=await run('first');assert.equal(first.code,73,first.output);
  const saved=await storage.getJob('resume-process');assert.deepEqual(saved.checkpoint.modelState,state);assert.equal(saved.checkpoint.toolRecords.length,1);
  const changed=await run('second',{LLM_MODEL:'different-model'});assert.equal(changed.code,1);assert.match(changed.output,/model_state_incompatible/);
  assert.deepEqual((await storage.getJob('resume-process')).checkpoint,saved.checkpoint);
  const second=await run('second',{LLM_API_KEY:'rotated-synthetic-key'});assert.equal(second.code,0,second.output);
  const final=await storage.getJob('resume-process');assert.equal(final.status,'completed');assert.deepEqual(final.modelState,state);
  assert.equal(final.events.filter(e=>e.type==='tool'&&e.toolCallId==='saved-call').length,1);assert.deepEqual(final.marketData,saved.marketData);
 }finally{
  await storage.close();const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();fs.rmSync(directory,{recursive:true,force:true});}
 }
});

test('File-only API readiness and invalid-file closure keep health and history available',{timeout:20000},async()=>{
 const uri=process.env.MODEL_CONFIG_TEST_MONGODB_URI;assert.match(uri??'',/^mongodb:\/\/127\.0\.0\.1:\d+$/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'model-config-api-'));
 const source={LLM_MODEL:'fixture-only',LLM_API_KEY:'fixture-only',LLM_VISION_INPUT:'off'};
 const file=path.join(dir,'models.json');fs.writeFileSync(file,JSON.stringify(previewModelConfig(source)));
 for(const valid of [true,false]){
  const database='zhiheng_model_config_api_'+randomUUID().replaceAll('-',''),reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const env={...process.env};for(const key of Object.keys(env))if(/^(LLM_|MODEL_|FEATURE_VISION_|VISION_ACCEPTANCE)/.test(key))delete env[key];
  Object.assign(env,{HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database,LLM_API_KEY:'fixture-only',MODEL_CONFIG_FILE:valid?file:path.join(dir,'missing.json')});
  const child=spawn(process.execPath,['--import','./tests/fixtures/retry-api-runtime.mjs','server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  try{
   const base='http://127.0.0.1:'+port;let ready=false;
   for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await pause(40);}assert.ok(ready,output);
   const config=await (await fetch(base+'/api/config')).json();assert.equal(config.configured,valid);assert.equal(config.configurationError,!valid);
   if(valid)assert.equal(config.model,'fixture-only');else assert.equal(config.model,null);
   assert.doesNotMatch(JSON.stringify(config),/missing\.json|models\.json|apiKeyEnv/);
   assert.equal((await fetch(base+'/api/jobs')).status,200);
   const response=await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'B',question:'synthetic configuration API',securities:[{market:'CN',symbol:'600519'}]})});
   assert.equal(response.status,valid?201:400);if(valid){const job=await response.json();await fetch(base+'/api/jobs/'+job.id+'/cancel',{method:'POST'});}
  }finally{
   const ended=once(child,'exit');child.kill();await ended;
   const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}
  }
 }
 fs.rmSync(dir,{recursive:true,force:true});
});
