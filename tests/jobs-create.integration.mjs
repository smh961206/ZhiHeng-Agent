import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import http from 'node:http';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import {createStorage} from '../server/storage.mjs';
test('creation API deduplicates requests, preserves UTF-8 chunks, and never restores deleted submissions',{timeout:20000},async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_create_test_'+randomUUID().replaceAll('-','');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const storage=await createStorage({uri,database});
 const child=spawn(process.execPath,['--import','./tests/fixtures/retry-api-runtime.mjs','server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database,LLM_API_KEY:'fixture-only',LLM_MODEL:'fixture-only'},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',value=>{output+=value;});child.stderr.on('data',value=>{output+=value;});
 const base='http://127.0.0.1:'+port,key=randomUUID(),input={mode:'B',question:'中文分块传输，保留补充资料',securities:[{market:'CN',symbol:'600519'}]},post=body=>({method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
 try{
  let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await pause(30);}assert.ok(ready,output);
  const bytes=Buffer.from(JSON.stringify(input)),cut=bytes.indexOf(Buffer.from('中文'))+1;
  const first=await new Promise((resolve,reject)=>{
   const request=http.request(base+'/api/jobs',{method:'POST',headers:post(input).headers},response=>{let text='';response.on('data',chunk=>{text+=chunk;});response.on('end',()=>resolve({status:response.statusCode,job:JSON.parse(text)}));});
   request.on('error',reject);request.write(bytes.subarray(0,cut));setTimeout(()=>request.end(bytes.subarray(cut)),20);
  });assert.equal(first.status,201);assert.equal(first.job.input.question,input.question);assert.equal(first.job.submission,undefined);
  const repeated=await Promise.all([fetch(base+'/api/jobs',post(input)),fetch(base+'/api/jobs',post(input))]);
  for(const response of repeated){assert.equal(response.status,200);assert.equal((await response.json()).id,first.job.id);}
  assert.equal((await storage.listJobs()).length,1);assert.equal((await storage.listJobs())[0].submission,undefined);
  assert.equal((await fetch(base+'/api/jobs',post({...input,question:'改变输入'}))).status,409);
  const path='/api/jobs/'+first.job.id;await fetch(base+path+'/cancel',{method:'POST'});
  for(let n=0;n<100;n++){if((await storage.getJob(first.job.id)).status==='cancelled')break;await pause(20);}
  const prior=await storage.getJob(first.job.id);assert.equal(prior.status,'cancelled');
  await assert.rejects(storage.createJob({...prior,status:'queued'}),error=>error.code===11000);assert.deepEqual(await storage.getJob(first.job.id),prior);
  const replay=await fetch(base+'/api/jobs',post(input));assert.equal((await replay.json()).status,'cancelled');
  assert.equal((await fetch(base+path,{method:'DELETE'})).status,200);
  assert.equal((await fetch(base+'/api/jobs',post(input))).status,409);assert.equal((await storage.listJobs()).length,0);
 }finally{
  if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  await storage.close();const inspector=new MongoClient(uri);try{await inspector.connect();await inspector.db(database).dropDatabase();}finally{await inspector.close();}
 }
});
