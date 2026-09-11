import test from 'node:test';
import assert from 'node:assert/strict';
import {createPolicyJobModelState,assertJobModelState,noteModelFailure,withJobModelState} from '../server/model-state.mjs';
import {shouldEscalate,closedModelToolHistory,escalateAtCheckpoint} from '../server/model-escalation.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createPolicyModelCatalog} from '../server/model-catalog.mjs';
import {runAgent} from '../server/agent.mjs';
import {resumeScope} from '../server/research-resume.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const source={id:'S1',title:'synthetic',text:'synthetic source'};
const messages=()=>[{role:'system',content:'Follow evidence rules'},{role:'user',content:'synthetic task'},{role:'assistant',content:null,reasoning_content:'private-marker',tool_calls:[{id:'done',type:'function',function:{name:'read_rules',arguments:'{}'}}]},{role:'tool',tool_call_id:'done',content:'actual result'}];
const make=()=>{
 const job={id:'policy-test',mode:'B',status:'running',input:{question:'synthetic',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[source]},events:[],marketData:{asOf:'2025-12-31'},modelState:createPolicyJobModelState()};
 job.checkpoint={version:1,scope:resumeScope(job),phase:'research',pendingRound:false,messages:messages(),toolRecords:[{toolName:'read_rules',toolCallId:'done',arguments:{},result:{text:'actual result'}}],evidence:[{id:'S1',blockId:'b1',text:'actual excerpt'}],modelState:structuredClone(job.modelState),draft:''};return job;
};
const json=content=>Response.json({choices:[{message:{role:'assistant',content},finish_reason:'stop'}]});

test('explicit policy profiles reject unimplemented effort levels and never use provider default effort',async()=>{
 const g=createModelGateway({catalog:createPolicyModelCatalog(),env:{...process.env,LLM_MAIN_API_KEY:'synthetic'},fetchImpl:()=>assert.fail('unsupported effort must not dispatch')});
 for(const reasoningEffort of [undefined,'off','medium'])await assert.rejects(g.complete({purpose:'research',routingContext:{profileId:'main'},messages:[{role:'user',content:'synthetic'}],reasoningEffort}),e=>['invalid_request','unsupported_capability'].includes(e.category));
});

test('escalation taxonomy excludes data, health, refusal, financial validation and Mode A; completed tool boundary required',()=>{
 for(const kind of ['data_missing','provider_unavailable','timeout','rate_limit','refusal','review_validation','financial_validation']){
  const job=make();noteModelFailure(job,kind);noteModelFailure(job,kind);assert.equal(shouldEscalate({mode:'B',state:job.modelState,phase:'research'}),null);
 }
 const job=make();noteModelFailure(job,'invalid_tool_arguments');noteModelFailure(job,'invalid_tool_arguments');
 for(const constraints of [{mode:'A'},{pendingTools:true},{explicitProfile:true}])assert.equal(shouldEscalate({mode:'B',state:job.modelState,phase:'research',...constraints}),null);
 assert.equal(closedModelToolHistory(messages()),true);assert.equal(closedModelToolHistory(messages().slice(0,-1)),false);
 assert.equal(closedModelToolHistory([...messages().slice(0,-1),{role:'assistant',content:'new'}]),false);
});

