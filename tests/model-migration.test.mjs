import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setImmediate as nextTick} from 'node:timers/promises';
import {completion,runAgent} from '../server/agent.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {modelTimeouts} from '../server/model-deadline.mjs';
import {migrationScenario} from './fixtures/model-migration-scenario.mjs';

const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/model-migration-baseline.json',import.meta.url)));
assert.deepEqual(baseline.cases.map(c=>c.mode),['A','B','C','D','E','F']);
for(const expected of baseline.cases)test('V4.8.3 preserves pinned legacy wire, delivery, events and checkpoints for mode '+expected.mode,async()=>{
 assert.deepEqual(await migrationScenario(runAgent,expected.mode),expected);
});
const env={LLM_API_KEY:'synthetic-key',LLM_BASE_URL:'https://model.invalid'};
const request={purpose:'research',messages:[{role:'user',content:'synthetic'}]};
const json=(content='answer',finish)=>Response.json({choices:[{message:{role:'assistant',content},...(finish!==undefined?{finish_reason:finish}:{})}]});
const reject=(promise,category)=>assert.rejects(promise,e=>e.category===category);

test('legacy text compatibility permits only missing JSON finish metadata and keeps standard Gateway strict',async()=>{
 const options={env,fetchImpl:async()=>json()};
 await reject(createModelGateway(options).complete(request),'malformed_response');
 const gateway=createModelGateway({...options,compatibility:'legacy-text'});
 for(const purpose of ['research','review','followup']){
  const result=await gateway.complete({...request,purpose});
  assert.equal(result.message.content,'answer');assert.equal(result.finishReason,null);
 }
 await reject(gateway.complete({...request,purpose:'router'}),'unsupported_capability');
 for(const [response,category] of [
  [()=>json('partial','length'),'truncated'],[()=>json('answer','invalid'),'malformed_response'],
  [()=>json(''),'malformed_response'],
  [()=>Response.json({choices:[{message:{role:'assistant',refusal:'private-refusal'}}]}),'refusal'],
  [()=>new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}}),'truncated'],
 ])await reject(createModelGateway({...options,compatibility:'legacy-text',fetchImpl:async()=>response()}).complete(request),category);
});

