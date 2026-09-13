import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFlagshipUsage} from '../server/model-drift.mjs';
test('V5.2.10 usage and currency cost alerts are read-only, count failures and keep missing observations unknown',()=>{
 const jobIds=Array.from({length:100},(_,n)=>'job-'+n);
 const call=(n)=>({id:'call-'+n,jobId:jobIds[n],purpose:n%2?'judge':'critical-review',status:'failed',transportAttempts:1,billing:{currency:'USD',estimatedCost:1}});
 const r=evaluateFlagshipUsage({jobIds,calls:Array.from({length:6},(_,n)=>call(n)),telemetryComplete:true,costLimits:{USD:5}});
 assert.equal(r.status,'alert');assert.ok(r.reasons.includes('exceptional_usage_rate_exceeded'));assert.ok(r.reasons.includes('exceptional_cost_exceeded_USD'));assert.equal(r.automaticReplacement,false);assert.equal(r.hardQuota,false);
 assert.equal(evaluateFlagshipUsage({jobIds,calls:[]}).status,'inconclusive');
 assert.equal(evaluateFlagshipUsage({jobIds,calls:[],telemetryComplete:true}).status,'stable');
 assert.equal(evaluateFlagshipUsage({jobIds,calls:[{...call(1),billing:null}],telemetryComplete:true}).status,'inconclusive');
 assert.equal(evaluateFlagshipUsage({jobIds,calls:[call(1),call(1)],telemetryComplete:true}).rareJobs,1);
 assert.throws(()=>evaluateFlagshipUsage({jobIds:[],calls:[call(1)]}));
 const mixed=[call(1),{...call(2),billing:{currency:'CNY',estimatedCost:99}}];assert.equal(evaluateFlagshipUsage({jobIds,calls:mixed,telemetryComplete:true,costLimits:{USD:10}}).reasons.length,0);
});
