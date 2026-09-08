import test from 'node:test';
import assert from 'node:assert/strict';
import {cashflowBridge} from '../server/cashflow-bridge.mjs';
import {toolsForMode,runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {quickScreenMetrics} from '../server/quick-screen.mjs';
const sources=[{id:'S1',type:'official-report'}];
const item=(key,contribution)=>({key,label:key,contribution,sourceIds:['S1']});
const input=()=>({amountUnit:'人民币亿元',scope:'合并范围含财务子公司；只调整所列两项',basis:{sourceIds:['S1'],currency:'CNY'},current:{start:'2026-01-01',end:'2026-06-30',ocf:70,sourceIds:['S1'],adjustments:[item('deposits',10),item('placement',30)]},previous:{start:'2025-01-01',end:'2025-06-30',ocf:20,sourceIds:['S1'],adjustments:[item('placement',-10),item('deposits',0)]}});
const calculate=i=>cashflowBridge(i,{sources});
test('signed cashflow contributions explain reversal without double-subtracting cash outflows',()=>{const r=calculate(input());assert.equal(r.ocfChange,50);assert.equal(r.explainedChange,50);assert.equal(r.explainedShare,1);assert.equal(r.adjustedCurrent,30);assert.equal(r.adjustedPrevious,30);assert.equal(r.adjustedGrowth,0);assert.equal(r.status,'calculated-needs-review');assert.match(r.limitations.join(''),/不是主营现金流/);});
test('cashflow bridge preserves missing values, zero changes and negative comparison bases',()=>{let i=input();i.current.adjustments[0].contribution=null;let r=calculate(i);assert.equal(r.adjustedCurrent,null);assert.equal(r.explainedShare,null);assert.equal(r.status,'incomplete');i=input();i.current.ocf=20;r=calculate(i);assert.equal(r.explainedShare,null);i=input();i.previous.ocf=-30;r=calculate(i);assert.equal(r.adjustedGrowth,null);});
test('cashflow bridge rejects mixed periods, unmatched adjustments and untrusted basis',()=>{let i=input();i.previous.end='2025-12-31';assert.throws(()=>calculate(i),/同期/);i=input();i.current.adjustments[0].key='unknown';assert.throws(()=>calculate(i),/同一组/);i=input();delete i.current.ocf;assert.throws(()=>calculate(i),/显式null/);i=input();i.current.adjustments.push(i.current.adjustments[0]);assert.throws(()=>calculate(i),/重复/);assert.throws(()=>cashflowBridge(input(),{sources:[{id:'S1',type:'quote'}]}),/实际财务来源/);i=input();i.current.start='2026-02-30';assert.throws(()=>calculate(i),/期间/);});
test('bridge is available to quick screening with provenance required; DCF remains prohibited',()=>{const t=toolsForMode('A'),bridge=t.find(t=>t.function.name==='calculate_cashflow_bridge');assert.ok(bridge);assert.ok(bridge.function.parameters.required.includes('basis'));assert.ok(!t.some(t=>t.function.name==='calculate_dcf'));});

test('quick metrics retains a diagnostic boundary for financial subsidiaries and unknown scope',()=>{
 const args={sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'未提供',basis:{sourceIds:['S1']},periods:[{start:'2025-01-01',end:'2025-12-31',kind:'annual',sourceIds:['S1'],ocf:20,capex:2}]};
 const unknown=quickScreenMetrics(args,{sources});assert.equal(unknown.cashFlowScope,'unknown');assert.ok(unknown.cashFlowScopeNotice);
 const financial=quickScreenMetrics({...args,cashFlowScope:'includes-financial-subsidiary'},{sources});assert.match(financial.cashFlowScopeNotice,/桥接/);assert.equal(financial.financial[0].quickFcf,18);
 assert.throws(()=>quickScreenMetrics({...args,cashFlowScope:'assumed'}),/合并范围/);
});

test('MODE A routes the signed bridge result and limitations into model and audit evidence',async()=>{
 const old=global.fetch,events=[];let calls=0;
 const args=input();args.basis={...args.basis,period:'2025/2026上半年同期',shareBasis:'合并口径',assumptions:'合成金额仅测试'};
 const job={mode:'A',input:{mode:'A',question:'合成现金流核对',sources:[{...sources[0],official:true,title:'合成财务报告',text:'OCF70/20，贡献10/0、30/-10；合成测试。'}]}};
 global.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls++;
  if(calls===1){assert.match(body.messages[0].content,/calculate_cashflow_bridge/);return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'bridge',type:'function',function:{name:'calculate_cashflow_bridge',arguments:JSON.stringify(args)}}]}}]});}
  if(calls===2){const result=JSON.parse(body.messages.find(m=>m.role==='tool').content);assert.equal(result.adjustedCurrent,30);assert.equal(result.explainedShare,1);return Response.json({choices:[{message:{role:'assistant',content:'合成诊断余额不是正常化FCF。[S1]'}}]});}
  const audit=JSON.parse(body.messages[1].content);assert.match(audit.toolEvidence[0].result.limitations.join(''),/不是主营现金流/);assert.equal(audit.toolEvidence[0].arguments.current.ocf,70);
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 try{const result=await runAgent(job,(type,message,details)=>events.push({type,message,...details}),new AbortController().signal);assert.ok(result.report);assert.equal(calls,3);assert.equal(events.find(e=>e.type==='tool_result').toolCallId,'bridge');}finally{global.fetch=old;}
});
