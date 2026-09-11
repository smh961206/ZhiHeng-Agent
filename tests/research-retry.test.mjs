import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareResearchRetry,createResearchRetrier} from '../server/research-retry.mjs';
import {knowledgeManifest} from '../server/knowledge.mjs';

const fixture=()=>({id:'00000000-0000-4000-8000-000000000025',createdAt:'2026-09-01T00:00:00Z',status:'failed',mode:'C',
 input:{question:'更新贵州茅台财报',mode:'auto',depth:'Deep',historyYears:8,securities:[{market:'CN',symbol:'600519'}],portfolio:'原有备注',portfolioContext:{holdings:'原持仓'},previousResearch:'原结论',
  baselineJobId:'00000000-0000-4000-8000-000000000024',baseline:{jobId:'00000000-0000-4000-8000-000000000024',report:'原对照快照[历史:S1]'},sources:Array.from({length:20},()=>({text:'旧来源'}))},
 error:'旧错误',result:{report:'旧结果'},researchOutcome:{action:'旧动作'},draft:'旧草稿',liveReport:{text:'旧预览'},marketData:{quotes:['旧行情']},workflow:{stages:[{status:'failed'}]},finishedAt:'2026-09-01T01:00:00Z',events:[{message:'旧执行轨迹'}]});
function harness(previous=fixture()){
 const db=new Map([[previous.id,structuredClone(previous)]]),jobs=new Map(),controllers=new Map(),pendingStarts=new Set(),mutations=new Set(),executions=[];
 const storage={async getJob(id){return structuredClone(db.get(id));},async restartJob(job,expected){const old=db.get(job.id);if(!old||!['failed','cancelled'].includes(old.status)||(old.retryCount??0)!==expected)throw Object.assign(new Error('changed'),{status:409});db.set(job.id,structuredClone(job));}};
 const retry=createResearchRetrier({storage,jobs,controllers,pendingStarts,mutations,configured:()=>true,execute(job){executions.push(job);controllers.set(job.id,{});job.status='running';}});
 return {db,jobs,controllers,pendingStarts,mutations,storage,retry,executions,id:previous.id};
}

test('retry retains identity and input context, uses the stored baseline and resets execution data',async()=>{
 const prior=fixture(),original=structuredClone(prior);
 const next=await prepareResearchRetry(prior,()=>{throw new Error('The saved baseline must survive deletion of its original report');},'2026-09-06T00:00:00Z');
 assert.equal(next.id,prior.id);assert.equal(next.createdAt,prior.createdAt);assert.equal(next.retryCount,1);assert.equal(next.lastRetriedAt,'2026-09-06T00:00:00Z');
 assert.equal(next.status,'queued');assert.equal(next.mode,'C');assert.deepEqual(next.input.baseline,prior.input.baseline);
 for(const key of ['question','depth','historyYears','securities','portfolio','portfolioContext','previousResearch','baselineJobId'])assert.deepEqual(next.input[key],prior.input[key]);
 assert.deepEqual(next.input.sources,[]);
 for(const key of ['error','result','researchOutcome','draft','liveReport','marketData','workflow','finishedAt'])assert.ok(!(key in next),'Old '+key+' must not survive a restart');
 assert.match(next.events[0].message,/重试/);assert.equal(next.events.length,1);assert.equal(next.plan.knowledge.length,knowledgeManifest.length);
 assert.deepEqual(prior,original,'Preparing a retry must not mutate the failed job before persistence succeeds');
});

