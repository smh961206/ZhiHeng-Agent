import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createModelGateway,ModelGatewayError} from '../server/model-gateway.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
import {normalizeUsage,estimateBilling} from '../server/model-gateway-result.mjs';

const env={LLM_API_KEY:'analysis-secret',LLM_BASE_URL:'https://analysis.invalid',LLM_MODEL:'deepseek-fixture',LLM_VISION_API_KEY:'vision-secret',LLM_VISION_BASE_URL:'https://vision.invalid'};
const request={purpose:'research',messages:[{role:'user',content:'fixture'}]};
const json=(message={role:'assistant',content:'answer'},finish='stop',usage)=>new Response(JSON.stringify({choices:[{message,finish_reason:finish}],...(usage!==undefined?{usage}:{})}),{headers:{'content-type':'application/json'}});
const frame=(delta={},finish=null)=>'data: '+JSON.stringify({choices:[{index:0,delta,finish_reason:finish}]})+'\n\n';
const done='data: [DONE]\n\n';
const sse=text=>new Response(text,{headers:{'content-type':'text/event-stream'}});
const gateway=options=>createModelGateway({env,...options});
const rejects=(promise,category)=>assert.rejects(promise,error=>error instanceof ModelGatewayError&&error.category===category);

test('Gateway consumes a read rejection when the stream cancels synchronously during reader.read',()=>{
 const source=`
  import assert from 'node:assert/strict';
  import {setImmediate as nextTick} from 'node:timers/promises';
  import {createModelGateway} from ${JSON.stringify(new URL('../server/model-gateway.mjs',import.meta.url).href)};
  for(const type of ['application/json','text/event-stream'])for(const timeout of [false,true]){
   const control=new AbortController();let response,reads=0,fetches=0;
   const g=createModelGateway({env:{LLM_API_KEY:'synthetic',LLM_BASE_URL:'https://model.invalid'},fetchImpl:async()=>{
    fetches++;
    response=new Response(new ReadableStream({pull(c){
     reads++;control.abort(timeout?new DOMException('synthetic timeout','TimeoutError'):undefined);
     c.error(new Error('synthetic read failure'));
    }},{highWaterMark:0}),{headers:{'content-type':type}});
    return response;
   }});
   await assert.rejects(g.complete({purpose:'research',messages:[{role:'user',content:'synthetic'}],signal:control.signal}),e=>e.category===(timeout?'timeout':'aborted'));
   await nextTick();
   assert.equal(reads,1);assert.equal(fetches,1);assert.equal(response.body.locked,false);
  }
 `;
 // A leaked rejection must fail the child process, never a test-runner handler.
 const child=spawnSync(process.execPath,['--unhandled-rejections=strict','--input-type=module','-e',source],{encoding:'utf8',timeout:10000});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
});

test('Gateway stops buffered notifications immediately when a callback cancels the request',async()=>{
 for(const format of ['json','sse'])for(const trigger of format==='json'?['onActivity','onDelta']:['onHeartbeat','onActivity','onDelta']){
  const control=new AbortController(),events=[];let cancelled=false,fetches=0;
  const payload=format==='json'?JSON.stringify({choices:[{message:{role:'assistant',content:'first'},finish_reason:'stop'}]}):': keep-alive\n\n'+frame({content:'first'})+frame({content:'later'},'stop')+done;
  const g=gateway({fetchImpl:async()=>{
   fetches++;
   return new Response(new ReadableStream({start(c){c.enqueue(Buffer.from(payload));if(format==='json')c.close();},cancel(){cancelled=true;}}),{headers:{'content-type':format==='json'?'application/json':'text/event-stream'}});
  }});
  const callbacks=Object.fromEntries(['onHeartbeat','onActivity','onDelta'].map(name=>[name,()=>{events.push(name);if(name===trigger)control.abort();}]));
  await rejects(g.complete({...request,signal:control.signal,...callbacks}),'aborted');
  const expected=format==='json'?['onActivity','onDelta']:['onHeartbeat','onActivity','onDelta'];
  assert.deepEqual(events,expected.slice(0,expected.indexOf(trigger)+1),format+' cancellation in '+trigger);
  assert.equal(fetches,1);if(format==='sse')assert.equal(cancelled,true);
 }
});

