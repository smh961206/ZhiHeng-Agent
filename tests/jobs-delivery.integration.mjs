import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import {createStorage} from '../server/storage.mjs';

test('delivery API with real storage withholds unsaved results and recovers them without rerunning the model',{timeout:20000},async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_delivery_test_'+randomUUID().replaceAll('-','');
 const reserve=createServer();reserve.listen(0,'127.0.0.1');await once(reserve,'listening');const port=reserve.address().port;await new Promise(resolve=>reserve.close(resolve));
 const storage=await createStorage({uri,database});
 const child=spawn(process.execPath,['--import','./tests/fixtures/delivery-api-runtime.mjs','server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database,LLM_API_KEY:'fixture-only',LLM_MODEL:'fixture-only'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',value=>{output+=value;});child.stderr.on('data',value=>{output+=value;});
 const base='http://127.0.0.1:'+port,post=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 async function poll(path,condition){for(let i=0;i<120;i++){try{const value=await (await fetch(base+path)).json();if(condition(value))return value;}catch{}await pause(30);}throw new Error('Expected state was not reached: '+output);}
 try{
  await poll('/api/health',value=>value.ok);
  const response=await fetch(base+'/api/jobs',post({mode:'B',question:'合成交付测试',securities:[{market:'CN',symbol:'600519'}]}));assert.equal(response.status,201);
  const initial=await response.json(),path='/api/jobs/'+initial.id;
  const saving=await poll(path,value=>value.delivery?.status==='saving');assert.equal(saving.status,'running');assert.equal(saving.result,undefined);
  assert.equal((await fetch(base+path+'/cancel',post({}))).status,409);
  const failed=await poll(path,value=>value.delivery?.status==='failed');assert.equal(failed.result,undefined);assert.equal(failed.delivery.recoverable,true);
  assert.ok(!failed.events.some(event=>event.type==='complete'));assert.equal((await storage.getJob(initial.id)).result,undefined);
  assert.equal((await fetch(base+path+'/retry',post({expectedRetryCount:0}))).status,409);
  const denied=await fetch(base+path+'/save',{...post({expectedRetryCount:0}),headers:{'Content-Type':'application/json',Origin:'https://evil.example'}});assert.equal(denied.status,403);
  const savedResponse=await fetch(base+path+'/save',post({expectedRetryCount:0}));assert.equal(savedResponse.status,200);
  const saved=await savedResponse.json();assert.equal(saved.status,'completed');assert.match(saved.result.report,/合成已复核报告/);assert.equal(saved.retryCount??0,0);assert.equal(saved.createdAt,initial.createdAt);
  assert.equal(saved.events.filter(event=>event.message==='合成研究执行一次').length,1);assert.equal(saved.events.filter(event=>event.type==='complete').length,1);
  const again=await fetch(base+path+'/save',post({expectedRetryCount:0}));assert.equal(again.status,200);assert.deepEqual((await again.json()).delivery,saved.delivery);
  assert.equal((await storage.listJobs()).length,1);assert.equal((await storage.getJob(initial.id)).result.report,saved.result.report);
 }finally{
  if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  await storage.close();const inspector=new MongoClient(uri);try{await inspector.connect();await inspector.db(database).dropDatabase();}finally{await inspector.close();}
 }
});
