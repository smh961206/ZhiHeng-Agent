import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchDelivery} from '../server/research-delivery.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {publicJob} from '../server/job-stream.mjs';
import {deliveryProgress} from '../shared/research-delivery.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const outcome={status:'completed',result:{report:'# 合成审计后结果',decision:{action:'观察池'}},researchOutcome:{action:'观察池'}};
function setup(){
 const job={id:'00000000-0000-4000-8000-000000000091',status:'running',createdAt:'2026-09-01T00:00:00Z',retryCount:2,input:{question:'合成测试',sources:[]},events:[],draft:'尚未复核的草稿',liveReport:{text:'实时草稿'}};
 const jobs=new Map([[job.id,job]]),controllers=new Map(),mutations=new Set(),stored=new Map(),writes=[],publications=[],waits=[];
 let save=async snapshot=>{stored.set(job.id,structuredClone(snapshot));};
 const streams={publish(id,type,value){publications.push({id,type,value:structuredClone(value)});},finish(job){publications.push({type:'done',value:publicJob(job)});}};
 const delivery=createResearchDelivery({save:async snapshot=>{writes.push(structuredClone(snapshot));return save(snapshot);},loadJob:async id=>structuredClone(stored.get(id)),jobs,controllers,mutations,streams,pause:async ms=>{waits.push(ms);}});
 return {job,jobs,controllers,mutations,stored,writes,publications,waits,delivery,streams,setSave(fn){save=fn;}};
}
test('reviewed content remains private and completion is published only after the durable write acknowledges',async()=>{
 const h=setup(),gate=deferred();h.setSave(async snapshot=>{await gate.promise;h.stored.set(h.job.id,structuredClone(snapshot));});
 const saving=h.delivery.finish(h.job,outcome);
 assert.equal(h.job.status,'running');assert.equal(h.job.result,undefined);assert.equal(h.job.delivery.status,'saving');
 assert.ok(h.publications.every(event=>event.type!=='complete'&&event.value?.result===undefined));
 assert.throws(()=>exportResearchMarkdown({...h.job,result:outcome.result}),/尚未保存/);
 assert.equal(publicJob({...h.job,result:outcome.result,researchOutcome:{action:'不应泄露'}}).result,undefined);
 gate.resolve();await saving;
 assert.equal(h.job.status,'completed');assert.equal(h.job.delivery.status,'saved');assert.deepEqual(h.job.result,outcome.result);
 assert.equal(h.stored.get(h.job.id).events.at(-1).type,'complete');assert.equal(h.publications.at(-1).value.type,'complete');
 assert.equal(h.jobs.size,0);assert.equal(h.job.liveReport,undefined);assert.equal(h.writes.length,1);
});
test('transient storage errors retry the same result within a fixed budget and retain warning history',async()=>{
 const h=setup();let calls=0;h.setSave(async snapshot=>{if(++calls<3)throw new Error('synthetic outage');h.stored.set(h.job.id,structuredClone(snapshot));});
 await h.delivery.finish(h.job,outcome);
 assert.equal(h.writes.length,3);assert.deepEqual(h.waits,[500,1500]);assert.ok(h.writes.every(job=>job.id===h.job.id&&job.retryCount===2&&job.result.report===outcome.result.report));
 assert.equal(h.job.status,'completed');assert.equal(h.job.events.filter(event=>event.type==='warning').length,2);assert.equal(h.job.events.filter(event=>event.type==='complete').length,1);
});
test('a disconnected event subscriber cannot turn an acknowledged database write into a failed delivery',async()=>{
 const h=setup();h.streams.publish=()=>{throw new Error('synthetic disconnected browser');};
 await h.delivery.finish(h.job,outcome);
 assert.equal(h.job.status,'completed');assert.equal(h.writes.length,1);assert.equal(h.stored.get(h.job.id).delivery.status,'saved');
});
test('exhausted writes retain a private result; save retry is locked, versioned and idempotent without restarting research',async()=>{
 const h=setup();h.setSave(async()=>{throw new Error('synthetic outage');});
 await h.delivery.finish(h.job,outcome);
 assert.equal(h.job.status,'failed');assert.equal(h.job.delivery.recoverable,true);assert.equal(h.job.result,undefined);assert.equal(h.writes.length,3);
 assert.equal(deliveryProgress(h.job).label,'待保存');assert.ok(!h.job.events.some(event=>event.type==='complete'));
 await assert.rejects(prepareResearchRetry(h.job,()=>{}),/先重试保存/);
 await assert.rejects(h.delivery.retry(h.job.id,1),error=>error.status===409);
 await assert.rejects(h.delivery.retry(h.job.id,-1),error=>error.status===400);
 const gate=deferred();h.setSave(async snapshot=>{await gate.promise;h.stored.set(snapshot.id,structuredClone(snapshot));});
 const retry=h.delivery.retry(h.job.id,2);
 await assert.rejects(h.delivery.retry(h.job.id,2),error=>error.status===409);
 gate.resolve();await retry;
 assert.equal(h.job.retryCount,2);assert.equal(h.job.createdAt,'2026-09-01T00:00:00Z');assert.equal(h.job.delivery.attempts,4);assert.equal(h.mutations.size,0);
 const priorWrites=h.writes.length;assert.equal((await h.delivery.retry(h.job.id,2)).status,'completed');assert.equal(h.writes.length,priorWrites);
});
test('failed manual save retains the recovery action and preserves original execution failures and cancellations',async()=>{
 for(const status of ['failed','cancelled']){
  const h=setup();h.setSave(async()=>{throw new Error('synthetic outage');});
  await h.delivery.finish(h.job,{status,error:'原执行问题'});
  assert.equal(h.job.delivery.executionError,'原执行问题');
  await assert.rejects(h.delivery.retry(h.job.id,2),error=>error.status===503);assert.equal(h.mutations.size,0);assert.equal(h.job.delivery.recoverable,true);
  h.setSave(async snapshot=>h.stored.set(snapshot.id,structuredClone(snapshot)));
  await h.delivery.retry(h.job.id,2);assert.equal(h.job.status,status);assert.equal(h.job.error,'原执行问题');assert.equal(h.job.result,undefined);assert.equal(deliveryProgress(h.job),null);
 }
});
test('saving cannot revive a forgotten or newer record and never runs while a controller owns the job',async()=>{
 const h=setup();h.setSave(async()=>{throw new Error('synthetic outage');});await h.delivery.finish(h.job,outcome);
 h.controllers.set(h.job.id,{});await assert.rejects(h.delivery.retry(h.job.id,2),error=>error.status===409);h.controllers.clear();
 h.delivery.forget(h.job.id);await assert.rejects(h.delivery.retry(h.job.id,2),error=>error.status===409);
 h.jobs.delete(h.job.id);await assert.rejects(h.delivery.retry(h.job.id,2),error=>error.status===404);
});