test('Gateway normalizes JSON, safe usage and metadata without changing legacy analysis wire defaults',async()=>{
 let body;const deltas=[];
 const g=gateway({fetchImpl:async(url,options)=>{
  assert.equal(url.href,'https://analysis.invalid/chat/completions');assert.equal(options.headers.Authorization,'Bearer analysis-secret');assert.equal(options.redirect,'error');
  body=JSON.parse(options.body);return json({role:'assistant',content:'answer',reasoning_content:'private-secret',provider_secret:'do-not-copy'},'stop',{prompt_tokens:10,completion_tokens:3,total_tokens:13,provider_secret:'do-not-copy'});
 }});
 const result=await g.complete({...request,stream:false,onDelta:d=>deltas.push(d)});
 assert.deepEqual(body,{model:env.LLM_MODEL,messages:request.messages,stream:false});
 assert.deepEqual(result.message,{role:'assistant',content:'answer'});
 assert.equal(result.profile,'legacy-analysis');assert.equal(result.provider,null);assert.equal(result.model,env.LLM_MODEL);assert.equal(result.tier,'legacy');
 assert.deepEqual(result.usage,{inputTokens:10,outputTokens:3,totalTokens:13,cachedInputTokens:null});assert.equal(result.billing,null);
 assert.deepEqual(deltas,['answer']);assert.ok(result.performance.latencyMs>=0);assert.ok(result.performance.ttftMs>=0);
 assert.doesNotMatch(JSON.stringify(result),/private-secret|do-not-copy|analysis-secret/);
 assert.equal(g.getContinuationMessage(result).reasoning_content,'private-secret');
 const privateCopy=g.getContinuationMessage(result);privateCopy.content='changed';assert.equal(g.getContinuationMessage(result).content,'answer');
 assert.throws(()=>gateway({}).getContinuationMessage(result),/参数无效/);
});

test('Gateway reuses split UTF-8 SSE and tool-fragment assembly while keeping reasoning private',async()=>{
 const text=frame({reasoning_content:'private-only'})+frame({content:'现金流'})+frame({tool_calls:[{index:0,id:'call_1',type:'function',function:{name:'calculate',arguments:'{"x":'}}]})+frame({tool_calls:[{index:0,function:{arguments:'1}'}}]},'tool_calls')+'data: '+JSON.stringify({choices:[],usage:{prompt_tokens:4,completion_tokens:6,total_tokens:10}})+'\n\n'+done;
 const bytes=Buffer.from(text),deltas=[];let tick=0;
 const g=gateway({now:()=>++tick,fetchImpl:async()=>new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=2)c.enqueue(bytes.subarray(i,i+2));c.close();}}),{headers:{'content-type':'text/event-stream'}})});
 const result=await g.complete({...request,onDelta:d=>deltas.push(d)});
 assert.equal(deltas.join(''),'现金流');assert.equal(result.finishReason,'tool_calls');
 assert.deepEqual(result.message.tool_calls,[{id:'call_1',type:'function',function:{name:'calculate',arguments:'{"x":1}'}}]);
 assert.equal(result.usage.totalTokens,10);assert.equal(result.performance.ttftMs,1);assert.ok(result.performance.latencyMs>=1);
 assert.doesNotMatch(JSON.stringify(result),/private-only|reasoning_content/);assert.equal(g.getContinuationMessage(result).reasoning_content,'private-only');
});

test('Gateway preserves tool and response-format requests without enabling analysis thinking implicitly',async()=>{
 const tools=[{type:'function',function:{name:'calculate',parameters:{type:'object'}}}],responseFormat={type:'json_object'};
 const g=gateway({fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.stream,true);assert.deepEqual(body.tools,tools);assert.equal(body.tool_choice,'auto');assert.deepEqual(body.response_format,responseFormat);assert.equal(body.thinking,undefined);
  return sse(frame({content:'{}'},'stop')+done);
 }});
 assert.equal((await g.complete({...request,purpose:'review',tools,responseFormat})).message.content,'{}');
});

