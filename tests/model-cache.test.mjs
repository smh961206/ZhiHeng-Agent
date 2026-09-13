import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPrefixFingerprint} from '../server/model-cache.mjs';
import {modelCacheAnalytics} from '../server/model-cache.mjs';
import {cacheEligibility} from '../server/model-cache.mjs';
import {normalizeModelCall} from '../server/model-telemetry.mjs';
const profile={id:'main',model:'opaque',protocol:'openai-chat-completions'};
const request={purpose:'research',messages:[{role:'system',content:'private-system'},{role:'user',content:'private-company'}]};
test('prefix hash tracks stable dimensions without storing prompt or private continuation',()=>{
 const hash=r=>modelPrefixFingerprint(r,profile,'a'.repeat(64));const a=hash(request);
 assert.equal(a.prefixFingerprint.length,64);assert.deepEqual(hash({...request,messages:[request.messages[0],{role:'user',content:'another-company'},{role:'assistant',content:'text',reasoning_content:'private-reasoning'}]}),a);
 assert.notDeepEqual(hash({...request,reasoningEffort:'high'}),a);assert.notDeepEqual(hash({...request,tools:[{type:'function',function:{name:'search'}}]}),a);
 assert.notDeepEqual(modelPrefixFingerprint(request,profile,'b'.repeat(64)),a);
 assert.equal(hash({...request,messages:[request.messages[1]]}),null);
 assert.equal(hash({...request,messages:[request.messages[0],{role:'user',content:[{type:'image_url',image_url:{url:'private-image'}}]}]}),null);
 assert.doesNotMatch(JSON.stringify(normalizeModelCall({cache:{...a,prompt:'private'},reasoning_content:'private'})),/private/);
});
test('cache advantage needs enough observed text-only samples across independent jobs',()=>{
 const rows=Array.from({length:30},(_,i)=>record(String(i))),options={request,profile,connectionIdentity:'a'.repeat(64),asOf};
 assert.equal(cacheEligibility(rows,options).eligible,true);assert.equal(cacheEligibility(rows.slice(0,29),options).eligible,false);
 assert.equal(cacheEligibility(rows.map(r=>({...r,jobId:'one'})),options).eligible,false);
 assert.equal(cacheEligibility(rows.map(r=>({...r,usage:{inputTokens:100,cachedInputTokens:20}})),options).eligible,false);
 assert.equal(cacheEligibility(rows,{...options,connectionIdentity:'b'.repeat(64)}).eligible,false);
 assert.equal(cacheEligibility(rows,{...options,request:{...request,messages:[{role:'user',content:[{type:'image_url'}]}]}}).eligible,false);
 assert.equal(cacheEligibility([...rows,...Array.from({length:4},(_,i)=>record('missing'+i,{usage:null}))],options).eligible,false);
});
const asOf='2026-09-12T00:00:00.000Z';
const record=(id,extra={})=>({id,jobId:'job-'+id,profile:'main',status:'succeeded',errorCategory:null,transportAttempts:1,finishedAt:'2026-09-11T00:00:00.000Z',cache:modelPrefixFingerprint(request,profile,'a'.repeat(64)),usage:{inputTokens:100,cachedInputTokens:80},...extra});
test('analytics uses distinct observed calls, exact fingerprint/profile and bounded past window',()=>{
 const a=record('a'),b=record('b',{usage:{inputTokens:900,cachedInputTokens:0}}),unknown=record('u',{tokenSources:{cachedInputTokens:'estimated'}});
 const rows=modelCacheAnalytics([a,a,b,unknown,record('future',{finishedAt:'2026-09-13T00:00:00.000Z'}),record('old',{finishedAt:'2026-08-01T00:00:00.000Z'})],{asOf});
 assert.equal(rows.length,1);assert.equal(rows[0].samples,2);assert.equal(rows[0].unknownCalls,1);assert.equal(rows[0].observedHitRatio,0.5);assert.equal(rows[0].observedTokenRatio,0.08);assert.equal(rows[0].uniqueJobs,2);
 assert.equal(modelCacheAnalytics([record('u',{usage:null})],{asOf})[0].observedTokenRatio,null);
 assert.equal(modelCacheAnalytics([a,record('b',{profile:'other'})],{asOf}).length,2);
});
