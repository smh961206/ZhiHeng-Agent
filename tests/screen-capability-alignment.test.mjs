import test from 'node:test';
import assert from 'node:assert/strict';
import {quickScreenMetrics} from '../server/quick-screen.mjs';
import {verifyFinancialInputs} from '../server/financial-input-verification.mjs';
import {researchStatus,executionBudget,compactExecutionContext} from '../server/agent-execution.mjs';
import {researchExecutionChecks,toolResultHasGap} from '../shared/research-execution-checks.mjs';
import {exportExecutionMarkdown} from '../shared/research-export.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const body='2025年度 人民币元 营业收入 1,200.00；归母净利润 100；经营现金流 -25。';
const source=()=>({id:'S1',type:'official-report',official:true,title:'合成官方报告',pages:3,text:body,documentBlocks:[
 {id:'bad',page:1,method:'native',symbolReview:true,text:body},
 {id:'good',page:2,method:'native',text:body},
 {id:'ocr',page:3,method:'ocr',text:body},
]});
const raw=()=>({key:'revenue',sourceId:'S1',blockId:'bad',quote:body,label:'营业收入',period:'2025',unit:'元',value:1200,scale:1});
const annual=year=>({start:`${year}-01-01`,end:`${year}-12-31`,kind:'annual',revenue:100,netIncome:10,ocf:20,capex:12,roe:.1,sourceIds:['S1']});
const basis={currency:'CNY',period:'2021–2025',shareBasis:'合并归母',assumptions:'合成输入，仅作程序验证',sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:'good'}]};
const args=periods=>({sector:'non-financial',amountUnit:'人民币元',roeBasis:'加权平均ROE，小数',periods,balances:[],basis});
const quarters=()=>[2024,2025].flatMap(year=>[1,2,3,4].map(q=>({start:`${year}-${String(q*3-2).padStart(2,'0')}-01`,end:new Date(Date.UTC(year,q*3,0)).toISOString().slice(0,10),kind:'quarter',sourceIds:['S1'],revenue:25,netIncome:2.5,ocf:5,capex:3})));
const events=records=>records.flatMap(r=>[{type:'tool',toolName:r.toolName,toolCallId:r.toolCallId,arguments:r.arguments},{type:'tool_result',toolName:r.toolName,toolCallId:r.toolCallId,result:r.result}]);