test('Gateway retains router and Vision model/base/key and legacy reasoning semantics',async()=>{
 for(const purpose of ['router','vision']){
  const routed={...env,LLM_ROUTER_MODEL:'deepseek-router'};let body;
  const g=createModelGateway({env:routed,fetchImpl:async(url,options)=>{
   body=JSON.parse(options.body);assert.equal(url.origin,purpose==='vision'?'https://vision.invalid':'https://analysis.invalid');assert.equal(options.headers.Authorization,purpose==='vision'?'Bearer vision-secret':'Bearer analysis-secret');return json();
  }});
  const result=await g.complete({purpose,messages:[{role:'user',content:purpose==='vision'?[{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]:'fixture'}]});
  assert.equal(body.model,purpose==='vision'?'deepseek-flash':'deepseek-router');assert.equal(body.max_tokens,purpose==='vision'?6000:400);assert.equal(body.stream,false);assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(result.profile,'legacy-'+purpose);
 }
});

test('Gateway rejects invalid requests and disallowed capabilities before fetch',async()=>{
 let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return json();}});
 for(const change of [{purpose:'judge'},{messages:[]},{stream:'yes'},{signal:{}},{maxOutputTokens:0},{reasoningEffort:'invented'}])await rejects(g.complete({...request,...change}),'invalid_request');
 await rejects(g.complete({...request,messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]}]}),'unsupported_capability');
 await rejects(g.complete({...request,purpose:'router',stream:true}),'unsupported_capability');
 await rejects(g.complete({...request,reasoningEffort:'high'}),'unsupported_capability');
 await rejects(g.complete({...request,routingContext:{profileId:'legacy-vision'}}),'configuration');
 await rejects(g.complete({...request,purpose:'vision'}),'invalid_request');
 const cyclic={role:'user',content:'fixture'};cyclic['private-property']=cyclic;
 await rejects(g.complete({...request,messages:[cyclic]}),'invalid_request');
 await rejects(g.complete({...request,tools:[{type:'function',function:{name:'fixture',parameters:{invalid:1n}}}]}),'invalid_request');
 for(const capability of ['textInput','reasoningControl']){
  const catalog=structuredClone(createLegacyModelCatalog(env));catalog.profiles[0].capabilities[capability]=false;
  await rejects(gateway({catalog,fetchImpl:async()=>{calls++;return json();}}).complete({...request,reasoningEffort:'off'}),'unsupported_capability');
 }
 assert.equal(calls,0);
});

test('Gateway rejects credentials in URLs, insecure remote transport and missing keys before fetch',async()=>{
 let calls=0;
 for(const base of ['https://user:secret@host.invalid','http://remote.invalid','https://host.invalid?token=secret','invalid','https://host.invalid/#secret']){
  const g=createModelGateway({env:{...env,LLM_BASE_URL:base},fetchImpl:async()=>{calls++;return json();}});
  await rejects(g.complete(request),'configuration');
 }
 await rejects(createModelGateway({env:{},fetchImpl:async()=>{calls++;return json();}}).complete(request),'configuration');assert.equal(calls,0);
 const local=createModelGateway({env:{...env,LLM_BASE_URL:'http://127.0.0.1:1234/v1'},fetchImpl:async()=>json()});
 assert.equal((await local.complete(request)).message.content,'answer');
});

test('Gateway classifies HTTP errors without leaking response details or retrying HTTP statuses',async()=>{
 const unknown=new ModelGatewayError('analysis-secret','private-status');
 assert.equal(unknown.category,'malformed_response');assert.equal(unknown.status,null);assert.doesNotMatch(JSON.stringify(unknown),/analysis-secret|private-status/);
 for(const [status,category,retryable] of [[401,'authentication',false],[403,'authentication',false],[429,'rate_limit',true],[500,'provider_unavailable',true],[503,'provider_unavailable',true],[400,'provider_request',false]]){
  let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return new Response('analysis-secret private-reason',{status});}});
  await assert.rejects(g.complete(request),error=>{assert.equal(error.category,category);assert.equal(error.status,status);assert.equal(error.retryable,retryable);assert.doesNotMatch(String(error)+JSON.stringify(error),/analysis-secret|private-reason/);assert.equal(error.cause,undefined);return true;});assert.equal(calls,1);
 }
});

