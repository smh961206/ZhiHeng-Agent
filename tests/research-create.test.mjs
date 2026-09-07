import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createResearchCreator,submissionIdentity} from '../server/research-create.mjs';
import {createSubmissionTracker} from '../src/lib/research-submission.mjs';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const payload={question:'合成研究',securities:[{market:'CN',symbol:'600519'}]};
function setup(){
 const db=new Map(),deleted=new Set(),jobs=new Map(),controllers=new Map(),pendingStarts=new Set(),mutations=new Set(),runs=[];let preparations=0;
 const storage={async getJob(id){return structuredClone(db.get(id));},async isJobDeleted(id){return deleted.has(id);},async createJob(job){if(db.has(job.id))throw new Error('duplicate');db.set(job.id,structuredClone(job));}};
 const options={storage,jobs,controllers,pendingStarts,mutations,prepare:async(input,id)=>{preparations++;return {id,status:'queued',input:{...input,sources:[]},events:[]};},execute(job){runs.push(job.id);controllers.set(job.id,{});job.status='running';}};
 return {db,deleted,jobs,controllers,pendingStarts,mutations,runs,storage,options,create:createResearchCreator(options),preparations:()=>preparations};
}
test('same submission coalesces concurrent requests, accepts object key reordering and replays while capacity is full',async()=>{
 const h=setup(),key=randomUUID(),gate=deferred(),insert=h.storage.createJob;h.storage.createJob=async job=>{await gate.promise;return insert(job);};
 const first=h.create(payload,key),second=h.create({securities:payload.securities,question:payload.question},key);gate.resolve();
 const [a,b]=await Promise.all([first,second]);assert.equal(a.job.id,b.job.id);assert.equal(h.runs.length,1);assert.equal(h.preparations(),1);
 h.controllers.set('two',{});h.controllers.set('three',{});
 assert.equal((await h.create(payload,key)).job.id,a.job.id);assert.equal(h.runs.length,1);
 await assert.rejects(h.create(payload,randomUUID()),error=>error.status===429);
 assert.equal(h.pendingStarts.size,0);assert.equal(h.mutations.size,0);
});
test('keys are bound to exact inputs; deleted jobs and changed payloads cannot be recreated',async()=>{
 const h=setup(),key=randomUUID(),{job}=await h.create(payload,key);
 await assert.rejects(h.create({...payload,question:'另一个问题'},key),error=>error.status===409);
 h.deleted.add(job.id);h.jobs.clear();h.db.clear();h.controllers.clear();
 await assert.rejects(h.create(payload,key),error=>error.status===409);assert.equal(h.runs.length,1);
 assert.throws(()=>h.create(payload,'not-a-uuid'),error=>error.status===400);
 assert.throws(()=>h.create([],key),error=>error.status===400);
 assert.notEqual(submissionIdentity(payload).id,submissionIdentity(payload).id);
});
test('a recreated server returns the stored job and a competing writer never launches another creator\'s job',async()=>{
 const h=setup(),key=randomUUID(),{job}=await h.create(payload,key);h.jobs.clear();h.controllers.clear();
 const fresh=createResearchCreator(h.options);assert.equal((await fresh(payload,key)).job.id,job.id);assert.equal(h.runs.length,1);
 const other=setup();other.storage.createJob=async job=>{other.db.set(job.id,{...structuredClone(job),submission:{...job.submission,attemptId:'another-creator'}});throw new Error('duplicate');};
 assert.ok((await other.create(payload,randomUUID())).replayed);assert.equal(other.runs.length,0);
});
test('lost insert acknowledgements are resolved without extra preparation or execution, even if the confirmation read first fails',async()=>{
 for(const readFails of [false,true]){
  const h=setup(),key=randomUUID(),read=h.storage.getJob;let inserted=false,failRead=readFails;
  h.storage.createJob=async job=>{h.db.set(job.id,structuredClone(job));inserted=true;throw new Error('ack lost');};
  h.storage.getJob=async id=>{if(inserted&&failRead){failRead=false;throw new Error('read outage');}return read(id);};
  if(readFails)await assert.rejects(h.create(payload,key),error=>error.status===503);
  const {job}=await h.create(payload,key);assert.equal(job.status,'running');assert.equal(h.runs.length,1);assert.equal(h.preparations(),1);assert.equal(h.db.size,1);
 }
});
test('client retries and refresh retain the same key, while changed input and explicit clearing create a new intent',()=>{
 const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
 const first=createSubmissionTracker({storage}),key=first.keyFor(payload);
 assert.equal(first.keyFor({securities:payload.securities,question:payload.question}),key);
 const restored=createSubmissionTracker({storage});assert.equal(restored.keyFor(payload),key);
 assert.notEqual(restored.keyFor({...payload,question:'新问题'}),key);
 restored.clear();assert.notEqual(restored.keyFor(payload),key);
 const unavailable=createSubmissionTracker({storage:{getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}}});
 assert.equal(unavailable.keyFor(payload),unavailable.keyFor(payload));unavailable.clear();
});