test('Gateway lifecycle callbacks contain only safe progress and preserve synchronous failure handling',async()=>{
 let calls=0,activity=0,heartbeats=0;const retry=[];
 const fetchImpl=async()=>{
  if(++calls===1)throw Object.assign(new Error('private-transport'),{code:'ECONNRESET'});
  return new Response(': keep-alive\n\ndata: {"choices":[{"index":0,"delta":{"reasoning_content":"private-reasoning","content":"answer"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
 };
 await createModelGateway({env,wait:async()=>{},fetchImpl}).complete({...request,onRetry:event=>retry.push(event),onActivity:value=>{assert.equal(value,undefined);activity++;},onHeartbeat:value=>{assert.equal(value,undefined);heartbeats++;}});
 assert.deepEqual(retry,[{attempt:2,maxAttempts:3,delayMs:1000}]);assert.equal(activity,1);assert.equal(heartbeats,1);
 for(const name of ['onRetry','onActivity','onHeartbeat']){
  calls=0;
  await reject(createModelGateway({env,wait:async()=>{},fetchImpl}).complete({...request,[name]:async()=>{throw new Error('private-callback');}}),'callback_error');
 }
 await nextTick();
});

test('format negotiation freezes the logical call connection and preserves the full evidence packet',async()=>{
 const oldFetch=globalThis.fetch,keys=['LLM_MODEL','LLM_BASE_URL','LLM_API_KEY'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{LLM_MODEL:'original-model',LLM_BASE_URL:'https://original.invalid',LLM_API_KEY:'original-key'});
 const bodies=[];
 globalThis.fetch=async(url,options)=>{
  assert.equal(url.origin,'https://original.invalid');assert.equal(options.headers.Authorization,'Bearer original-key');
  const body=JSON.parse(options.body);bodies.push(body);assert.equal(body.model,'original-model');
  return bodies.length===1?Response.json({error:{message:'response_format unsupported'}},{status:400}):json('{}');
 };
 try{
  await completion(request.messages,undefined,new AbortController().signal,undefined,{purpose:'review',responseFormat:{type:'json_object'},allowFormatFallback:true,onFormatFallback:()=>Object.assign(process.env,{LLM_MODEL:'changed-model',LLM_BASE_URL:'https://changed.invalid',LLM_API_KEY:'changed-key'})});
  assert.equal(bodies.length,2);assert.deepEqual(bodies[0].messages,bodies[1].messages);
 }finally{globalThis.fetch=oldFetch;for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});

test('format fallback cannot restart the outer total deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const oldFetch=globalThis.fetch;let calls=0,body;
 const {idleMs,totalMs}=modelTimeouts();
 globalThis.fetch=async(_url,{signal})=>{
  calls++;
  if(calls===1){t.mock.timers.tick(idleMs/2);return Response.json({error:{message:'response_format unsupported'}},{status:400});}
  return new Response(new ReadableStream({start(c){body=c;signal.addEventListener('abort',()=>c.error(signal.reason),{once:true});}}),{headers:{'content-type':'text/event-stream'}});
 };
 try{
  const pending=completion(request.messages,undefined,new AbortController().signal,undefined,{purpose:'review',responseFormat:{type:'json_object'},allowFormatFallback:true});
  const rejected=assert.rejects(pending,e=>e.code==='model_timeout'&&e.timeoutKind==='total');await nextTick();
  let elapsed=idleMs/2;
  while(elapsed<totalMs){body.enqueue(Buffer.from(': keep-alive\n\n'));await nextTick();const step=Math.min(idleMs/2,totalMs-elapsed);t.mock.timers.tick(step);elapsed+=step;}
  await rejected;assert.equal(calls,2);
 }finally{globalThis.fetch=oldFetch;}
});

test('completion waiting notifications preserve Gateway synchronous callback enforcement',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});const oldFetch=globalThis.fetch;
 try{
  for(const onWaiting of [async()=>{},async()=>{throw new Error('private waiting callback');}]){
   let body,cancelled=false;
   globalThis.fetch=async()=>new Response(new ReadableStream({start(c){body=c;},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}});
   const pending=completion(request.messages,undefined,new AbortController().signal,undefined,{onWaiting});
   const rejected=reject(pending,'callback_error');await nextTick();
   t.mock.timers.tick(60000);
   body.enqueue(Buffer.from(': keep-alive\n\ndata: {"choices":[{"delta":{"content":"answer"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
   await rejected;assert.equal(cancelled,true);
   await nextTick();
  }
 }finally{globalThis.fetch=oldFetch;}
});

test('format fallback callback failures stop negotiation safely before another model request',async()=>{
 const oldFetch=globalThis.fetch;
 try{
  for(const onFormatFallback of [async()=>{},async()=>{throw new Error('private format callback');},()=>{throw new Error('private format callback');}]){
   let calls=0;
   globalThis.fetch=async()=>++calls===1?Response.json({error:{message:'response_format unsupported'}},{status:400}):json('{}');
   await assert.rejects(completion(request.messages,undefined,new AbortController().signal,undefined,{purpose:'review',responseFormat:{type:'json_object'},allowFormatFallback:true,onFormatFallback}),error=>{
    assert.equal(error.category,'callback_error');assert.equal(error.cause,undefined);
    assert.doesNotMatch(error.message,/private format callback/);return true;
   });
   assert.equal(calls,1);await nextTick();
  }
  let calls=0;globalThis.fetch=async()=>{calls++;return json('{}');};
  await reject(completion(request.messages,undefined,undefined,undefined,{onFormatFallback:null}),'invalid_request');
  assert.equal(calls,0);
 }finally{globalThis.fetch=oldFetch;}
});
