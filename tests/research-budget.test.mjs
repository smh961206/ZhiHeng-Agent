import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {createResearchBudget,createResearchBudgetState} from '../server/research-budget.mjs';
import {withResearchBudget,beginResearchResource,finishResearchResource,accountResearchRound,researchBudgetSummary,withResearchResource,budgetLimitReason,reuseBudgetRetrieval,retrievalSnapshot,modelCostReservation} from '../server/research-budget.mjs';
const limits={version:1,maxModelCost:{currency:'USD',amount:2},maxToolRounds:10,maxWebRequests:5,maxVisionPages:3,maxDurationMs:60000};
const startedAt='2026-09-12T00:00:00.000Z';
test('budget limits are explicit, immutable and preserve zero versus no configured bound',()=>{
 assert.deepEqual(createResearchBudget(limits),limits);assert.ok(Object.isFrozen(createResearchBudget(limits).maxModelCost));
 assert.equal(createResearchBudget({...limits,maxWebRequests:0}).maxWebRequests,0);assert.equal(createResearchBudget({...limits,maxModelCost:null}).maxModelCost,null);
 for(const patch of [{maxToolRounds:-1},{maxDurationMs:1.5},{maxModelCost:{currency:'USD',amount:NaN}},{version:2},{secret:'private'}])assert.throws(()=>createResearchBudget({...limits,...patch}));
 const state=createResearchBudgetState(limits,{startedAt});assert.equal(state.mode,'dry-run');assert.deepEqual(state.receipts,[]);assert.deepEqual(JSON.parse(JSON.stringify(state)),state);
});
test('durable reservations precede dispatch and round receipts survive restart without double charging',async()=>{
 const job={budgetState:createResearchBudgetState(limits,{startedAt})},writes=[];let performed=0;
 const options={now:()=>startedAt,persist:async()=>writes.push(structuredClone(job))};
 await withResearchBudget(job,async()=>{
  const token=await beginResearchResource('model',1,{id:'call',purpose:'review'});assert.equal(writes.at(-1).budgetState.receipts[0].status,'reserved');
  performed++;await finishResearchResource(token,{currency:'USD',estimatedCost:0.5});await finishResearchResource(token,{currency:'USD',estimatedCost:0.5});
  await accountResearchRound('round:one');await accountResearchRound('round:one');
 },options);
 assert.equal(researchBudgetSummary(job.budgetState,startedAt).counts.toolRound,1);assert.equal(researchBudgetSummary(job.budgetState,startedAt).billing[0].knownEstimatedCost,0.5);
 const restarted=structuredClone(writes.at(-1));
 await withResearchBudget(restarted,async()=>{await accountResearchRound('round:one');await assert.rejects(withResearchResource('model',1,async()=>performed++,{id:'call'}),{code:'research_budget_replay'});},{...options,persist:async()=>{}});
 assert.equal(performed,1);
});
test('unknown reservations and failed durable writes prevent new execution',async()=>{
 const job={budgetState:createResearchBudgetState({...limits,maxModelCost:null},{startedAt})};let performed=0;
 await assert.rejects(withResearchBudget(job,()=>withResearchResource('model',1,async()=>performed++),{now:()=>startedAt,persist:async()=>{throw Error('private');}}),{code:'research_budget_persistence'});
 assert.equal(performed,0);assert.throws(()=>withResearchBudget(job,async()=>performed++,{persist:async()=>{}}),{code:'research_budget_uncertain'});
 assert.equal(researchBudgetSummary(job.budgetState,startedAt).unknownModelCalls,1);
});
test('retired budget restrictions retain historical accounting without stopping execution',async()=>{
 const make=()=>({budgetState:createResearchBudgetState({...limits,maxWebRequests:0},{startedAt,mode:'enforce'})});let requests=0;
 const job=make(),options={now:()=>startedAt,persist:async()=>{},env:{FEATURE_RESEARCH_BUDGET:'true'}};
 await withResearchBudget(job,()=>withResearchResource('webRequest',1,async()=>requests++),options);
 assert.equal(requests,1);assert.equal(job.budgetState.decisions[0].action,'would-stop');
 await withResearchBudget(job,()=>withResearchResource('webRequest',1,async()=>requests++),{...options,env:{FEATURE_RESEARCH_BUDGET:'false'}});
 assert.equal(requests,2);assert.equal(job.budgetState.decisions.at(-1).action,'would-stop');
 const s=make().budgetState;
 assert.equal(budgetLimitReason(s,{kind:'model',units:1,at:startedAt}),'unknown_cost');
 assert.equal(budgetLimitReason(s,{kind:'model',units:1,reservedCost:{currency:'USD',estimatedCost:3},at:startedAt}),'model_cost');
 assert.equal(budgetLimitReason(s,{kind:'model',at:'2026-09-12T00:01:00.000Z'}),'duration');
 assert.equal(modelCostReservation({contextWindow:null}, {},null),null);
});
test('retired budget pressure records historical signals but never reduces retrieval',async()=>{
 const job={budgetState:createResearchBudgetState({...limits,maxToolRounds:0},{startedAt,mode:'enforce'})},sources=[{id:'S1',text:'original'}],args={query:'original'};
 const records=[{toolName:'search_evidence',toolCallId:'old',retrievalFingerprint:retrievalSnapshot(sources,args),result:{matches:[{id:'S1',text:'original'}]}}];
 await withResearchBudget(job,async()=>{
  const input={toolName:'search_evidence',args,sources,records};assert.equal(await reuseBudgetRetrieval(input),null);assert.equal(job.budgetState.decisions.at(-1).action,'would-reduce');
  assert.equal(await reuseBudgetRetrieval({...input,toolName:'verify_financial_inputs'}),null);
  assert.equal(await reuseBudgetRetrieval({...input,sources:[{id:'S1',text:'changed'}]}),null);
  assert.equal(await reuseBudgetRetrieval({...input,args:{query:'counter-evidence'}}),null);
 },{now:()=>startedAt,persist:async()=>{},env:{FEATURE_RESEARCH_BUDGET:'true'}});
});
test('parallel resource accounting serializes persistence and retains both reservations',async()=>{
 const job={budgetState:createResearchBudgetState(limits,{startedAt})};let saves=0;
 await withResearchBudget(job,()=>Promise.all([1,2].map(i=>withResearchResource('webRequest',1,async()=>i,{id:'web:'+i}))),{now:()=>startedAt,persist:async()=>saves++});
 assert.equal(saves,4);assert.equal(researchBudgetSummary(job.budgetState,startedAt).counts.webRequest,2);
});
test('actual Agent resumes completed tools and original data with durable budget receipts',async()=>{
 const actualStart=new Date().toISOString();const old=global.fetch,job={id:'budget-resume',createdAt:startedAt,status:'running',mode:'B',input:{question:'合成预算续跑测试',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[],budgetState:createResearchBudgetState({...limits,maxModelCost:null,maxDurationMs:null},{startedAt:actualStart})};
 let snapshot,calls=0;const emit=(type,message,extra)=>job.events.push({type,message,...extra});
 const collectData=async()=>({sources:[{id:'S1',title:'合成资料',text:'合成参数，仅用于恢复验证。'}],coverage:[{security:'CN:600519',read:1}],warnings:[]});
 const response=content=>Response.json({choices:[{message:{role:'assistant',content}}]});
 try{
  global.fetch=async()=>{calls++;return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'done',type:'function',function:{name:'read_rules',arguments:'{"query":"现金流"}'}},{id:'pending',type:'function',function:{name:'read_rules',arguments:'{"query":"分红"}'}}]}}]});};
  await assert.rejects(runAgent(job,emit,new AbortController().signal,{collectData,onModelCheckpoint:async()=>{},onCheckpoint:async()=>{if(job.checkpoint.toolRecords.length===1){snapshot=structuredClone(job);throw Error('simulated-exit');}}}),/simulated-exit/);
  snapshot.status='failed';const resumed=await prepareResearchRetry(snapshot,async()=>null),before=structuredClone(resumed.input.sources);
  global.fetch=async()=>{calls++;return calls===2?response('合成草稿[S1]'):response(JSON.stringify(reviewFixture(resumed.input)));};
  const result=await runAgent(resumed,(type,message,extra)=>resumed.events.push({type,message,...extra}),new AbortController().signal,{collectData:()=>assert.fail('must not reacquire'),onModelCheckpoint:async()=>{}});
  assert.ok(result.report);assert.equal(calls,3);assert.deepEqual(resumed.input.sources,before);assert.equal(resumed.budgetState.startedAt,actualStart);
  assert.equal(researchBudgetSummary(resumed.budgetState).counts.toolRound,1);assert.equal(resumed.events.filter(e=>e.toolCallId==='done'&&e.type==='tool').length,1);
 }finally{global.fetch=old;}
});
