import test from 'node:test';
import assert from 'node:assert/strict';
import {researchPreparation} from '../shared/research-preparation.mjs';
import {validateInput} from '../server/router.mjs';
import {validateSecurities} from '../shared/security-input.mjs';
import {eligibleUpdateBaselines} from '../shared/earnings-update.mjs';
const security={market:'CN',symbol:'600519'};
const input={question:'研究现金流质量',mode:'B',depth:'Standard',historyYears:3};
const resolved={status:'ready',blocked:false,securities:[security]};

test('preparation uses the execution plan for fixed windows and report structure',()=>{
 for(const [mode,years,depth] of [['A',5,'Quick'],['F',8,'Standard'],['B',3,'Standard']]){
  const value=researchPreparation({...input,mode},resolved);
  assert.equal(value.ready,true);assert.equal(value.plan.historyYears,years);assert.equal(value.plan.depth,depth);
  assert.ok(value.plan.output.sections.length>0);
 }
 const auto=researchPreparation({...input,mode:'auto',question:'更新最新财报'},resolved);
 assert.equal(auto.plan.mode,'C');assert.deepEqual(auto.plan.output.actions,['建立基线']);
 assert.ok(auto.notes.some(note=>note.includes('建立财报基线')));
});

test('client preparation and API reject the same invalid manual securities',()=>{
 for(const security of [{market:'CN',symbol:'123'},{market:'HK',symbol:'123456'},{market:'US',symbol:'AAPL!'},{market:'XX',symbol:'AAPL'}]){
  const value=researchPreparation(input,{...resolved,securities:[security]});
  assert.equal(value.ready,false);assert.equal(value.issues[0].id,'securities');
  assert.throws(()=>validateInput({...input,securities:[security]}),{message:value.issues[0].message});
 }
 assert.deepEqual(validateSecurities([{market:'HK',symbol:'700'},{market:'HK',symbol:'00700'}]),[{market:'HK',symbol:'00700'}]);
});

test('comparison uses distinct normalized securities and matches submitted canonical codes',()=>{
 const duplicates=[{market:'HK',symbol:'700'},{market:'HK',symbol:'00700'}];
 const value=researchPreparation({...input,mode:'D'},{...resolved,securities:duplicates});
 assert.equal(value.ready,false);assert.match(value.message,/不同标的/);assert.equal(value.securities.length,1);
 const valid=researchPreparation({...input,mode:'D'},{...resolved,securities:[duplicates[0],{market:'US',symbol:' aapl '}]});
 assert.equal(valid.ready,true);
 assert.deepEqual(validateInput({...input,mode:'D',securities:valid.securities}).securities,valid.securities);
});

test('pending import, unsaved edits and service configuration cannot look ready',()=>{
 const deciding=researchPreparation(input,resolved,{pathPending:true});assert.equal(deciding.ready,false);assert.equal(deciding.issues[0].id,'path');
 for(const state of [{materialsReading:true},{materialsPending:true},{materialDraft:'未加入资料'},{materialEditDraft:{title:'修改'}}]){
  const value=researchPreparation(input,resolved,state);assert.equal(value.ready,false);assert.equal(value.issues[0].id,'materials');
 }
 const unavailable=researchPreparation(input,resolved,{config:{configured:false}});
 assert.equal(unavailable.ready,false);assert.equal(unavailable.issues[0].id,'service');
 const reading=researchPreparation(input,{...resolved,status:'loading'});
 assert.equal(reading.ready,false);assert.match(reading.message,/正在识别/);
});

test('missing optional context and web search explain limits without blocking research',()=>{
 const value=researchPreparation({...input,mode:'E'},resolved,{config:{configured:true,webSearch:{configured:false}}});
 assert.equal(value.ready,true);assert.ok(value.notes.some(note=>note.includes('不输出具体仓位')));
 assert.ok(value.notes.some(note=>note.includes('网页补充尚未连接')));
 assert.equal(researchPreparation(input,resolved,{materialDraft:'   '}).ready,true);
 assert.equal(researchPreparation({...input,question:' '},resolved).ready,false);
});

test('update baselines match equivalent Hong Kong codes without crossing markets',()=>{
 const jobs=[{id:'hk',status:'completed',plan:{securities:[{market:'HK',symbol:'00700'}]}}];
 assert.deepEqual(eligibleUpdateBaselines(jobs,[{market:'HK',symbol:'700'}]).map(job=>job.id),['hk']);
 assert.deepEqual(eligibleUpdateBaselines(jobs,[{market:'US',symbol:'700'}]),[]);
 const wrong=researchPreparation({...input,mode:'C',baselineJobId:'hk'},resolved,{jobs});
 assert.equal(wrong.ready,false);assert.equal(wrong.issues[0].id,'context');
 // A list request may still be loading: only a known mismatch blocks locally;
 // the server remains authoritative for missing/deleted baselines.
 assert.equal(researchPreparation({...input,mode:'C',baselineJobId:'hk'},resolved).ready,true);
});
