import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';

test('DELETE API: removes completed jobs, rejects running and cross-origin deletion', {timeout:30000},async()=>{
 const database='zhiheng_delete_test_'+randomUUID().replaceAll('-','');
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const storage=await createStorage({uri,database});
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONGODB_URI:uri,MONGODB_DATABASE:database},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
 const base='http://127.0.0.1:'+port;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await pause(100);}
  assert.ok(ready,output);
  const job={id:randomUUID(),status:'completed',createdAt:new Date().toISOString(),input:{question:'Delete API test',sources:[]},events:[]};
  await storage.saveJob(job);
  const completedStream=await fetch(base+'/api/jobs/'+job.id+'/stream');
  assert.ok(completedStream.headers.get('content-type').includes('text/event-stream'));
  assert.match(await completedStream.text(),/event: done/);
  let response=await fetch(base+'/api/jobs/'+job.id,{method:'DELETE',headers:{Origin:'https://evil.example'}});
  assert.equal(response.status,403);assert.ok(await storage.getJob(job.id));
  response=await fetch(base+'/api/jobs/'+job.id,{method:'DELETE'});assert.equal(response.status,200);
  assert.equal((await fetch(base+'/api/jobs/'+job.id)).status,404);
  assert.equal((await (await fetch(base+'/api/jobs')).json()).some(j=>j.id===job.id),false);
  assert.equal((await fetch(base+'/api/jobs/'+job.id,{method:'DELETE'})).status,200);
  for(const status of ['queued','running']){
   const active={...job,id:randomUUID(),status};await storage.saveJob(active);
   const live=await fetch(base+'/api/jobs/'+active.id+'/stream');const reader=live.body.getReader();
   const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/event: snapshot/);await reader.cancel();
   assert.equal((await fetch(base+'/api/jobs/'+active.id,{method:'DELETE'})).status,409);
   assert.equal((await storage.getJob(active.id)).status,status);
  }
 }finally{
  const stopped=once(child,'exit');child.kill();await stopped;
  await storage.close();const client=new MongoClient(uri);try{await client.connect();await client.db(database).dropDatabase();}finally{await client.close();}
 }
});
