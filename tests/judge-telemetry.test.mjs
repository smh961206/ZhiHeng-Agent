import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeModelCall,summarizeFlagshipCalls} from '../server/model-telemetry.mjs';
import {publicJob} from '../server/job-stream.mjs';
test('V5.2.7 telemetry preserves rare-purpose attribution and unknown cost/value without private data',()=>{
 const c=normalizeModelCall({id:'j1',jobId:'job',purpose:'judge',profile:'flagship-judge',status:'succeeded',transportAttempts:1,flagship:{version:1,conflictType:'opposing_core_claim',reasoning_content:'SECRET',packet:'PRIVATE'},performance:{latencyMs:123},messages:'PRIVATE',reasoning_content:'SECRET'});
 assert.equal(c.purpose,'judge');assert.ok(!JSON.stringify(c).includes('SECRET'));assert.ok(!JSON.stringify(c).includes('PRIVATE'));
 const s=summarizeFlagshipCalls([c]);assert.equal(s.p95LatencyMs,123);assert.equal(s.summary.unknownBillingCalls,1);assert.equal(s.measuredDecisionValue,null);assert.equal(s.byConflict[0].type,'opposing_core_claim');
 const p=publicJob({status:'completed',input:{sources:[]},flagshipState:{secret:'PRIVATE'},modelState:undefined});assert.ok(!JSON.stringify(p).includes('PRIVATE'));assert.equal(p.flagshipState,undefined);
});
