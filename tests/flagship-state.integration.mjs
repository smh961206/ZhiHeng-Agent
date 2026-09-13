import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {executeFlagshipSession} from '../server/model-flagship.mjs';
import {createFlagshipModelCatalog} from '../server/model-catalog.mjs';
import {testFlagshipEnv} from './fixtures/flagship-acceptance.mjs';
test('V5.2 private receipt survives real process exit, reuses completed work and refuses uncertainty',async()=>{
 const uri=process.env.MONGODB_URI,database='zhiheng_flagship_'+randomUUID().replaceAll('-',''),id=randomUUID();assert.match(uri??'',/^mongodb:\/\/127\.0\.0\.1:/);
 const storage=await createStorage({uri,database}),profile=createFlagshipModelCatalog(testFlagshipEnv()).profiles[0];
 const input={cutoff:'2026-09-02T00:00:00Z',evidence:[{id:'S1',blockId:'b1'}],tools:[]};
 const job={id,status:'failed',createdAt:input.cutoff,input:{sources:[]},events:[]};
 try{
  await executeFlagshipSession({job,purpose:'critical-review',input,profile,connectionIdentity:'a'.repeat(64),reason:'repeated_review_failure',complete:async()=>({result:'completed'}),validate:v=>v,persist:()=>storage.saveJob(job)});
  assert.equal((await storage.getJob(id)).flagshipState.sessions.review.status,'completed');
  assert.ok((await storage.listJobs()).every(j=>!Object.hasOwn(j,'flagshipState')));await storage.close();
  const code=`import assert from 'node:assert/strict';import {createStorage} from './server/storage.mjs';import {executeFlagshipSession,assertFlagshipRecovery} from './server/model-flagship.mjs';const s=await createStorage({uri:process.env.MONGODB_URI,database:process.env.TEST_DB});try{const job=await s.getJob(process.env.TEST_ID);const v=await executeFlagshipSession({job,purpose:'critical-review',input:JSON.parse(process.env.TEST_INPUT),profile:JSON.parse(process.env.TEST_PROFILE),connectionIdentity:'a'.repeat(64),reason:'repeated_review_failure',complete:async()=>{throw Error('MUST NOT REPLAY');},validate:v=>v,persist:()=>s.saveJob(job)});assert.equal(v.result,'completed');job.flagshipState.sessions.review.status='reserved';await s.saveJob(job);assert.throws(()=>assertFlagshipRecovery(job));}finally{await s.close();}`;
  const child=spawn(process.execPath,['--input-type=module','-e',code],{windowsHide:true,env:{...process.env,MONGODB_URI:uri,TEST_DB:database,TEST_ID:id,TEST_INPUT:JSON.stringify(input),TEST_PROFILE:JSON.stringify(profile)},stdio:['ignore','pipe','pipe']});let output='';child.stderr.on('data',c=>output+=c);const codeValue=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});assert.equal(codeValue,0,output);
 }finally{await storage.close();const client=new MongoClient(uri);try{await client.connect();await client.db(database).dropDatabase();}finally{await client.close();}}
});
