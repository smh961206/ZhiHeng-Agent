import test from 'node:test';
import assert from 'node:assert/strict';
import {runCostBenchmark} from '../scripts/cost-benchmark.mjs';
test('frozen cost benchmark rejects cheap quality failures and unknown prices without any model calls',()=>{
 const result=runCostBenchmark();assert.equal(result.passed,true);assert.equal(result.rows.length,6);assert.equal(result.modelRequests,0);assert.equal(result.qualityAccepted,false);assert.equal(result.productionSavingsAccepted,false);
 assert.equal(result.rows[0].comparison.difference,-1);assert.ok(result.rows.slice(1).every(r=>!r.comparison.engineeringCostGate));
});