test('only one concurrent retry starts; a stale browser cannot restart a newer failed attempt',async()=>{
 const h=harness();
 const results=await Promise.allSettled([h.retry(h.id,0),h.retry(h.id,0)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
 assert.equal(h.executions.length,1);assert.equal(h.db.size,1);assert.equal(h.db.get(h.id).retryCount,1);
 assert.equal(h.pendingStarts.size,0);assert.equal(h.mutations.size,0);
 h.controllers.clear();h.jobs.clear();h.db.get(h.id).status='failed';
 await assert.rejects(h.retry(h.id,0),error=>error.status===409);
 await h.retry(h.id,1);assert.equal(h.db.size,1);assert.equal(h.db.get(h.id).retryCount,2);assert.equal(h.executions.length,2);
});

test('retry refuses completed/active/missing records and shares capacity and mutation locks',async()=>{
 for(const status of ['queued','running','completed']){
  const h=harness({...fixture(),status});await assert.rejects(h.retry(h.id,0),error=>error.status===409);assert.equal(h.executions.length,0);
 }
 const h=harness();await assert.rejects(h.retry('missing',0),error=>error.status===404);
 for(const count of [-1,undefined,1.5])await assert.rejects(h.retry(h.id,count),error=>error.status===400);
 h.mutations.add(h.id);await assert.rejects(h.retry(h.id,0),error=>error.status===409);h.mutations.clear();
 h.controllers.set(h.id,{});await assert.rejects(h.retry(h.id,0),error=>error.status===409);h.controllers.clear();
 h.pendingStarts.add('new-job-1');h.pendingStarts.add('new-job-2');h.controllers.set('running-job',{});
 await assert.rejects(h.retry(h.id,0),error=>error.status===429);assert.equal(h.executions.length,0);
});

test('failed persistence leaves the original record intact and releases the retry lock',async()=>{
 const h=harness(),prior=structuredClone(h.db.get(h.id)),save=h.storage.restartJob;
 h.storage.restartJob=async()=>{throw new Error('storage unavailable');};
 await assert.rejects(h.retry(h.id,0),error=>error.status===503);
 assert.deepEqual(h.db.get(h.id),prior);assert.equal(h.jobs.size,0);assert.equal(h.executions.length,0);assert.equal(h.mutations.size,0);assert.equal(h.pendingStarts.size,0);
 h.storage.restartJob=save;await h.retry(h.id,0);assert.equal(h.executions.length,1);
});

test('cancelled retry waits for durable finalization, rejects duplicates, and never releases the old controller early',async()=>{
 const h=harness({...fixture(),status:'cancelled',retryCount:1});
 const control=new AbortController();control.abort();h.controllers.set(h.id,control);
 const closing=Promise.withResolvers(),finishing=new Map([[h.id,closing.promise]]);
 h.jobs.set(h.id,{...h.db.get(h.id),status:'running',delivery:{status:'saving'}});
 const retry=createResearchRetrier({...h,finishing,configured:()=>true,execute:job=>h.executions.push(job)});
 const pending=retry(h.id,1);await Promise.resolve();
 assert.equal(h.executions.length,0);assert.equal(h.controllers.get(h.id),control);
 await assert.rejects(retry(h.id,1),error=>error.status===409);
 h.jobs.delete(h.id);h.controllers.delete(h.id);finishing.delete(h.id);closing.resolve();
 const next=await pending;assert.equal(next.retryCount,2);assert.equal(h.executions.length,1);
 assert.equal(h.mutations.size,0);assert.equal(h.pendingStarts.size,0);
 await assert.rejects(retry(h.id,1),error=>error.status===409);
});

test('cancel finalization timeout and failed delivery preserve locks and refuse unsafe retry',async()=>{
 const h=harness({...fixture(),status:'cancelled',retryCount:1}),control=new AbortController();control.abort();
 h.controllers.set(h.id,control);h.jobs.set(h.id,{...h.db.get(h.id),status:'running'});
 const closing=Promise.withResolvers(),finishing=new Map([[h.id,closing.promise]]);
 const retry=createResearchRetrier({...h,finishing,finishTimeoutMs:10,configured:()=>true,execute:job=>h.executions.push(job)});
 await assert.rejects(retry(h.id,1),error=>error.status===409);
 assert.equal(h.controllers.get(h.id),control);assert.equal(h.mutations.size,0);assert.equal(h.pendingStarts.size,0);
 const pending=retry(h.id,1);
 h.jobs.set(h.id,{...h.db.get(h.id),status:'failed',delivery:{recoverable:true}});h.controllers.delete(h.id);closing.resolve();
 await assert.rejects(pending,error=>error.status===409);assert.equal(h.executions.length,0);
});
