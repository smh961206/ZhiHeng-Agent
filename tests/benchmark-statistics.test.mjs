import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSamples,wilson} from '../benchmark/statistics.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
const samples=(count=50)=>Array.from({length:count},(_,i)=>['base','candidate'].flatMap(profileId=>[0,1].map(repeat=>({caseId:'C'+i,taskClass:'financial_analysis',fixtureHash:objectHash(i),profileId,repeat,passed:true,criticalErrors:0,evidenceKind:'live-model'})))).flat();
const compare=rows=>compareSamples(rows,{baselineId:'base',candidateId:'candidate'});
test('V5.0.8 repeated cases do not inflate sample count; conservative intervals and gates are reproducible',()=>{const r=compare(samples());assert.equal(r.tasks[0].uniqueCases,50);assert.equal(r.tasks[0].repeatedSamples,200);assert.equal(r.tasks[0].eligible,true);assert.equal(r.qualityAccepted,false);assert.ok(Math.abs(wilson(50,50).lower-0.9286524008666413)<1e-12);assert.deepEqual(compare(samples()),r);});
test('V5.0.8 tiny/unpaired/duplicate/aliased samples and simulation cannot authorize champions',()=>{
 assert.equal(compare(samples(2)).tasks[0].eligible,false);assert.equal(compare(samples().slice(1)).tasks[0].eligible,false);
 assert.throws(()=>compare([...samples(),samples()[0]]),/duplicate/);
 assert.equal(compare(samples().map(r=>({...r,fixtureHash:objectHash('same')}))).tasks[0].eligible,false);
 assert.equal(compare(samples().map(r=>({...r,evidenceKind:'simulation'}))).tasks[0].eligible,false);
 const changed=samples();changed[2].fixtureHash=objectHash('other');assert.throws(()=>compare(changed),/unpaired/);
});
test('V5.0.8 a single critical failure blocks promotion regardless of perfect repeats/cost',()=>{const rows=samples();rows[2].passed=false;rows[2].criticalErrors=1;rows[2].cost=0;assert.ok(compare(rows).tasks[0].reasons.includes('critical_quality_failure'));assert.equal(compare(rows).tasks[0].eligible,false);});
