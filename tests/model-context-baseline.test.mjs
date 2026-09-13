import test from 'node:test';
import assert from 'node:assert/strict';
import {modelContextBaseline} from '../scripts/model-context-baseline.mjs';

test('M1.1 tool baseline is automatic, makes no model calls and keeps every path at or below legacy size',()=>{
 const baseline=modelContextBaseline();assert.equal(baseline.manualReviewRequired,false);assert.equal(baseline.modelCalls,0);assert.equal(baseline.tokenEstimate,null);
 assert.equal(baseline.paths.length,6);assert.ok(baseline.total.characterReduction>0);
 for(const path of baseline.paths){assert.ok(path.afterTools<=path.beforeTools);assert.ok(path.afterCharacters<=path.beforeCharacters);if(path.mode!=='A')assert.ok(path.characterReduction>0);}
});
