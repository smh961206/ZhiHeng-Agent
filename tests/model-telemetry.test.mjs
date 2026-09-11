import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as nextTick} from 'node:timers/promises';
import {createModelGateway} from '../server/model-gateway.mjs';
import {legacyCompletionError} from '../server/model-gateway-result.mjs';
import {createModelCallRecorder,normalizeModelCall,summarizeModelCalls,withModelCallContext} from '../server/model-telemetry.mjs';
const env={LLM_API_KEY:'secret-key',LLM_BASE_URL:'https://model.invalid'};
const request={purpose:'research',messages:[{role:'user',content:'private-prompt'}],stream:false};
const reply=()=>Response.json({choices:[{message:{role:'assistant',content:'answer',reasoning_content:'private-reasoning'},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:4,total_tokens:14}});
test('Gateway records attributed started/terminal events and never prompt/reasoning/credentials',async()=>{
 const records=[];const gateway=createModelGateway({env,onModelCall:r=>records.push(r),fetchImpl:async()=>reply()});
 await withModelCallContext('job-one',()=>gateway.complete(request));
 assert.equal(records.length,2);assert.equal(records[0].id,records[1].id);assert.equal(records[0].status,'started');
 assert.equal(records[1].status,'succeeded');assert.equal(records[1].profile,'legacy-analysis');assert.equal(records[1].purpose,'research');assert.equal(records[1].jobId,'job-one');
 assert.deepEqual(records[1].usage,{inputTokens:10,outputTokens:4,totalTokens:14,cachedInputTokens:null});
 assert.equal(records[1].tokenSources.inputTokens,'provider');assert.equal(records[1].tokenSources.cachedInputTokens,'unknown');assert.equal(records[1].billing,null);
 assert.doesNotMatch(JSON.stringify(records),/private|secret|model.invalid|answer/);
});
test('concurrent async job contexts remain isolated and non-job calls stay unattributed',async()=>{
 const records=[];const gateway=createModelGateway({env,onModelCall:r=>records.push(r),fetchImpl:async()=>reply()});
 await Promise.all(['a','b'].map(id=>withModelCallContext(id,()=>gateway.complete(request))));await gateway.complete(request);
 assert.deepEqual(records.filter(r=>r.status==='succeeded').map(r=>r.jobId).sort(),[null,'a','b'].sort());
});
test('failed and preflight calls retain safe categories and unknown usage',async()=>{
 const records=[];const gateway=createModelGateway({env,onModelCall:r=>records.push(r),fetchImpl:async()=>new Response('secret-error',{status:503})});
 await assert.rejects(gateway.complete(request),{category:'provider_unavailable'});
 assert.equal(records.at(-1).errorCategory,'provider_unavailable');assert.equal(records.at(-1).usage.totalTokens,null);
 await assert.rejects(gateway.complete({...request,stream:null}));assert.equal(records.at(-1).status,'failed');assert.equal(records.at(-1).profile,'legacy-analysis');
 assert.doesNotMatch(JSON.stringify(records),/secret-error/);
});
test('summary preserves unknown totals and currencies without counting absence as zero',()=>{
 const summary=summarizeModelCalls([{status:'succeeded',errorCategory:null,usage:{inputTokens:10},billing:{currency:'USD',estimatedCost:0.1}}, {status:'failed',errorCategory:'network'}]);
 assert.deepEqual(summary.usage.inputTokens,{knownTotal:10,unknownCalls:1});assert.equal(summary.usage.totalTokens.knownTotal,null);
 assert.equal(summary.unknownBillingCalls,1);assert.deepEqual(summary.billing,[{currency:'USD',knownEstimatedCost:0.1}]);
 assert.doesNotMatch(JSON.stringify(normalizeModelCall({prompt:'private',reasoning_content:'private',apiKey:'private'})),/private/);
});
test('telemetry errors and noncooperative sinks are bounded without replaying research',async()=>{
 const warnings=[],oldWarn=console.warn;console.warn=text=>warnings.push(text);
 try{
  const recorder=createModelCallRecorder({sink:()=>new Promise(()=>{}),timeoutMs:5});await recorder.start('research','legacy-analysis');
  let calls=0;const gateway=createModelGateway({env,onModelCall:async()=>{throw Error('secret');},fetchImpl:async()=>{calls++;return reply();}});
  assert.equal((await gateway.complete(request)).message.content,'answer');assert.equal(calls,1);assert.equal(warnings.length,3);assert.ok(warnings.every(w=>!w.includes('secret')));
 }finally{console.warn=oldWarn;}
});
test('cancellation while the terminal record is written is still returned to the caller',async()=>{
 const controller=new AbortController();let calls=0;
 const gateway=createModelGateway({env,onModelCall:r=>{if(r.status==='succeeded')controller.abort();},fetchImpl:async()=>{calls++;return reply();}});
 await assert.rejects(gateway.complete({...request,signal:controller.signal}),{category:'aborted'});assert.equal(calls,1);
});
test('terminal-write cancellation preserves both supported timeout reasons and legacy recovery codes',async()=>{
 for(const reason of [Object.assign(new Error('private-timeout'),{code:'model_timeout'}),new DOMException('private-timeout','TimeoutError')]){
  const controller=new AbortController();let calls=0;
  const gateway=createModelGateway({env,onModelCall:r=>{if(r.status==='succeeded')controller.abort(reason);},fetchImpl:async()=>{calls++;return reply();}});
  await assert.rejects(gateway.complete({...request,signal:controller.signal}),error=>{
   assert.equal(error.category,'timeout');assert.equal(error.code,'model_gateway_timeout');assert.equal(error.retryable,true);assert.equal(legacyCompletionError(error).code,'model_timeout');assert.doesNotMatch(error.message,/private-timeout/);return true;
  });assert.equal(calls,1);
 }
});
test('preflight telemetry retains known purpose, selected profile and routing mode without guessing a profile',async()=>{
 const records=[];let calls=0;
 const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:'dry-run'},onModelCall:r=>records.push(r),fetchImpl:async()=>{calls++;return reply();}});
 await assert.rejects(gateway.complete({...request,stream:null}),{category:'invalid_request'});
 assert.equal(records.length,1);assert.equal(records[0].purpose,'research');assert.equal(records[0].profile,'legacy-analysis');
 assert.equal(records[0].routingMode,'dry-run');assert.equal(records[0].policyVersion,1);assert.equal(records[0].status,'failed');
 await assert.rejects(gateway.complete({...request,routingContext:{profileId:'private-unknown-profile'}}),{category:'configuration'});
 assert.equal(records[1].purpose,'research');assert.equal(records[1].profile,null);assert.equal(records[1].routingMode,'dry-run');
 assert.equal(calls,0);assert.doesNotMatch(JSON.stringify(records),/private/);
});
test('terminal telemetry uses the dispatched signal even if the caller removes or replaces it',async()=>{
 for(const replace of [input=>{delete input.signal;},input=>{input.signal=new AbortController().signal;}]){
  const controller=new AbortController(),input={...request,signal:controller.signal};let calls=0;
  const gateway=createModelGateway({env,fetchImpl:async()=>{calls++;return reply();},onModelCall:record=>{
   if(record.status==='succeeded'){replace(input);controller.abort(Object.assign(Error('private-deadline'),{code:'model_timeout'}));}
  }});
  await assert.rejects(gateway.complete(input),{category:'timeout'});assert.equal(calls,1);
 }
});
test('an unrelated signal assigned during terminal telemetry cannot cancel the dispatched call',async()=>{
 const input={...request};let calls=0;
 const gateway=createModelGateway({env,fetchImpl:async()=>{calls++;return reply();},onModelCall:record=>{
  if(record.status==='succeeded')input.signal=AbortSignal.abort();
 }});
 assert.equal((await gateway.complete(input)).message.content,'answer');assert.equal(calls,1);
});
test('terminal telemetry cannot expose a newly installed signal getter exception',async()=>{
 const input={...request};let calls=0;
 const gateway=createModelGateway({env,fetchImpl:async()=>{calls++;return reply();},onModelCall:record=>{
  if(record.status==='succeeded')Object.defineProperty(input,'signal',{get(){throw Error('private-caller-state');}});
 }});
 assert.equal((await gateway.complete(input)).message.content,'answer');assert.equal(calls,1);
});
test('summary separates currencies and explicit zero from missing usage and billing',()=>{
 const summary=summarizeModelCalls([
  {status:'succeeded',errorCategory:null,usage:{inputTokens:0,outputTokens:0,totalTokens:0,cachedInputTokens:0},billing:{currency:'USD',estimatedCost:0}},
  {status:'succeeded',errorCategory:null,usage:{inputTokens:10,outputTokens:4,totalTokens:14},billing:{currency:'CNY',estimatedCost:2}},
  {status:'failed',errorCategory:'network'},
 ]);
 assert.deepEqual(summary.byStatus,{started:0,succeeded:2,failed:1,cancelled:0});
 assert.deepEqual(summary.usage.totalTokens,{knownTotal:14,unknownCalls:1});
 assert.deepEqual(summary.usage.cachedInputTokens,{knownTotal:0,unknownCalls:2});
 assert.equal(summary.unknownBillingCalls,1);
 assert.deepEqual(summary.billing,[{currency:'CNY',knownEstimatedCost:2},{currency:'USD',knownEstimatedCost:0}]);
 assert.equal(summarizeModelCalls([]).usage.totalTokens.knownTotal,null);
});
test('late rejection of a timed-out telemetry write is consumed and later writes still work',async()=>{
 const oldWarn=console.warn,warnings=[],records=[];let rejectLate;
 console.warn=message=>warnings.push(message);
 try{
  const recorder=createModelCallRecorder({timeoutMs:5,sink:record=>{
   if(record.status==='started')return new Promise((_,reject)=>{rejectLate=reject;});
   records.push(record);
  }});
  await recorder.start('research','legacy-analysis');
  rejectLate(Error('private-late-storage-error'));await nextTick();
  await recorder.finish({usage:{inputTokens:0,totalTokens:0}},null);
  assert.deepEqual(warnings,['Model telemetry write unavailable']);
  assert.equal(records.length,1);assert.equal(records[0].status,'succeeded');assert.equal(records[0].usage.totalTokens,0);
  assert.doesNotMatch(JSON.stringify(records),/private-late-storage-error/);
 }finally{console.warn=oldWarn;}
});