test('entire ladder rebuilds verified context, keeps private history local and persists before the next dispatch',async()=>{
 const job=make(),history=job.checkpoint.messages,original=structuredClone(job),wires=[],records=[];
 const env={...process.env,LLM_MAIN_API_KEY:'synthetic-main',LLM_API_KEY:'synthetic-pro'};
 const g=createModelGateway({env,onModelCall:r=>records.push(r),fetchImpl:async(u,o)=>{wires.push({url:u.href,body:JSON.parse(o.body)});return json('ok');}});
 await withJobModelState(job,()=>g.complete({purpose:'research',messages:history}));
 for(let step=0;step<3;step++){
  noteModelFailure(job,'invalid_tool_arguments');noteModelFailure(job,'invalid_tool_arguments');let durable=false;
  assert.equal(await escalateAtCheckpoint(job,{phase:'research',messages:history,persist:async()=>{await Promise.resolve();assertJobModelState(job);durable=true;}}),true);
  assert.equal(durable,true);assert.doesNotMatch(JSON.stringify(history),/private-marker|reasoning_content|tool_calls|tool_call_id/);
  assert.match(JSON.stringify(history),/actual excerpt|actual result/);
  await withJobModelState(job,()=>g.complete({purpose:'research',messages:history}));
 }
 assert.deepEqual(wires.map(w=>[w.body.model,w.body.reasoning_effort]),[['glm-5.3-flash','low'],['glm-5.3-flash','high'],['deepseek-v4-pro','high'],['deepseek-v4-pro','max']]);
 assert.ok(wires.every(w=>w.body.thinking.type==='enabled'));assert.equal(records.at(-1).routingMode,'policy');assert.equal(records.at(-1).profile,'pro');
 assert.deepEqual(job.input,original.input);assert.deepEqual(job.marketData,original.marketData);assert.deepEqual(job.checkpoint.toolRecords,original.checkpoint.toolRecords);
 noteModelFailure(job,'structured_output');noteModelFailure(job,'structured_output');assert.equal(await escalateAtCheckpoint(job,{phase:'research',messages:history,persist:()=>assert.fail('maximum already reached')}),false);
});

test('pending tools forbid transitions and uncertain checkpoint acknowledgement stops without sending old history',async()=>{
 const job=make();noteModelFailure(job,'structured_output');noteModelFailure(job,'structured_output');
 const pending=messages().slice(0,-1);assert.equal(await escalateAtCheckpoint(job,{phase:'research',messages:pending,persist:()=>assert.fail('pending')}),false);
 const complete=messages();await assert.rejects(escalateAtCheckpoint(job,{phase:'research',messages:complete,persist:async()=>{throw new Error('uncertain write');}}),e=>e.code==='model_checkpoint_write');
 assertJobModelState(job);assert.equal(job.modelState.active.reasoningEffort,'high');assert.doesNotMatch(JSON.stringify(job.checkpoint.messages),/private-marker/);assert.match(JSON.stringify(complete),/private-marker/,'caller must stop on rejection; persisted state is already rebuilt');
});

test('repeated review transitions preserve actual Vision material without nesting old rebuilt context',async()=>{
 const job=make(),research=messages(),review=[{role:'system',content:'audit rules'},{role:'user',content:'audit input'},{role:'user',content:'actual Vision source material'}];
 job.checkpoint.review={messages:structuredClone(review),visualMessageIndex:2,toolsPending:false};
 for(let i=0;i<3;i++){
  noteModelFailure(job,'structured_output');noteModelFailure(job,'structured_output');
  await escalateAtCheckpoint(job,{phase:'review',messages:research,reviewMessages:review,persist:async()=>{}});
  assert.equal(job.checkpoint.review.normalizedVisualContext,'actual Vision source material');
  assert.equal(job.checkpoint.review.visualMessageIndex,-1);
  assert.equal((JSON.stringify(review).match(/actual Vision source material/g)??[]).length,1);
 }
});

test('actual Agent completes all invalid-JSON tool receipts before escalating; original audit still validates delivery',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.LLM_MAIN_API_KEY;process.env.LLM_MAIN_API_KEY='synthetic';
 const job=make();delete job.checkpoint;let calls=0,persisted=0;const bodies=[];
 try{
  global.fetch=async(u,o)=>{const body=JSON.parse(o.body);bodies.push(body);calls++;
   if(calls===1)return Response.json({choices:[{message:{role:'assistant',content:null,reasoning_content:'private-marker',tool_calls:[1,2].map(i=>({id:'bad'+i,type:'function',function:{name:'read_rules',arguments:'{'}}))},finish_reason:'tool_calls'}]});
   if(calls===2){assert.equal(persisted,1);assert.equal(body.reasoning_effort,'high');assert.doesNotMatch(JSON.stringify(body),/private-marker/);return json('draft[S1]');}
   return json(JSON.stringify(reviewFixture(job.input)));
  };
  const result=await runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),new AbortController().signal,{collectData:async()=>({sources:[source],coverage:[{read:1}],warnings:[]}),onModelCheckpoint:async()=>{persisted++;assert.equal(job.checkpoint.toolRecords.length,2);assert.ok(job.checkpoint.toolRecords.every(r=>r.result.error));assertJobModelState(job);}});
  assert.ok(result.report);assert.equal(calls,3);assert.equal(persisted,1);assert.equal(job.modelState.escalationHistory[0].reason,'invalid_tool_arguments');
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.LLM_MAIN_API_KEY;else process.env.LLM_MAIN_API_KEY=oldKey;}
});

