import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeModelCalls,publicModelCostSummary} from '../server/model-telemetry.mjs';
import {effectiveTaskCost} from '../server/model-telemetry.mjs';
import {compareEffectiveTaskCosts} from '../benchmark/statistics.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
const price={schemaVersion:1,version:'fixture',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:null,currency:'USD',unit:'per-million-tokens',input:2,output:8,cacheRead:0.2};
const request={purpose:'research',stream:false,messages:[{role:'user',content:'private-content'}]};
const response=()=>Response.json({choices:[{message:{role:'assistant',content:'ok'},finish_reason:'stop'}],usage:{prompt_tokens:1000000,completion_tokens:100000,prompt_tokens_details:{cached_tokens:500000}}});
test('Gateway snapshots dated prices and aggregates actual retried requests conservatively',async()=>{
 const env={LLM_API_KEY:'secret'},records=[];let requests=0;
 const catalog=createLegacyModelCatalog(env);const profiles=catalog.profiles.map(p=>({...p,pricing:price}));
 const gateway=createModelGateway({env,catalog:{profiles},wallNow:()=>price.effectiveFrom,wait:async()=>{},onModelCall:r=>records.push(r),fetchImpl:async()=>{if(++requests===1)throw new TypeError('fetch failed');return response();}});
 const result=await gateway.complete(request);assert.equal(result.billing.estimatedCost,1.9);assert.equal(result.cost.pricing.pricing.version,'fixture');
 const s=summarizeModelCalls(records);assert.equal(s.calls,1);assert.equal(s.costCoverage.transportAttempts,2);assert.equal(s.costCoverage.unpricedAttempts,1);assert.equal(s.costCoverage.complete,false);
 assert.equal(s.byPurpose[0].purpose,'research');assert.equal(s.byProfile[0].profile,'legacy-analysis');assert.equal(records.at(-1).transportAttempts,2);
 assert.doesNotMatch(JSON.stringify(records),/private-content|secret/);
});
test('effective task cost includes failed jobs, review loops and tool rounds with versioned formula',()=>{
 const job=(jobId,delivered,amount)=>({jobId,delivered,validationPassed:delivered,criticalErrors:0,toolRounds:3,modelCalls:['research','review'].map((purpose,i)=>({id:jobId+i,jobId,purpose,status:'succeeded',errorCategory:null,transportAttempts:1,billing:{currency:'USD',estimatedCost:amount}}))});
 const tasks=[job('a',true,1),job('b',false,2)];const result=effectiveTaskCost(tasks);
 assert.equal(result.estimatedCostPerDelivery,6);assert.equal(result.deliveryPassRate,0.5);assert.equal(result.toolRounds,6);assert.equal(result.qualityAccepted,false);
 assert.equal(effectiveTaskCost([job('a',false,1)]).estimatedCostPerDelivery,null);
 const unknown=structuredClone(tasks);unknown[1].modelCalls[0].billing=null;assert.equal(effectiveTaskCost(unknown).estimatedCostPerDelivery,null);
 const retry=structuredClone(tasks);retry[0].modelCalls[0].transportAttempts=2;assert.equal(effectiveTaskCost(retry).estimatedCostPerDelivery,null);
 assert.throws(()=>effectiveTaskCost([tasks[0],tasks[0]]));
 const comparison=compareEffectiveTaskCosts({baseline:tasks,candidate:[job('a',true,0.5),job('b',false,1)]});assert.equal(comparison.difference,-3);assert.equal(comparison.qualityAccepted,false);
});
test('aggregation deduplicates lifecycle/replay while rejecting conflicting terminal receipts',()=>{
 const call={id:'c',status:'succeeded',purpose:'review',transportAttempts:1,errorCategory:null,billing:{currency:'USD',estimatedCost:2}};
 const s=summarizeModelCalls([{...call,status:'started',billing:null},call,call]);assert.equal(s.calls,1);assert.equal(s.billing[0].knownEstimatedCost,2);assert.equal(s.costCoverage.complete,true);
 assert.throws(()=>summarizeModelCalls([call,{...call,billing:{currency:'USD',estimatedCost:3}}]),/Conflicting/);
 assert.equal(summarizeModelCalls([]).costCoverage.complete,false);
 assert.equal(summarizeModelCalls([call,{...call,id:'d',billing:{currency:'CNY',estimatedCost:2}}]).costCoverage.complete,false);
});
test('public cost summary exposes safe total and per-stage token baselines without prompt data',()=>{
 const rows=[{id:'a',status:'succeeded',purpose:'researcher',profile:'configured-researcher',transportAttempts:1,errorCategory:null,usage:{inputTokens:120,outputTokens:30,totalTokens:150,cachedInputTokens:80},billing:{currency:'USD',estimatedCost:.01}},
  {id:'b',status:'succeeded',purpose:'writer',profile:'configured-writer',transportAttempts:1,errorCategory:null,usage:{inputTokens:70,outputTokens:20,totalTokens:90,cachedInputTokens:null},billing:{currency:'USD',estimatedCost:.02},prompt:'private'}];
 const result=publicModelCostSummary(summarizeModelCalls(rows));
 assert.deepEqual(result.usage.inputTokens,{knownTotal:190,unknownCalls:0});assert.deepEqual(result.usage.outputTokens,{knownTotal:50,unknownCalls:0});
 assert.deepEqual(result.usage.cachedInputTokens,{knownTotal:80,unknownCalls:1});assert.equal(result.byPurpose.find(item=>item.purpose==='writer').usage.inputTokens.knownTotal,70);
 assert.doesNotMatch(JSON.stringify(result),/private|prompt/);
});
