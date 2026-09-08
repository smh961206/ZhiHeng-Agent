import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {researchResume,pendingToolCalls,resumeSummary,resumeScope} from '../server/research-resume.mjs';
import {publicJob} from '../server/job-stream.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {researchStages} from '../shared/research-framework.mjs';
import {createWebResearchSession} from '../server/web-research.mjs';
const source={id:'S1',title:'合成资料',text:'合成测试参数 PE=12.5，ROE=25%。'};
const makeJob=()=>({id:'resume-fixture',createdAt:'2026-09-01T00:00:00Z',status:'running',mode:'B',input:{question:'合成续跑测试',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
const response=content=>Response.json({choices:[{message:{role:'assistant',content}}]});
const emitFor=job=>(type,message,details)=>job.events.push({type,message,...details});
const collect=async()=>({sources:[source],coverage:[{security:'CN:600519',read:1}],warnings:[]});

test('persisted tool boundary survives interruption, preserves reasoning privately and runs only pending calls',async()=>{
 const previousFetch=global.fetch;let snapshot,calls=0;
 const job=makeJob();
 const tools=[{id:'done',type:'function',function:{name:'calculate_normalized_earnings',arguments:JSON.stringify({equity:100,shares:10,roeLow:.1,roeHigh:.2,peLow:10,peHigh:15,basis:{currency:'CNY',period:'2025 FY',shareBasis:'普通股一致口径',assumptions:'合成参数',sourceIds:['S1']}})}},{id:'pending',type:'function',function:{name:'read_rules',arguments:JSON.stringify({query:'现金流'})}}];
 try{
  global.fetch=async()=>{calls++;return Response.json({choices:[{message:{role:'assistant',content:null,reasoning_content:'private-reasoning-marker',tool_calls:tools}}]});};
  await assert.rejects(runAgent(job,emitFor(job),new AbortController().signal,{collectData:collect,onCheckpoint:async()=>{if(job.checkpoint.toolRecords.length===1){snapshot=structuredClone(job);throw new Error('simulated process termination');}}}),/simulated process termination/);
  assert.equal(calls,1);assert.deepEqual(pendingToolCalls(snapshot.checkpoint.messages).map(c=>c.id),['pending']);
  snapshot.status='failed';const resumed=await prepareResearchRetry(snapshot,async()=>null);
  assert.deepEqual(resumed.input.sources,[source]);assert.ok(resumed.events.length>1);
  const visible=JSON.stringify(publicJob(resumed));assert.ok(!visible.includes('private-reasoning-marker'));assert.equal(publicJob(resumed).checkpoint,undefined);assert.equal(publicJob(resumed).resume.available,true);
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);calls++;
   if(calls===2){assert.equal(body.messages.find(m=>m.tool_calls)?.reasoning_content,'private-reasoning-marker');assert.deepEqual(body.messages.filter(m=>m.role==='tool').map(m=>m.tool_call_id),['done','pending']);return response('续跑草稿[S1]');}
   const context=JSON.parse(body.messages[1].content);assert.equal(context.calculationSummary.succeeded,1);return response(JSON.stringify(reviewFixture(resumed.input)));
  };
  const result=await runAgent(resumed,emitFor(resumed),new AbortController().signal,{collectData:()=>{throw new Error('must not recollect');}});
  assert.ok(result.report);assert.equal(calls,3);
  assert.equal(resumed.events.filter(e=>e.type==='tool'&&e.toolCallId==='done').length,1,'Completed calculation is never executed twice');
 }finally{global.fetch=previousFetch;}
});

test('interrupted review resumes review messages and skips collection, draft generation and repeated Vision',async()=>{
 const old=global.fetch,job=makeJob();let snapshot,requests=0,vision=0;
 const readVisualContext=async()=>{vision++;return {coverage:{included:[],omitted:[]},content:[]};};
 try{
  global.fetch=async()=>{requests++;return response('已完成的草稿[S1]');};
  await assert.rejects(runAgent(job,emitFor(job),new AbortController().signal,{collectData:collect,readVisualContext,onCheckpoint:async()=>{if(job.checkpoint.review?.messages){snapshot=structuredClone(job);throw new Error('interrupted audit');}}}),/interrupted audit/);
  snapshot.status='failed';const resumed=await prepareResearchRetry(snapshot,async()=>null);
  assert.equal(resumed.resume.phase,'review');
  const completedStages=structuredClone(resumed.workflow.stages.filter(s=>s.status==='completed'));
  const eventBoundary=resumed.events.length;
  global.fetch=async(_url,options)=>{requests++;assert.deepEqual(JSON.parse(options.body).messages,snapshot.checkpoint.review.messages);return response(JSON.stringify(reviewFixture(resumed.input)));};
  assert.ok((await runAgent(resumed,emitFor(resumed),new AbortController().signal,{collectData:()=>assert.fail('recollect'),readVisualContext})).report);
  assert.equal(requests,2);assert.equal(vision,1);
  for(const stage of completedStages)assert.deepEqual(resumed.workflow.stages.find(s=>s.id===stage.id),stage);
  for(const event of resumed.events.slice(eventBoundary).filter(e=>e.type==='workflow'))assert.ok(!event.workflow.stages.some(s=>['evidence','research'].includes(s.id)&&s.status==='running'),'Review resumes without restarting completed stages');
 }finally{global.fetch=old;}
});

test('public resume availability matches execution validation and counts only saved results',()=>{
 const job=makeJob();job.status='failed';job.input.sources=[source];
 job.workflow={stages:[{id:'evidence',status:'completed'}]};
 job.checkpoint={version:1,scope:resumeScope(job),phase:'review',draft:'完整草稿',evidence:[],toolRecords:[
  {toolName:'calculate_p2',result:{value:1}},{toolName:'calculate_p2',result:{error:'失败'}},{toolName:'read_rules',result:{text:'规则'}}
 ]};
 assert.deepEqual(resumeSummary(job),{available:true,phase:'review',origin:'checkpoint',sourceCount:1,toolCount:3,calculationCount:1});
 for(const invalid of [{phase:'unknown'},{draft:''},{scope:'changed'},{toolRecords:null},{evidence:null},{version:2}]){
  const changed={...job,checkpoint:{...job.checkpoint,...invalid}};
  assert.equal(researchResume(changed),null);assert.deepEqual(resumeSummary(changed),{available:false});
 }
 assert.deepEqual(resumeSummary({...job,status:'completed'}),{available:false});
});

test('legacy interrupted jobs reuse actual sources and tool history; incomplete collection falls back honestly',async()=>{
 const job=makeJob();job.status='failed';job.input.sources=[source];job.workflow={stages:researchStages.map(s=>({...s,status:s.id==='evidence'?'completed':'pending'}))};
 job.events=[{type:'tool',toolCallId:'old',toolName:'search_evidence',arguments:{query:'现金流'}},{type:'tool_result',toolCallId:'old',toolName:'search_evidence',result:{matches:[{id:'S1',blockId:'b1',text:source.text}]}}];
 const before=structuredClone(job),resumed=await prepareResearchRetry(job,async()=>null);
 assert.equal(resumed.checkpoint.origin,'history');assert.equal(resumed.checkpoint.toolRecords.length,1);assert.equal(resumed.checkpoint.evidence.length,1);assert.deepEqual(job,before);
 assert.equal(researchResume({...job,workflow:undefined}),null);
 assert.equal(researchResume({...resumed,input:{...resumed.input,question:'different'}}),null);
 const old=global.fetch;
 try{let requests=0;global.fetch=async(_url,options)=>{requests++;const body=JSON.parse(options.body);if(requests===1){assert.ok(body.messages.some(m=>typeof m.content==='string'&&m.content.includes('服务中断后继续同一研究')));return response('恢复的草稿[S1]');}return response(JSON.stringify(reviewFixture(resumed.input)));};assert.ok((await runAgent(resumed,emitFor(resumed),new AbortController().signal,{collectData:()=>assert.fail('must retain legacy sources')})).report);assert.equal(requests,2);}finally{global.fetch=old;}
});

test('web lookup receipts and consumed budget survive a model checkpoint',async()=>{
 const job=makeJob();job.input.sources=[source];
 const first=createWebResearchSession({job,searchLocal:()=>[],status:{enabled:false,configured:false}});
 const receipt=first.local({query:'现金流'});first.state.searchCount=3;
 job.checkpoint={webState:structuredClone(first.state),webRuntime:first.snapshot()};job.resume={available:true};
 const next=createWebResearchSession({job,searchLocal:()=>[]});
 assert.equal(next.state.searchCount,3);assert.notEqual(next.local({query:'利润'}).retrievalId,receipt.retrievalId);
 const result=await next.search({retrievalId:receipt.retrievalId,gap:'合成现金流缺口需要核对'},new AbortController().signal);
 assert.equal(result.status,'disabled');assert.equal(next.state.searchCount,3);
});