test('actual Agent escalates repeated review JSON failures without increasing review repair budget',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.LLM_MAIN_API_KEY;process.env.LLM_MAIN_API_KEY='synthetic';
 const job=make();delete job.checkpoint;let calls=0,persisted=0;
 try{
  global.fetch=async(u,o)=>{const body=JSON.parse(o.body);calls++;
   if(calls===1)return json('draft[S1]');
   if(calls<4)return json('{');
   assert.equal(body.reasoning_effort,'high');assert.equal(persisted,1);return json(JSON.stringify(reviewFixture(job.input)));
  };
  const result=await runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),new AbortController().signal,{collectData:async()=>({sources:[source],coverage:[{read:1}],warnings:[]}),onModelCheckpoint:async()=>{persisted++;assertJobModelState(job);}});
  assert.ok(result.report);assert.equal(calls,4);assert.equal(job.modelState.escalationHistory[0].reason,'structured_output');
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.LLM_MAIN_API_KEY;else process.env.LLM_MAIN_API_KEY=oldKey;}
});

test('new Vision material after a review transition reaches the next audit and replaces the saved normalized material',async()=>{
 const oldFetch=global.fetch,oldKey=process.env.LLM_MAIN_API_KEY;process.env.LLM_MAIN_API_KEY='synthetic';
 const job=make();delete job.checkpoint;let calls=0,reads=0;const wires=[];
 try{
  global.fetch=async(u,o)=>{wires.push(JSON.parse(o.body));calls++;
   if(calls===1)return json('draft[S1]');
   if(calls<4)return json('{');
   return json(JSON.stringify(reviewFixture(job.input)));
  };
  const result=await runAgent(job,()=>{},new AbortController().signal,{
   collectData:async()=>({sources:[structuredClone(source)],coverage:[{read:1}],warnings:[]}),
   readVisualContext:async()=>({coverage:{included:[{id:'S1',pages:[1]}],omitted:[]},content:[{type:'text',text:++reads===1?'VISION-BEFORE-TRANSITION':'VISION-AFTER-TRANSITION'}]}),
   onModelCheckpoint:async()=>{job.input.sources[0].agentVisualReadings=[{attachmentId:'new-synthetic-reading'}];},
  });
  assert.ok(result.report);assert.equal(calls,4);assert.equal(reads,2);
  assert.match(JSON.stringify(wires[3].messages),/VISION-AFTER-TRANSITION/);
  assert.match(JSON.stringify(job.checkpoint.review.normalizedVisualContext),/VISION-AFTER-TRANSITION/);
  job.resume={available:true};job.input.sources[0].agentVisualReadings.push({attachmentId:'new-reading-after-resume'});
  const resumed=await runAgent(job,()=>{},new AbortController().signal,{
   collectData:()=>assert.fail('compatible review resume must not collect again'),
   readVisualContext:async()=>({coverage:{included:[{id:'S1',pages:[1]}],omitted:[]},content:[{type:'text',text:'VISION-AFTER-RESUME'}]}),
   onModelCheckpoint:async()=>{},
  });
  assert.ok(resumed.report);assert.equal(calls,5);assert.match(JSON.stringify(wires[4].messages),/VISION-AFTER-RESUME/);
  assert.match(JSON.stringify(job.checkpoint.review.normalizedVisualContext),/VISION-AFTER-RESUME/);
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.LLM_MAIN_API_KEY;else process.env.LLM_MAIN_API_KEY=oldKey;}
});
