import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUsageDetails,normalizeUsageProvenance} from '../server/model-gateway-result.mjs';
import {normalizeModelCall} from '../server/model-telemetry.mjs';
test('reasoning is an observed subset and contradictory cache/reasoning/total remains unknown',()=>{
 const raw={prompt_tokens:100,completion_tokens:40,total_tokens:140,prompt_tokens_details:{cached_tokens:80},completion_tokens_details:{reasoning_tokens:30}};
 const d=normalizeUsageDetails(raw);assert.equal(d.usage.reasoningTokens,30);assert.equal(d.usage.outputTokens,40);assert.equal(d.tokenSources.reasoningTokens,'provider');
 const bad=normalizeUsageDetails({...raw,total_tokens:9,prompt_cache_hit_tokens:90,completion_tokens_details:{reasoning_tokens:41}});
 assert.equal(bad.usage.cachedInputTokens,null);assert.equal(bad.usage.totalTokens,null);assert.equal(bad.usage.reasoningTokens,null);
 assert.ok(Object.values(normalizeUsageDetails(null).usage).every(v=>v===null));
});
test('estimated usage never becomes provider-observed after telemetry storage round trip',()=>{
 const d=normalizeUsageProvenance({inputTokens:100,outputTokens:0},{inputTokens:'estimated'});
 const call=normalizeModelCall({usage:d.usage,tokenSources:d.tokenSources,usageDetails:d});
 assert.equal(call.tokenSources.inputTokens,'estimated');assert.deepEqual(normalizeModelCall(JSON.parse(JSON.stringify(call))),call);
 assert.equal(normalizeUsageProvenance({inputTokens:5},{inputTokens:'unknown'}).usage.inputTokens,null);
 assert.equal(normalizeUsageProvenance({inputTokens:5},{inputTokens:'guessed'}).usage.inputTokens,null);
 assert.equal(normalizeUsageProvenance({inputTokens:5},null).usage.inputTokens,5);
});
