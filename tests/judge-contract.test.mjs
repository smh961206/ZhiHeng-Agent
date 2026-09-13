import test from 'node:test';
import assert from 'node:assert/strict';
import {detectCoreConflict,buildJudgeInput,parseJudgeOutput,validateJudgeOutput,adjudicateJudgeOutput} from '../server/model-judge.mjs';
const conclusion=(id,position)=>({id,subject:'local-core-claim',kind:'claim',completed:true,statement:'Synthetic completed conclusion '+id,position,basis:{entity:'synthetic',period:'FY2025',currency:'CNY',shareBasis:'ordinary',accountingScope:'consolidated',valuationBasis:'not_applicable'},evidenceRefs:[{sourceId:'S1',blockId:'b1'}],counterEvidenceRefs:[{sourceId:'S2',blockId:'b2'}],toolCallIds:[]});
const input=()=>({cutoff:'2026-09-02T00:00:00Z',sources:[1,2].map(n=>({id:'S'+n,text:'Evidence '+n,publishedAt:'2026-09-01T00:00:00Z',documentBlocks:[{id:'b'+n,text:'Evidence '+n}]})),evidence:[1,2].map(n=>({id:'S'+n,blockId:'b'+n,text:'Evidence '+n,reasoning_content:'PRIVATE'})),l1:conclusion('l1','support'),l2:conclusion('l2','oppose')});
const answer=p=>({version:1,inputHash:p.inputHash,outcome:'accept_l1',selectedId:p.l1.id,reasonCode:'evidence_consistency',citations:p.evidence.map(e=>({sourceId:e.id,blockId:e.blockId,quote:e.text})),reviewedToolCallIds:p.tools.map(t=>t.toolCallId)});
test('V5.2.6 cites both sides, preserves original conclusions and never converts decisions into facts',()=>{
 const p=buildJudgeInput(input()),before=structuredClone(p),a=answer(p);
 const result=adjudicateJudgeOutput(a,p);assert.equal(result.status,'advisory-needs-review');assert.deepEqual(result.selectedConclusion,p.l1);assert.deepEqual(p,before);
 for(const change of [{inputHash:'a'.repeat(64)},{selectedId:'l3'},{citations:[a.citations[0]]},{citations:a.citations.map(c=>({...c,quote:'invented'}))},{reviewedToolCallIds:['invented']},{reasonCode:'calculation_consistency'}]){assert.throws(()=>validateJudgeOutput({...a,...change},p));const r=adjudicateJudgeOutput({...a,...change},p);assert.equal(r.status,'unresolved');assert.deepEqual(r.conflict,p.conflict);assert.equal(r.selectedConclusion,null);}
 assert.equal(adjudicateJudgeOutput(a,p,{humanOverride:'keep_l2'}).reason,'human_override_preserved');
 const altered=structuredClone(p);altered.l1.statement='other';assert.throws(()=>validateJudgeOutput(a,altered));
});
test('V5.2.5 output admits exactly three decisions and no third facts/thesis/reasoning',()=>{
 const a=answer(buildJudgeInput(input()));assert.deepEqual(parseJudgeOutput(JSON.stringify(a)),a);
 assert.equal(parseJudgeOutput({...a,outcome:'accept_l2',selectedId:'l2'}).outcome,'accept_l2');
 assert.equal(parseJudgeOutput({...a,outcome:'insufficient_to_decide',selectedId:null,reasonCode:'insufficient_evidence'}).selectedId,null);
 for(const change of [{outcome:'new_thesis'},{facts:[{value:42}]},{reasoning_content:'hidden'},{outcome:'insufficient_to_decide'},{citations:[{...a.citations[0],newValue:42}]},{selectedId:null}])assert.throws(()=>parseJudgeOutput({...a,...change}));
});
test('V5.2.4 judge packet binds real block identity, original cutoff and both sides without private sessions',()=>{
 const p=buildJudgeInput(input());assert.equal(p.evidence.length,2);assert.ok(!JSON.stringify(p).includes('PRIVATE'));assert.ok(!p.messages);assert.ok(p.inputHash);
 for(const mutate of [i=>i.evidence[0].blockId='forged',i=>i.sources[0].publishedAt='2026-09-03',i=>i.sources[0].publishedAt=null,i=>i.l2.counterEvidenceRefs=[{sourceId:'S3',blockId:'b3'}],i=>i.humanOverride={chosen:'l1'},i=>i.l1.reasoning_content='PRIVATE',i=>i.sources[0].documentBlocks.push(i.sources[0].documentBlocks[0])]){const i=input();mutate(i);assert.throws(()=>buildJudgeInput(i));}
});
test('V5.2.3 explicit opposing completed core claims yield stable conflict signature',()=>{
 const input={l1:conclusion('l1','support'),l2:conclusion('l2','oppose')},c=detectCoreConflict(input);
 assert.equal(c.material,true);assert.equal(c.signature,detectCoreConflict(structuredClone(input)).signature);
 for(const change of [{position:'support'},{completed:false},{subject:'other'},{evidenceRefs:[]},{basis:{...input.l2.basis,period:'FY2026'}}])assert.equal(detectCoreConflict({...input,l2:{...input.l2,...change}}).material,false);
});
test('V5.2.3 valuation materiality uses actual same-basis calculations, never model supplied amounts',()=>{
 const l1={...conclusion('l1','support'),kind:'valuation',toolCallIds:['t1']},l2={...conclusion('l2','oppose'),kind:'valuation',toolCallIds:['t2']};
 const tool=(id,n)=>({toolCallId:id,toolName:'calculate_dcf',arguments:{shares:10},result:{perShare:n,basis:{currency:'CNY'}}});
 assert.equal(detectCoreConflict({l1,l2,tools:[tool('t1',10),tool('t2',20)]}).material,true);
 assert.equal(detectCoreConflict({l1,l2,tools:[tool('t1',19),tool('t2',20)]}).material,false);
 assert.equal(detectCoreConflict({l1,l2,tools:[]}).material,false);
 const mixed=tool('t2',20);mixed.result.basis.currency='USD';assert.equal(detectCoreConflict({l1,l2,tools:[tool('t1',10),mixed]}).material,false);
});
