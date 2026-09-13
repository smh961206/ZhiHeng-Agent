import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
import {createResearchBudgetState} from '../server/research-budget.mjs';
test('cost API reads durable private telemetry, isolates jobs, and exposes only safe summaries',async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_cost_'+randomUUID().replaceAll('-',''),id=randomUUID();
 const storage=await createStorage({uri,database}),reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const createdAt=new Date().toISOString(),budgetState=createResearchBudgetState({version:1,maxModelCost:null,maxToolRounds:4,maxWebRequests:2,maxVisionPages:2,maxDurationMs:null},{startedAt:createdAt});
 await storage.saveJob({id,createdAt,status:'completed',input:{question:'test',sources:[]},events:[],budgetState});
 const record={id:'call',jobId:id,status:'succeeded',errorCategory:null,purpose:'review',profile:'legacy-analysis',transportAttempts:1,billing:{currency:'USD',estimatedCost:0},usage:{inputTokens:0,outputTokens:0,cachedInputTokens:0},cache:{schemaVersion:1,prefixFingerprint:'a'.repeat(64),textOnly:true},prompt:'private-prompt',reasoning_content:'private-reasoning',apiKey:'private-key'};
 await storage.saveModelCall(record);await storage.saveModelCall(record);await storage.saveModelCall({...record,id:'other',jobId:'other-job',billing:{currency:'CNY',estimatedCost:999}});
 const child=spawn(process.execPath,['server/index.mjs'],{windowsHide:true,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;
 try{
  let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(base+'/api/health')).ok;}catch{}if(ready)break;await pause(30);}assert.ok(ready);
  const response=await fetch(base+'/api/jobs/'+id+'/cost');assert.equal(response.status,200);const cost=await response.json();assert.equal(cost.calls,1);assert.equal(cost.billing[0].knownEstimatedCost,0);assert.equal(cost.billing.length,1);assert.equal(Object.hasOwn(cost,'budget'),false);
  assert.deepEqual(cost.usage.inputTokens,{knownTotal:0,unknownCalls:0});assert.deepEqual(cost.usage.outputTokens,{knownTotal:0,unknownCalls:0});assert.deepEqual(cost.byPurpose[0].usage.cachedInputTokens,{knownTotal:0,unknownCalls:0});
  assert.doesNotMatch(JSON.stringify(cost),/private-|prefixFingerprint|receipts|entryHash/);
  for(const path of ['/api/jobs','/api/jobs/'+id])assert.doesNotMatch(await (await fetch(base+path)).text(),/budgetState|receipts|private-/);
  assert.equal((await fetch(base+'/api/jobs/'+randomUUID()+'/cost')).status,404);
  await storage.deleteJob(id);assert.equal((await fetch(base+'/api/jobs/'+id+'/cost')).status,404);
 }finally{if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}await storage.close();const client=new MongoClient(uri);try{await client.connect();await client.db(database).dropDatabase();}finally{await client.close();}}
});