test('coverage counts consecutive supplied values, not filings; null and conflicts remain gaps',()=>{
 const complete=quickScreenMetrics(args([...Array.from({length:5},(_,i)=>annual(2021+i)),...quarters()]));
 assert.equal(complete.coverage.annual.complete,5);assert.equal(complete.coverage.quarters.complete,8);assert.equal(complete.coverage.status,'inputs-covered-needs-review');
 const periods=[annual(2021),annual(2023),{...annual(2025),roe:null},...quarters().filter(r=>r.start!=='2024-04-01')];
 periods.find(r=>r.start==='2025-01-01'&&r.kind==='quarter').ocf=null;
 const incomplete=quickScreenMetrics(args(periods)).coverage;
 assert.equal(incomplete.annual.complete,2);assert.equal(incomplete.quarters.complete,6);
 assert.deepEqual(incomplete.quarters.periods.find(r=>r.period==='2024 Q2').missingFields,['revenue','netIncome','ocf']);
 assert.match(incomplete.notice,/不证明最新披露/);
 const conflicting=quickScreenMetrics(args([...quarters(),{...annual(2025),kind:'cumulative',end:'2025-06-30',revenue:999}]));
 assert.equal(conflicting.coverage.quarters.periods.find(r=>r.period==='2025 Q2').conflict,true);
 assert.ok(toolResultHasGap(incomplete));assert.ok(toolResultHasGap({coverage:incomplete}));
});
test('cumulative subtraction can cover a quarter but cannot fill same-date balance gaps',()=>{
 const q1={...annual(2026),kind:'cumulative',end:'2026-03-31'},h1={...annual(2026),kind:'cumulative',end:'2026-06-30',revenue:220};
 const input=args([annual(2025),q1,h1]);input.balances=[{date:'2025-06-30',sourceIds:['S1'],inventory:null}];
 const c=quickScreenMetrics(input).coverage;
 assert.equal(c.quarters.complete,2);assert.equal(c.quarters.periods.at(-1).derived,true);
 assert.ok(c.balanceMissing.some(r=>r.field==='inventory'&&r.date==='2025-06-30'));
 assert.throws(()=>quickScreenMetrics(args([])),/财务记录/);
});
test('failed verification suggests only usable same-source alternatives without repairing flags or facts',()=>{
 const s=source(),result=verifyFinancialInputs({items:[raw()]},{sources:[s]});
 assert.equal(result.unresolved,1);assert.equal(result.recovery[0].alternatives.length,1);assert.equal(result.recovery[0].alternatives[0].blockId,'good');
 assert.equal(s.documentBlocks[0].symbolReview,true);assert.equal(result.checks[0].status,'unusable');
 const repaired=verifyFinancialInputs({items:[{...raw(),blockId:'good'}]},{sources:[s]});assert.equal(repaired.matched,1);
 const scaled=source();scaled.documentBlocks[1].text='单位：千元 营业收入 1.20';
 assert.equal(verifyFinancialInputs({items:[raw()]},{sources:[scaled]}).recovery[0].alternatives[0].suggestedScale,1000);
 const wrongSign={...raw(),key:'cash',label:'经营现金流',value:25};assert.equal(verifyFinancialInputs({items:[wrongSign]},{sources:[s]}).recovery[0].alternatives.length,0);
 s.stale=true;assert.equal(verifyFinancialInputs({items:[raw()]},{sources:[s]}).recovery[0].alternatives.length,0);
 const duplicate=source();duplicate.documentBlocks.push({...duplicate.documentBlocks[1]});assert.equal(verifyFinancialInputs({items:[raw()]},{sources:[duplicate]}).recovery[0].alternatives.length,0);
});
test('status, compacted context, mode-scoped checks and export retain actual coverage and historical limitations',()=>{
 const result=quickScreenMetrics(args([annual(2025)])),records=[{toolName:'calculate_screen_metrics',toolCallId:'screen-real',arguments:args([annual(2025)]),result}];
 const job={id:'synthetic',mode:'A',plan:{mode:'A',depth:'Quick'},status:'failed',input:{sources:[source()],question:'合成测试'},events:events(records)};
 const status=researchStatus(job,records,executionBudget(job.plan),1);assert.equal(status.financialCoverage[0].toolCallId,'screen-real');assert.equal(status.limitedCalls.length,1);
 const messages=[{role:'system',content:'规则'},{role:'user',content:'x'.repeat(250000)}];compactExecutionContext({messages,job,records,evidence:[]});assert.equal(JSON.parse(messages[1].content).financialCoverage[0].coverage.annual.complete,1);
 const checks=researchExecutionChecks(job);assert.ok(checks.some(c=>c.id==='trends'&&c.state==='has-gaps'));assert.ok(!checks.some(c=>c.id==='models'));
 assert.ok(researchExecutionChecks({...job,mode:'B',plan:{mode:'B'}}).some(c=>c.id==='models'));
 const md=exportExecutionMarkdown(job);assert.match(md,/年度 1\/5/);assert.match(md,/季度 0\/8/);assert.match(md,/2024 Q1/);assert.match(md,/screen-real/);
 assert.match(exportExecutionMarkdown({...job,events:[]}),/尚无数值覆盖返回/);
});
test('MODE A agent executes failure → alternative page → reverify → coverage → status → audit',async()=>{
 const original=global.fetch,j={mode:'A',input:{mode:'A',question:'合成公司值不值得研究',sources:[source()]}};
 const steps=[['fail','verify_financial_inputs',{items:[raw()]}],['read','read_source_pages',{sourceId:'S1',pages:[2],view:'text'}],['retry','verify_financial_inputs',{items:[{...raw(),blockId:'good'}]}],['screen','calculate_screen_metrics',args([annual(2025)])],['status','get_research_status',{}]];
 let count=0;
 global.fetch=async(_url,options)=>{
  const request=JSON.parse(options.body),index=count++;
  if(index<steps.length){assert.ok(!request.tools.some(t=>t.function.name==='calculate_dcf'));const [id,name,input]=steps[index];return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(input)}}]}}]});}
  if(index===steps.length){const status=JSON.parse(request.messages.at(-1).content);assert.equal(status.financialCoverage[0].coverage.annual.complete,1);assert.ok(status.limitedCalls.some(r=>r.toolCallId==='fail'));return Response.json({choices:[{message:{role:'assistant',content:'合成研究：保留四年及季度缺口。[S1]'}}]});}
  const audit=JSON.parse(request.messages[1].content);assert.equal(audit.financialCoverage[0].toolCallId,'screen');assert.ok(audit.toolEvidence.some(r=>r.toolCallId==='fail'&&r.result.unresolved===1));
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(j.input))}}]});
 };
 try{const report=await runAgent(j,()=>{},new AbortController().signal);assert.ok(report.report);assert.equal(count,7);assert.equal(j.checkpoint.toolRecords[2].result.matched,1);assert.equal(j.input.sources[0].documentBlocks[0].symbolReview,true);}finally{global.fetch=original;}
});
