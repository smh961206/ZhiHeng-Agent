import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCase,validateCases,categories} from '../benchmark/case.mjs';
export const sampleCase=()=>({version:1,id:'CASE-001',category:'deep_research',fixture:'source',fixtureVersion:'v1',cutoff:'2025-01-01T00:00:00Z',qualityCriticality:'critical',requiredCapabilities:['textInput'],expectedFacts:[{id:'revenue',value:null,period:'FY2024',currency:'USD',unit:'million',shareBasis:null,accountingScope:'consolidated',valuationBasis:null,sourceId:'annual',blockId:'table1',kind:'observation'}],expectedCitations:[],expectedToolBehavior:[],requiredValidations:['delivery'],forbiddenBehaviors:['missing_as_zero','hidden_reasoning']});
test('V5.0.0 case metadata preserves explicit missing values and immutable provenance',()=>{const c=sampleCase(),v=validateCase(c);c.expectedFacts[0].value=42;assert.equal(v.expectedFacts[0].value,null);assert.ok(Object.isFrozen(v.expectedFacts[0]));for(const category of categories)assert.equal(validateCase({...sampleCase(),category}).category,category);});
test('V5.0.0 rejects unknown taxonomy, aliases, non-JSON, missing basis and dates',()=>{
 for(const change of [c=>c.category='future',c=>delete c.expectedFacts[0].currency,c=>c.cutoff=null,c=>c.expectedFacts[0].value=NaN,c=>c.forbiddenBehaviors=['anything'],c=>c.requiredCapabilities=['unknown']]){const c=sampleCase();change(c);assert.throws(()=>validateCase(c),/Benchmark/);}
 assert.throws(()=>validateCases([sampleCase(),{...sampleCase(),id:'case-001'}]),/unique/);
 const c=sampleCase();Object.defineProperty(c,'id',{get(){throw Error('getter executed');},enumerable:true});assert.throws(()=>validateCase(c),/data properties/);
});
test('V5.0.0 cutoff rejects nonexistent dates and machine-local timestamps',()=>{for(const cutoff of ['2025-02-30T00:00:00Z','2025-01-01T00:00:00','2025-13-01T00:00:00Z'])assert.throws(()=>validateCase({...sampleCase(),cutoff}),/cutoff/);});
