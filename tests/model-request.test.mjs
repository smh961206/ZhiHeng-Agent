import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchModel} from '../server/model-request.mjs';
import {completion} from '../server/agent.mjs';
const url='https://model.example/chat/completions';
const networkError=code=>new TypeError('fetch failed',{cause:Object.assign(new Error('private request details'),{code})});

test('transient connection errors retry the same request with bounded backoff',async()=>{
 let calls=0;const waits=[],events=[],request={method:'POST',body:'same model request'};
 const response=await fetchModel(url,request,{fetchImpl:async(_url,options)=>{
  assert.equal(options,request);if(++calls<3)throw networkError('ECONNRESET');return Response.json({ok:true});
 },wait:async ms=>waits.push(ms),onRetry:event=>events.push(event.attempt)});
 assert.deepEqual(await response.json(),{ok:true});assert.equal(calls,3);
 assert.deepEqual(waits,[1000,2000]);assert.deepEqual(events,[2,3]);
});

test('exhaustion preserves a useful error without leaking transport details',async()=>{
 let calls=0;
 await assert.rejects(fetchModel(url,{}, {fetchImpl:async()=>{calls++;throw networkError('ENOTFOUND');},wait:async()=>{}}),error=>{
  assert.equal(error.code,'model_network');assert.match(error.message,/域名解析失败.*3次/);
  assert.ok(!error.message.includes('private'));return true;
 });assert.equal(calls,3);
});

test('certificate errors and HTTP responses never enter the connection retry loop',async()=>{
 let calls=0;
 await assert.rejects(fetchModel(url,{}, {fetchImpl:async()=>{calls++;throw networkError('CERT_HAS_EXPIRED');},wait:()=>assert.fail('must not retry TLS errors')}),/安全连接校验失败/);
 assert.equal(calls,1);
 for(const status of [400,401,403,429,503]){
  calls=0;const result=await fetchModel(url,{}, {fetchImpl:async()=>{calls++;return new Response('',{status});},wait:()=>assert.fail('HTTP policy is handled by the caller')});
  assert.equal(result.status,status);assert.equal(calls,1);
 }
});

test('nested connection causes are retryable and cancellation ends backoff',async()=>{
 const control=new AbortController();let calls=0;
 const aggregate=new TypeError('fetch failed',{cause:new AggregateError([Object.assign(new Error('reset'),{code:'ECONNRESET'})])});
 await assert.rejects(fetchModel(url,{signal:control.signal},{fetchImpl:async()=>{calls++;throw aggregate;},onRetry:()=>control.abort()}),{name:'AbortError'});
 assert.equal(calls,1);
 await assert.rejects(fetchModel(url,{signal:control.signal},{fetchImpl:()=>assert.fail('already cancelled')}),{name:'AbortError'});
 const timeout=new AbortController();timeout.abort(new DOMException('deadline','TimeoutError'));
 await assert.rejects(fetchModel(url,{signal:timeout.signal},{fetchImpl:()=>assert.fail('expired deadline')}),/模型服务连接超时/);
});

test('completion recovers a connection failure, but does not replay a broken stream',async()=>{
 const original=global.fetch;let calls=0;const events=[];
 try{
  global.fetch=async()=>{if(++calls===1)throw networkError('ECONNRESET');return Response.json({choices:[{message:{role:'assistant',content:'recovered'}}]});};
  assert.equal((await completion([{role:'user',content:'synthetic'}],undefined,new AbortController().signal,undefined,{onRetry:event=>events.push(event.attempt)})).content,'recovered');
  assert.equal(calls,2);assert.deepEqual(events,[2]);
  calls=0;
  global.fetch=async()=>{calls++;return new Response(new ReadableStream({start(controller){controller.error(networkError('UND_ERR_SOCKET'));}}),{headers:{'content-type':'text/event-stream'}});};
  await assert.rejects(completion([{role:'user',content:'synthetic'}],undefined,new AbortController().signal),/fetch failed/);
  assert.equal(calls,1,'received streams cannot be replayed by connection retries');
 }finally{global.fetch=original;}
});
