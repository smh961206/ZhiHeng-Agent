import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
test('Mongo ModelCall persistence is idempotent, ordered, aggregated and erased with its job',async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_telemetry_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database}),client=new MongoClient(uri);await client.connect();
 try{
  const record={id:'call',jobId:'job',purpose:'research',profile:'legacy-analysis',startedAt:new Date().toISOString(),errorCategory:null};
  await storage.saveModelCall({...record,status:'started',prompt:'secret'});
  await storage.saveModelCall({...record,status:'succeeded',usage:{inputTokens:10},reasoning_content:'secret'});
  await storage.saveModelCall({...record,status:'started'});
  assert.equal((await storage.modelUsageSummary('job')).byStatus.succeeded,1);assert.equal((await storage.modelUsageSummary('job')).calls,1);
  const saved=await client.db(database).collection('model_calls').findOne({_id:'call'});assert.doesNotMatch(JSON.stringify(saved),/secret|prompt|reasoning_content/);
  assert.equal((await storage.modelUsageSummary('job')).usage.inputTokens.knownTotal,10);
  assert.equal((await storage.modelUsageSummary('old-job')).calls,0);assert.equal((await storage.modelUsageSummary('old-job')).usage.inputTokens.knownTotal,null);
  await storage.deleteJob('job');await storage.saveModelCall({...record,status:'succeeded'});assert.equal((await storage.modelUsageSummary('job')).calls,0);
 }finally{await storage.close();await client.db(database).dropDatabase();await client.close();}
});
test('concurrent terminal replays count each call once and keep job summaries separate',async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_telemetry_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database}),client=new MongoClient(uri);await client.connect();
 try{
  const calls=Array.from({length:16},(_,i)=>({id:'call-'+i,jobId:i<8?'job-a':'job-b',purpose:'research',profile:'legacy-analysis',errorCategory:null,startedAt:new Date().toISOString()}));
  await Promise.all(calls.map(record=>storage.saveModelCall({...record,status:'started'})));
  await Promise.all(calls.flatMap(record=>{
   const terminal={...record,status:'succeeded',usage:{inputTokens:10,outputTokens:4,totalTokens:14}};
   return [storage.saveModelCall(terminal),storage.saveModelCall(terminal),storage.saveModelCall({...record,status:'started'})];
  }));
  assert.equal(await client.db(database).collection('model_calls').countDocuments(),16);
  for(const jobId of ['job-a','job-b']){
   const summary=await storage.modelUsageSummary(jobId);
   assert.equal(summary.calls,8);assert.deepEqual(summary.byStatus,{started:0,succeeded:8,failed:0,cancelled:0});
   assert.deepEqual(summary.usage.totalTokens,{knownTotal:112,unknownCalls:0});
   assert.deepEqual(summary.usage.cachedInputTokens,{knownTotal:null,unknownCalls:8});
  }
 }finally{await storage.close();await client.db(database).dropDatabase();await client.close();}
});
test('deletion interleaved with concurrent telemetry writes leaves no owned records or late resurrection',async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_telemetry_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database}),client=new MongoClient(uri);await client.connect();
 try{
  const record={purpose:'research',profile:'legacy-analysis',errorCategory:null,status:'succeeded',usage:{totalTokens:7}};
  await storage.saveModelCall({...record,id:'retained',jobId:'other-job'});
  await storage.saveModelCall({...record,id:'existing',jobId:'deleted-job'});
  await Promise.all([
   ...Array.from({length:16},(_,i)=>storage.saveModelCall({...record,id:'racing-'+i,jobId:'deleted-job'})),
   storage.deleteJob('deleted-job'),
  ]);
  await storage.saveModelCall({...record,id:'late-terminal',jobId:'deleted-job'});
  await storage.saveModelCall({...record,id:'late-start',jobId:'deleted-job',status:'started'});
  assert.equal(await storage.isJobDeleted('deleted-job'),true);
  assert.equal(await client.db(database).collection('model_calls').countDocuments({jobId:'deleted-job'}),0);
  assert.equal((await storage.modelUsageSummary('deleted-job')).calls,0);
  assert.equal((await storage.modelUsageSummary('deleted-job')).usage.totalTokens.knownTotal,null);
  assert.equal((await storage.modelUsageSummary('other-job')).calls,1);
  assert.equal((await storage.modelUsageSummary('other-job')).usage.totalTokens.knownTotal,7);
 }finally{await storage.close();await client.db(database).dropDatabase();await client.close();}
});