test('Gateway reports unsupported output format without silently downgrading validation',async()=>{
 for(const [message,code,category] of [['response_format not supported','unsupported_parameter','format_unsupported'],['invalid json schema','invalid_json_schema','provider_request']]){
  let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return new Response(JSON.stringify({error:{message,code,param:'response_format'}}),{status:400});}});
  await rejects(g.complete({...request,purpose:'review',responseFormat:{type:'json_object'}}),category);assert.equal(calls,1);
 }
});

test('Gateway preserves pre-response network retries and sanitizes exhausted failures',async()=>{
 let calls=0;const waits=[];
 const g=gateway({wait:async ms=>waits.push(ms),fetchImpl:async()=>{if(++calls<3)throw Object.assign(new Error('private endpoint'),{code:'ECONNRESET'});return json();}});
 await g.complete(request);assert.equal(calls,3);assert.deepEqual(waits,[1000,2000]);
 calls=0;const failed=gateway({wait:async()=>{},fetchImpl:async()=>{calls++;throw Object.assign(new Error('analysis-secret'),{code:'ECONNRESET'});}});
 await rejects(failed.complete(request),'network');assert.equal(calls,3);
 for(const purpose of ['router','vision']){
  calls=0;
  const messages=[{role:'user',content:purpose==='vision'?[{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]:'fixture'}];
  await rejects(failed.complete({purpose,messages}),'network');assert.equal(calls,1);
 }
});

test('Gateway rejects malformed, truncated and refused responses without retrying partial output',async()=>{
 const cases=[
  [()=>new Response('not-json'),'malformed_response'],[()=>json({role:'assistant',content:'partial'},'length'),'truncated'],
  [()=>json({role:'assistant',content:'',refusal:'private-refusal'}),'refusal'],[()=>json({role:'assistant',content:'partial'},'content_filter'),'refusal'],
  [()=>sse(frame({content:'partial'})),'truncated'],[()=>sse(frame({content:'partial'})+done),'truncated'],
  [()=>sse(frame({refusal:'private-refusal'})+frame({},'stop')+done),'refusal'],
  [()=>sse(frame({tool_calls:[{index:12,id:'bad',function:{name:'bad',arguments:'{}'}}]},'tool_calls')+done),'malformed_response'],
  [()=>sse(frame({tool_calls:[{index:0,id:'bad',function:{name:'bad',arguments:{private:'secret'}}}]},'tool_calls')+done),'malformed_response'],
  [()=>sse(frame({content:'first'},'stop')+frame({content:'after-finish'})+done),'malformed_response'],
  [()=>json({role:'assistant',content:'',tool_calls:[{id:'bad',type:'function',function:{name:'bad',arguments:{}}}]},'tool_calls'),'malformed_response'],
  [()=>json({role:'assistant',content:''}),'malformed_response'],
 ];
 for(const [response,category] of cases){let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return response();}});await rejects(g.complete(request),category);assert.equal(calls,1);}
});

test('Gateway bounds JSON and Vision response sizes and cancels oversized bodies',async()=>{
 let cancelled=false;
 const response=()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(8_000_001));},cancel(){cancelled=true;}}));
 await rejects(gateway({fetchImpl:async()=>response()}).complete(request),'response_too_large');assert.equal(cancelled,true);
 const g=gateway({fetchImpl:async()=>json({role:'assistant',content:'x'.repeat(18001)})});
 await rejects(g.complete({purpose:'vision',messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]}]}),'malformed_response');
});

test('Gateway aborts before fetch and while reading a stalled body without losing cancellation',async()=>{
 const control=new AbortController();control.abort(new Error('private abort detail'));let calls=0;
 await rejects(gateway({fetchImpl:async()=>{calls++;return json();}}).complete({...request,signal:control.signal}),'aborted');assert.equal(calls,0);
 let cancelled=false,ready;const started=new Promise(r=>{ready=r;});
 const active=new AbortController();
 const g=gateway({fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(Buffer.from(frame({content:'partial'})));},cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}})});
 const pending=g.complete({...request,signal:active.signal,onDelta:()=>ready()});await started;active.abort();await rejects(pending,'aborted');assert.equal(cancelled,true);
});

