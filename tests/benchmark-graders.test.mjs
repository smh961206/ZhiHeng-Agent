import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeCase} from '../benchmark/graders.mjs';
const fact={id:'f',value:null,period:'FY2024',currency:'USD',unit:'million',shareBasis:null,accountingScope:'consolidated',valuationBasis:null,sourceId:'S1',blockId:'B1',kind:'observation'};
const citation={sourceId:'S1',blockId:'B1',quote:'not reported'};
const c={version:1,id:'C1',category:'missing_conflict',fixture:'F1',fixtureVersion:'v1',cutoff:'2025-01-01T00:00:00Z',qualityCriticality:'critical',requiredCapabilities:['textInput'],expectedFacts:[fact],expectedCitations:[citation],expectedToolBehavior:[{name:'calculate',behavior:'required'},{name:'trade',behavior:'forbidden'}],requiredValidations:['delivery'],forbiddenBehaviors:['missing_as_zero','hidden_reasoning']};
const fixture={version:1,id:'F1',fixtureVersion:'v1',sources:[{id:'S1',publishedAt:'2024-12-01T00:00:00Z',blocks:[{id:'B1',text:'Revenue not reported'}]}],counterEvidence:[citation]};
const output=()=>({facts:[structuredClone(fact)],citations:[citation],tools:[{name:'calculate',status:'completed'}],validations:[{id:'delivery',passed:true}],counterEvidence:[citation],violations:[],delivered:true});
test('V5.0.2 deterministic quality accepts exact explicit missing/basis/evidence contract',()=>{assert.equal(gradeCase(c,fixture,output()).passed,true);});
test('V5.0.2 financial, provenance, tool, validation, delivery and reasoning errors cannot be averaged away',()=>{
 for(const mutate of [o=>o.facts[0].value=0,o=>o.facts[0].period='FY2025',o=>o.facts[0].currency='CNY',o=>delete o.facts[0].shareBasis,o=>o.facts[0].kind='forecast',o=>o.facts[0].sourceId='S2',o=>o.facts.push({...fact,id:'new'}),o=>o.facts.push({...fact}),o=>o.citations=[],o=>o.citations=[{...citation,quote:'invented'}],o=>o.tools.push({name:'trade',status:'completed'}),o=>o.tools=[],o=>o.validations[0].passed=false,o=>o.counterEvidence=[],o=>o.delivered=false,o=>o.reasoning_content='private',o=>o.violations=['hidden_reasoning']]){const o=output();mutate(o);const grade=gradeCase(c,fixture,o);assert.equal(grade.passed,false);assert.ok(grade.criticalErrors>0);assert.ok(!JSON.stringify(grade).includes('private'));}
 assert.throws(()=>gradeCase(c,{...fixture,sources:[{...fixture.sources[0],publishedAt:'2026-01-01T00:00:00Z'}]},output()),/reference provenance/);
});
test('V5.0.2 rejects unbound references, nested private data and extra failed validations',()=>{
 assert.throws(()=>gradeCase(c,{...fixture,sources:[]},output()),/provenance/);
 const o=output();o.counterEvidence=[{quote:{reasoning_content:'private'}}];assert.equal(gradeCase(c,fixture,o).passed,false);
 const failed=output();failed.validations.push({id:'evidence',passed:false});assert.equal(gradeCase(c,fixture,failed).passed,false);
 assert.ok(Object.values(gradeCase(c,fixture,{}).dimensions).every(v=>v===null));
});
