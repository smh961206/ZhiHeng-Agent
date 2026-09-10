import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as nextTick} from 'node:timers/promises';
import {createModelDeadline,modelTimeouts} from '../server/model-deadline.mjs';
import {readCompletion} from '../server/model-stream.mjs';
import {completion} from '../server/agent.mjs';
function clock(){
 let now=0,id=0;const timers=new Map();
 return {timers,setTimer(fn,ms){const key=++id;timers.set(key,{at:now+ms,fn});return key;},clearTimer(key){timers.delete(key);},advance(ms){
  const end=now+ms;
  for(;;){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();}now=end;
 }};
}

test('ongoing generation survives the old deadline but cannot exceed the total limit',()=>{
 const time=clock(),deadline=createModelDeadline({idleMs:100,totalMs:350,...time});
 for(let i=0;i<4;i++){time.advance(80);assert.equal(deadline.signal.aborted,false);deadline.activity();}
 time.advance(30);assert.equal(deadline.signal.reason.code,'model_timeout');assert.equal(deadline.signal.reason.timeoutKind,'total');
 deadline.dispose();assert.equal(time.timers.size,0);
});

test('silence expires and disposal stops both timers',()=>{
 const time=clock(),deadline=createModelDeadline({idleMs:100,totalMs:350,...time});
 time.advance(100);assert.equal(deadline.signal.reason.timeoutKind,'idle');assert.match(deadline.signal.reason.message,/未返回内容或保活信号/);
 deadline.dispose();deadline.activity();assert.equal(time.timers.size,0);
 const next=createModelDeadline({idleMs:100,totalMs:350,...time});next.dispose();time.advance(1000);assert.equal(next.signal.aborted,false);
});

test('caller cancellation and shorter stage deadlines are never extended by activity',()=>{
 const time=clock(),control=new AbortController();const deadline=createModelDeadline({signal:control.signal,idleMs:100,totalMs:350,...time});
 const reason=new DOMException('stage expired','TimeoutError');control.abort(reason);deadline.activity();
 assert.equal(deadline.signal.reason,reason);deadline.dispose();assert.equal(time.timers.size,0);
 const cancelled=createModelDeadline({signal:control.signal,idleMs:100,totalMs:350,...time});assert.equal(time.timers.size,0);cancelled.dispose();
});

test('only actual streamed content resets inactivity; reasoning stays private',async()=>{
 let body,activity=0;const visible=[];
 const response=new Response(new ReadableStream({start(controller){body=controller;}}),{headers:{'content-type':'text/event-stream'}});
 const emit=text=>body.enqueue(new TextEncoder().encode(text));
 const result=readCompletion(response,text=>visible.push(text),{onActivity:()=>activity++});
 emit(': keepalive\n\ndata: {"choices":[{"delta":{}}]}\n\n');await nextTick();assert.equal(activity,0);
 emit('data: {"choices":[{"delta":{"reasoning_content":"private reasoning"}}]}\n\n');await nextTick();assert.equal(activity,1);assert.deepEqual(visible,[]);
 emit('data: {"choices":[{"delta":{"content":"visible"}}]}\n\n');await nextTick();assert.equal(activity,2);
 emit('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');body.close();
 assert.equal((await result).content,'visible');assert.deepEqual(visible,['visible']);
});

test('tool argument fragments count as progress without leaking into report text',async()=>{
 let activity=0;
 const frames=[{choices:[{delta:{tool_calls:[{index:0,id:'call_1',function:{name:'search_evidence',arguments:'{}'}}]}}]}, {choices:[{delta:{},finish_reason:'tool_calls'}]}];
 const response=new Response(frames.map(frame=>'data: '+JSON.stringify(frame)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 const result=await readCompletion(response,()=>assert.fail('tools are not report text'),{onActivity:()=>activity++});
 assert.equal(activity,1);assert.equal(result.tool_calls.length,1);
});

test('stream-read timeout surfaces the Chinese deadline cause and never publishes partial output',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const old=global.fetch;
 try{
  global.fetch=async(_url,{signal})=>new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}),{headers:{'content-type':'text/event-stream'}});
  const pending=completion([{role:'user',content:'synthetic'}],undefined,new AbortController().signal);
  const rejected=assert.rejects(pending,error=>error.code==='model_timeout'&&error.timeoutKind==='idle'&&/未返回内容或保活信号/.test(error.message));
  await nextTick();t.mock.timers.tick(modelTimeouts().idleMs);await rejected;
 }finally{global.fetch=old;}
});

test('timeout settings have safe defaults and finite bounds',()=>{
 assert.deepEqual(modelTimeouts({}),{idleMs:300000,totalMs:1800000});
 assert.deepEqual(modelTimeouts({LLM_TIMEOUT_MS:'NaN',LLM_MAX_DURATION_MS:'Infinity'}),modelTimeouts({}));
 assert.deepEqual(modelTimeouts({LLM_TIMEOUT_MS:'1',LLM_MAX_DURATION_MS:'99999999'}),{idleMs:30000,totalMs:3600000});
});


test('provider keep-alives keep a waiting completion alive beyond inactivity and never become report text',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const old=global.fetch,waiting=[],visible=[];let body;
 try{
  global.fetch=async(_url,{signal})=>new Response(new ReadableStream({start(controller){body=controller;signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}),{headers:{'content-type':'text/event-stream'}});
  let settled=false;
  const pending=completion([{role:'user',content:'synthetic'}],undefined,new AbortController().signal,text=>visible.push(text),{onWaiting:entry=>waiting.push(entry)});
  pending.then(()=>{settled=true;},()=>{settled=true;});await nextTick();
  const step=modelTimeouts().idleMs/2;
  for(let i=0;i<3;i++){
   t.mock.timers.tick(step);body.enqueue(new TextEncoder().encode(': keep-alive\r\n\r\n'));await nextTick();
  }
  assert.equal(settled,false,'valid heartbeats must extend the connection idle deadline');
  assert.ok(waiting.length>0);assert.deepEqual(visible,[]);
  body.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"complete"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));body.close();
  assert.equal((await pending).content,'complete');assert.deepEqual(visible,['complete']);
 }finally{global.fetch=old;}
});

test('endless keep-alives remain bounded by the total request deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const old=global.fetch;let body;
 try{
  global.fetch=async(_url,{signal})=>new Response(new ReadableStream({start(controller){body=controller;signal.addEventListener('abort',()=>controller.error(signal.reason),{once:true});}}),{headers:{'content-type':'text/event-stream'}});
  const pending=completion([{role:'user',content:'synthetic'}],undefined,new AbortController().signal);
  const rejected=assert.rejects(pending,error=>error.code==='model_timeout'&&error.timeoutKind==='total');await nextTick();
  const {idleMs,totalMs}=modelTimeouts();let elapsed=0;
  while(elapsed<totalMs){
   body.enqueue(new TextEncoder().encode(': keep-alive\n\n'));await nextTick();
   const step=Math.min(idleMs/2,totalMs-elapsed);t.mock.timers.tick(step);elapsed+=step;
  }
  await rejected;
 }finally{global.fetch=old;}
});

test('arbitrary SSE comments and incomplete heartbeat frames cannot refresh a connection',async()=>{
 let beats=0;
 const response=new Response(': unrelated comment\n\n: keep-alive-not-valid\n\ndata: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 assert.equal((await readCompletion(response,()=>{},{onHeartbeat:()=>beats++})).content,'ok');assert.equal(beats,0);
});