test('Gateway deadline expires stalled fetch/read, disposes timers and honors keepalive without extending total',async()=>{
 for(const stage of ['fetch','read']){
  const timers=new Map();let next=0,ready;const started=new Promise(r=>{ready=r;});
  const g=gateway({setTimer:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},clearTimer:id=>timers.delete(id),fetchImpl:async()=>{
   ready();if(stage==='fetch')return new Promise(()=>{});
   return new Response(new ReadableStream({start(c){c.enqueue(Buffer.from(': keep-alive\n\n'));}}),{headers:{'content-type':'text/event-stream'}});
  }});
  const pending=g.complete(request);await started;await new Promise(r=>setImmediate(r));
  assert.equal(timers.size,2);const total=[...timers.values()].find(t=>t.ms===1800000);assert.ok(total);total.fn();
  await rejects(pending,'timeout');assert.equal(timers.size,0);
 }
});

test('Gateway propagates external TimeoutError distinctly and sanitizes output callback failures',async()=>{
 const control=new AbortController();control.abort(new DOMException('private-timeout','TimeoutError'));
 await rejects(gateway({fetchImpl:async()=>json()}).complete({...request,signal:control.signal}),'timeout');
 await rejects(gateway({fetchImpl:async()=>json()}).complete({...request,onDelta:()=>{throw new Error('private callback');}}),'callback_error');
});

test('Gateway usage and billing retain missing values and distinguish zero rates from unknown pricing',async()=>{
 assert.deepEqual(normalizeUsage(undefined),{inputTokens:null,outputTokens:null,totalTokens:null,cachedInputTokens:null});
 const usage=normalizeUsage({prompt_tokens:100,completion_tokens:50,total_tokens:150,prompt_cache_hit_tokens:20});
 const price={currency:'USD',unit:'per-million-tokens',input:1,output:2,cacheRead:0.5};
 assert.deepEqual(estimateBilling(usage,price),{currency:'USD',estimatedCost:0.00019});
 assert.equal(estimateBilling({...usage,cachedInputTokens:null},price),null);
 assert.equal(estimateBilling(usage,{...price,cacheRead:null}),null);
 assert.equal(estimateBilling(usage,null),null);
 assert.deepEqual(estimateBilling(usage,{...price,input:0,output:0,cacheRead:0}),{currency:'USD',estimatedCost:0});
 assert.equal(normalizeUsage({prompt_tokens:-1,completion_tokens:Infinity,total_tokens:'3'}).inputTokens,null);
 assert.equal(normalizeUsage({prompt_tokens:1,prompt_cache_hit_tokens:2}).cachedInputTokens,null);
 assert.equal(normalizeUsage({prompt_tokens:1,completion_tokens:2,total_tokens:999}).totalTokens,null);
 const catalog=structuredClone(createLegacyModelCatalog(env));catalog.profiles[0].pricing=price;
 const g=gateway({catalog,fetchImpl:async()=>json(undefined,'stop',{prompt_tokens:100,completion_tokens:50,total_tokens:150,prompt_cache_hit_tokens:20})});
 assert.deepEqual((await g.complete(request)).billing,{currency:'USD',estimatedCost:0.00019});
});

test('Gateway closes received bodies at every tested fetch-to-reader cancellation handoff',async()=>{
 for(let depth=0;depth<13;depth++){
  let cancelled=false;const control=new AbortController();
  const abortAfter=n=>n?queueMicrotask(()=>abortAfter(n-1)):control.abort();
  const g=gateway({fetchImpl:async()=>{
   const response=new Response(new ReadableStream({cancel(){cancelled=true;}}));
   abortAfter(depth);return response;
  }});
  await rejects(g.complete({...request,signal:control.signal}),'aborted');
  await new Promise(r=>setImmediate(r));
  assert.equal(cancelled,true,'body must close at cancellation timing '+depth);
 }
});

