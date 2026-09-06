import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {createStorage} from '../server/storage.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';

test('MongoDB retry replaces one existing record atomically and cannot restore a deleted job',async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_retry_test_'+randomUUID().replaceAll('-','');
 let storage=await createStorage({uri,database});
 const inspector=new MongoClient(uri);await inspector.connect();
 try{
  const old={id:randomUUID(),createdAt:'2026-09-01T00:00:00Z',status:'failed',input:{question:'同一条记录重试',sources:[]},events:[],error:'旧错误'};
  await storage.saveJob(old);
  const next={id:old.id,createdAt:old.createdAt,status:'queued',input:old.input,events:[],retryCount:1,lastRetriedAt:new Date().toISOString()};
  const results=await Promise.allSettled([storage.restartJob(next,0),storage.restartJob(next,0)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
  assert.equal((await storage.listJobs()).length,1);assert.deepEqual(await storage.getJob(old.id),next);
  const files=inspector.db(database).collection('job_payloads.files');
  assert.equal(await files.countDocuments({filename:old.id+'.json'}),2,'The rejected upload must be cleaned up');
  await storage.close();storage=await createStorage({uri,database});
  assert.deepEqual(await storage.getJob(old.id),next,'The retry must survive reconnects');
  await storage.recoverInterrupted();const recovered=await storage.getJob(old.id);
  assert.equal(recovered.status,'failed');assert.equal(recovered.retryCount,1);assert.equal(recovered.createdAt,old.createdAt);
  await storage.deleteJob(old.id);
  await assert.rejects(storage.restartJob({...next,retryCount:2},1),error=>error.status===409);
  assert.equal(await storage.getJob(old.id),null);assert.equal(await files.countDocuments({filename:old.id+'.json'}),0);
  assert.equal((await storage.listJobs()).length,0);assert.ok(await storage.isJobDeleted(old.id));
 }finally{await storage.close();await inspector.db(database).dropDatabase();await inspector.close();}
});

test('retry API keeps ID and count, rejects duplicate requests, streams and persists the same record',{timeout:30000},async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_retry_api_test_'+randomUUID().replaceAll('-','');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const storage=await createStorage({uri,database});
 const child=spawn(process.execPath,['--import','./tests/fixtures/retry-api-runtime.mjs','server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database,LLM_API_KEY:'fixture-only',LLM_MODEL:'fixture-only'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',buffer=>{output+=buffer;});child.stderr.on('data',buffer=>{output+=buffer;});
 const base='http://127.0.0.1:'+port;
 const post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  let ready=false;for(let attempt=0;attempt<100;attempt++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await pause(100);}
  assert.ok(ready,output);
  const old={id:randomUUID(),status:'failed',createdAt:'2026-09-01T00:00:00Z',mode:'B',input:{question:'合成原记录重试',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[{id:'S1',title:'旧来源',text:'旧资料'}]},events:[{message:'旧执行'}],error:'旧错误',draft:'旧草稿',result:{report:'旧结果'}};
  await storage.saveJob(old);
  const count=(await storage.listJobs()).length,path='/api/jobs/'+old.id,retryPath=path+'/retry';
  const forbidden=await fetch(base+retryPath,{...post({expectedRetryCount:0}),headers:{'Content-Type':'application/json',Origin:'https://evil.example'}});
  assert.equal(forbidden.status,403);
  const attempts=await Promise.all([fetch(base+retryPath,post({expectedRetryCount:0})),fetch(base+retryPath,post({expectedRetryCount:0}))]);
  assert.deepEqual(attempts.map(response=>response.status).sort(),[200,409]);
  const started=await attempts.find(response=>response.status===200).json();
  assert.equal(started.id,old.id);assert.equal(started.createdAt,old.createdAt);assert.equal(started.retryCount,1);
  assert.ok(['queued','running'].includes(started.status));assert.equal(started.error,undefined);assert.equal(started.result,undefined);assert.deepEqual(started.input.sources,[]);
  assert.equal((await (await fetch(base+'/api/jobs')).json()).length,count);
  assert.equal((await fetch(base+path,{method:'DELETE'})).status,409);
  const live=await fetch(base+path+'/stream'),reader=live.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value),/event: snapshot/);await reader.cancel();
  assert.equal((await fetch(base+path+'/cancel',post({}))).status,200);
  let finished;for(let attempt=0;attempt<100;attempt++){finished=await storage.getJob(old.id);if(finished.status==='cancelled')break;await pause(20);}
  assert.equal(finished.status,'cancelled');assert.equal(finished.retryCount,1);assert.equal(finished.createdAt,old.createdAt);
  assert.equal((await fetch(base+retryPath,post({expectedRetryCount:0}))).status,409,'Stale requests must not restart a newer cancelled run');
  const second=await fetch(base+retryPath,post({expectedRetryCount:1}));assert.equal(second.status,200);assert.equal((await second.json()).id,old.id);
  assert.equal((await storage.listJobs()).length,count);
 }finally{
  if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  await storage.close();const inspector=new MongoClient(uri);try{await inspector.connect();await inspector.db(database).dropDatabase();}finally{await inspector.close();}
 }
});