test('Gateway never merges a different choice into the requested single completion',async()=>{
 const foreign='data: '+JSON.stringify({choices:[{index:1,delta:{content:'foreign'},finish_reason:'stop'}]})+'\n\n';
 for(const response of [
  ()=>sse(frame({content:'original'})+foreign+done),
  ()=>new Response(JSON.stringify({choices:[{index:1,message:{role:'assistant',content:'foreign'},finish_reason:'stop'}]})),
  ()=>sse('data: '+JSON.stringify({choices:[{index:0,delta:{content:'original'},finish_reason:'stop'},{index:1,delta:{content:'foreign'},finish_reason:'stop'}]})+'\n\n'+done),
  ()=>new Response(JSON.stringify({choices:[{index:0,message:{role:'assistant',content:'original'},finish_reason:'stop'},{index:1,message:{role:'assistant',content:'foreign'},finish_reason:'stop'}]})),
 ]){
  const deltas=[];await rejects(gateway({fetchImpl:async()=>response()}).complete({...request,onDelta:d=>deltas.push(d)}),'malformed_response');
  assert.ok(!deltas.join('').includes('foreign'));
 }
});

test('Gateway rejects asynchronous delta callbacks safely without unhandled rejections',async()=>{
 for(const onDelta of [async()=>{},async()=>{throw new Error('private async callback');}]){
  await rejects(gateway({fetchImpl:async()=>json()}).complete({...request,onDelta}),'callback_error');
 }
 await new Promise(r=>setImmediate(r));
});

test('Gateway classifies connection loss during JSON or SSE reads as network failure without replay',async()=>{
 for(const stream of [false,true]){
  let calls=0;const deltas=[];
  const g=gateway({fetchImpl:async()=>{
   calls++;return new Response(new ReadableStream({
    start(c){c.enqueue(Buffer.from(stream?frame({content:'partial'}):'{"choices":'));},
    pull(c){c.error(new TypeError('private terminated transport',{cause:{code:'UND_ERR_SOCKET'}}));},
   }),{headers:{'content-type':stream?'text/event-stream':'application/json'}});
  }});
  await rejects(g.complete({...request,stream,onDelta:d=>deltas.push(d)}),'network');
  assert.equal(calls,1);assert.deepEqual(deltas,stream?['partial']:[]);
 }
});

test('Gateway rejects invalid explicit profile selection without silently using the default',async()=>{
 let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return json();}});
 for(const routingContext of [{profileId:''},{profileId:' '},{profileId:null},{profileId:false},{profileId:0},null,false,'legacy-analysis',[]]){
  await rejects(g.complete({...request,routingContext}),'invalid_request');
 }
 await rejects(g.complete({...request,routingContext:{profileId:'missing-profile'}}),'configuration');
 assert.equal(calls,0);
 for(const routingContext of [undefined,{}, {profileId:undefined},{profileId:'legacy-analysis'}]){
  assert.equal((await g.complete({...request,routingContext})).profile,'legacy-analysis');
 }
 assert.equal(calls,4);
});

test('Gateway rejects sparse tool lists before they serialize to null entries',async()=>{
 let calls=0;const g=gateway({fetchImpl:async()=>{calls++;return json();}});
 const tool={type:'function',function:{name:'calculate',parameters:{type:'object'}}};
 for(const tools of [new Array(1),[tool,,],[,tool],[tool,null],[tool,undefined]]){
  await rejects(g.complete({...request,tools}),'invalid_request');
 }
 assert.equal(calls,0);
 await g.complete({...request,tools:[tool]});assert.equal(calls,1);
});

test('Gateway applies stream and token defaults only when options are omitted',async()=>{
 let calls=0;const bodies=[];
 const g=gateway({fetchImpl:async(_url,options)=>{calls++;bodies.push(JSON.parse(options.body));return json();}});
 for(const change of [{stream:null},{maxOutputTokens:null}]){
  await rejects(g.complete({...request,...change}),'invalid_request');
 }
 assert.equal(calls,0);
 await g.complete({...request,stream:undefined,maxOutputTokens:undefined});
 await g.complete({...request,stream:false,maxOutputTokens:1});
 assert.equal(bodies[0].stream,true);assert.equal(Object.hasOwn(bodies[0],'max_tokens'),false);
 assert.equal(bodies[1].stream,false);assert.equal(bodies[1].max_tokens,1);
});
