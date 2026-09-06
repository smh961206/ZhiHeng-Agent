import test from 'node:test';
import assert from 'node:assert/strict';
import {quickScreenMetrics} from '../server/quick-screen.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {exportResearchMarkdown,researchApproachMarkdown} from '../shared/research-export.mjs';
import {chooseReports,reportCoverage} from '../server/report-periods.mjs';
import {checkDataBasis} from '../server/data-basis.mjs';
import {searchEvidence,financialRowBlocks} from '../server/evidence-search.mjs';
import {reviewContract,validateReview} from '../server/research-output.mjs';
import {runAgent,toolsForMode} from '../server/agent.mjs';
import {collectMarketData} from '../server/market-data.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

// Synthetic fixtures: unrelated to the user's company or reference figures.
const basis={currency:'CNY',period:'2021至2026，各行实际期间',shareBasis:'合并归母口径一致',assumptions:'测试数据；亿元统一单位',sourceIds:['S1']};
const annual=(year,values={})=>({start:`${year}-01-01`,end:`${year}-12-31`,kind:'annual',sourceIds:['S1'],revenue:100,netIncome:10,ocf:20,capex:12,roe:.1,...values});
const args=(periods=[],balances=[])=>({sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'加权平均归母ROE，小数',periods,balances,basis});
const source={id:'S1',title:'合成官方财报',type:'official-report',official:true,security:'CN:600001',text:'合成报告仅供测试：OCF20、资本开支12，现金流待验证。'};
test('MODE A fixes a five-year scope and ten report sections while B Quick keeps its existing scope',()=>{
 const plan=createResearchPlan({mode:'A',historyYears:1});assert.equal(plan.historyYears,5);assert.equal(plan.output.sections.length,10);assert.equal(plan.depth,'Quick');
 assert.ok(plan.researchApproach.steps.some(step=>step.id==='redFlags'));assert.equal(createResearchPlan({mode:'B',depth:'Quick',historyYears:3}).output.sections.length,5);
 assert.ok(toolsForMode('A').some(t=>t.function.name==='calculate_screen_metrics'));assert.ok(!toolsForMode('A').some(t=>['calculate_dcf','calculate_dividend'].includes(t.function.name)));
 assert.ok(toolsForMode('B').some(t=>t.function.name==='calculate_dcf'));
});
test('Quick FCF, growth and historical ROE preserve signs, nulls and observed coverage',()=>{
 const result=quickScreenMetrics(args([annual(2021,{revenue:50,roe:.1}),annual(2023,{roe:null,ocf:-5,capex:20}),annual(2025,{roe:.3})]));
 assert.equal(result.financial[1].quickFcf,-25);assert.equal(result.trend.roe.count,2);assert.equal(result.trend.roe.mean,.2);assert.equal(result.trend.roe.median,.2);assert.ok(Math.abs(result.trend.roe.populationStdDev-.1)<1e-12);
 assert.deepEqual(result.trend.missingFiscalEndYears,[2022,2024]);assert.match(result.trend.roe.notice,/不构成正常化/);assert.ok(result.trend.cagr.revenue.value>.18&&result.trend.cagr.revenue.value<.20);
 const missing=quickScreenMetrics(args([annual(2025,{capex:null,roe:null})]));assert.equal(missing.financial[0].quickFcf,null);assert.equal(missing.trend.roe.mean,null);assert.equal(missing.trend.cagr.revenue.value,null);
});
test('quarter derivation subtracts matched cumulative flows, never ratios or stock balances',()=>{
 const q1={...annual(2026),kind:'quarter',end:'2026-03-31',revenue:40,ocf:6,capex:7,roe:.05};
 const h1={...annual(2026),kind:'cumulative',end:'2026-06-30',revenue:90,ocf:20,capex:16,roe:.12};
 const result=quickScreenMetrics(args([q1,h1]));const q2=result.derivedQuarters[0];assert.equal(q2.start,'2026-04-01');assert.equal(q2.revenue,50);assert.equal(q2.quickFcf,5);assert.ok(!Object.hasOwn(q2,'roe'));
 assert.equal(result.financial[1].comparison,null);assert.match(q2.formula,/累计流量/);
 const direct={...q1,start:'2026-04-01',end:'2026-06-30',revenue:999};
 const conflict=quickScreenMetrics(args([q1,h1,direct]));assert.equal(conflict.conflicts.length,1);assert.equal(conflict.derivedQuarters[0].status,'conflict');
});
test('zero/negative growth bases and year-end stock comparisons remain explicit',()=>{
 const result=quickScreenMetrics(args([annual(2024,{netIncome:-10,ocf:0}),annual(2025)],
  [{date:'2025-12-31',sourceIds:['S1'],inventory:50,cash:100,shortDebt:20},{date:'2026-06-30',sourceIds:['S1'],inventory:75,cash:80,shortDebt:25}]));
 assert.equal(result.financial[1].comparison.metrics.netIncome.growth,null);assert.equal(result.financial[1].comparison.metrics.netIncome.change,20);
 assert.equal(result.financial[1].comparison.metrics.ocf.growth,null);assert.equal(result.balances[1].comparison.label,'较2025-12-31');assert.equal(result.balances[1].comparison.metrics.inventory.growth,.5);
 assert.equal(result.balances[1].unrestrictedCashToShortDebt,null);
});
test('quick arithmetic rejects ambiguous dates, periods, units, duplicate revisions and invalid provenance',()=>{
 for(const bad of [args([annual(2025),annual(2025,{revenue:101})]),args([{...annual(2025),end:'2025-02-30'}]),args([{...annual(2025),end:'2025-06-30'}]),args([annual(2025,{capex:-1})]),args([annual(2025,{revenue:Infinity})]),args([{...annual(2025),sourceIds:['S99']}]),{...args([annual(2025)]),amountUnit:''}])assert.throws(()=>quickScreenMetrics(bad));
 assert.throws(()=>quickScreenMetrics(args([annual(2025)]),{sources:[{...source,type:'quote'}]}),/行情/);
 assert.throws(()=>quickScreenMetrics(args([annual(2024,{revenue:Number.MIN_VALUE}),annual(2025,{revenue:Number.MAX_VALUE})])),/有限/);
});
test('MODE A selects five distinct annuals plus recent disclosures and records missing annuals',()=>{
 const docs=Array.from({length:7},(_,i)=>{const y=2019+i;return {title:`${y}年报`,date:`${y+1}-04-01`,annual:true,url:`annual-${y}`};});
 docs.push({title:'2026年半年度报告',date:'2026-08-30',url:'h1'},{title:'2026年第一季度报告',date:'2026-04-30',url:'q1'});
 const selected=chooseReports(docs,1,'A');assert.deepEqual(selected.filter(d=>d.annual).map(d=>d.title).sort(),['2021年报','2022年报','2023年报','2024年报','2025年报']);assert.ok(selected.some(d=>d.url==='h1'));assert.ok(selected.some(d=>d.url==='q1'));
 const missing=chooseReports(docs.filter(d=>d.url!=='annual-2023'),5,'A');assert.deepEqual(reportCoverage(missing,{years:5,market:'CN',clock:()=>Date.parse('2026-09-07')}).missingAnnualYears,[2023]);assert.ok(!missing.some(d=>d.url==='annual-2020'));
});
test('financial institutions do not receive industrial cash-flow proxies and overlapping fiscal years are refused',()=>{
 const result=quickScreenMetrics({...args([annual(2025)]),sector:'bank'});assert.equal(result.financial[0].quickFcf,null);assert.equal(result.financial[0].ocfToNetIncome,null);assert.match(result.cashFlowApplicability,/不适用/);
 assert.throws(()=>quickScreenMetrics(args([annual(2024),{...annual(2025),start:'2024-04-01',end:'2025-03-31'}])),/重叠/);
});
test('vendor financial retrieval returns complete dated records with report type and revision flags',()=>{
 const rows=[{ts_code:'600001.SH',end_date:'20250630',ann_date:'20250830',report_type:'1',n_cashflow_act:20,c_pay_acq_const_fiolta:12,update_flag:'1'},{ts_code:'600001.SH',end_date:'20250630',report_type:'4',n_cashflow_act:99,update_flag:'0'}];
 const vendor={...source,type:'vendor-financials',api:'cashflow',text:'供应商资料\n'+JSON.stringify({currency:null,unit:null,rows},null,2)};
 assert.equal(financialRowBlocks(vendor).length,2);const found=searchEvidence([vendor],'20250630 经营现金流','S1');assert.equal(found.length,2);assert.match(found[0].text,/单位：未知/);assert.match(found[0].text,/"report_type":"1"/);assert.match(found[0].text,/"end_date":"20250630"/);
 assert.equal(financialRowBlocks({...vendor,text:'broken JSON'}).length,0);
});
test('quick coverage skips deep return-history requirements without marking them as observed',()=>{
 const screen=checkDataBasis({market:'CN',symbol:'600001'},{mode:'A'});assert.ok(!screen.checks.some(c=>['dividend-history','buyback-purpose','recent-eight-periods','valuation-history'].includes(c.id)));
 assert.equal(screen.checks.find(c=>c.id==='official-annual-text').status,'missing');assert.equal(screen.checks.find(c=>c.id==='recent-report-periods').status,'missing');
 assert.ok(checkDataBasis({market:'CN',symbol:'600001'}).checks.some(c=>c.id==='dividend-history'));
});
test('MODE A collection uses fixed financial evidence and avoids unneeded shareholder/percentile fetches',async()=>{
 const unexpected=async()=>assert.fail('MODE A should not fetch deep return histories');
 const result=await collectMarketData([{market:'CN',symbol:'600001'}],{mode:'A',signal:new AbortController().signal,quotes:async()=>{throw new Error('synthetic missing quote');},listReports:async()=>({reports:[]}),financials:async()=>({configured:true,sources:[{...source,id:undefined,type:'vendor-financials'}],warnings:[],coverage:[]}),shareholder:unexpected,valuations:unexpected,capitalReports:unexpected,brokerFundamentals:unexpected});
 assert.equal(result.coverage[0].read,0);assert.equal(result.sources.filter(s=>s.type==='vendor-financials').length,1);
});
test('public evidence summaries require actual IDs or an explicit data gap, with legacy reports left readable',()=>{
 const input={mode:'A',question:'合成快筛'},plan=createResearchPlan(input),value=reviewFixture(input);
 assert.ok(reviewContract(plan).schema.researchSummary);assert.equal(validateReview(value,{input,plan,sources:[source]}).researchSummary.checks.length,3);
 const bad=structuredClone(value);bad.researchSummary.checks[0].sourceIds=['S99'];assert.throws(()=>validateReview(bad,{input,plan,sources:[source]}),/无效证据/);
 bad.researchSummary.checks[0]={topic:'测试',sourceIds:[],assessment:'已经核实增长',unresolved:'无'};assert.throws(()=>validateReview(bad,{input,plan,sources:[source]}),/数据不足/);
 delete value.researchSummary;assert.throws(()=>validateReview(value,{input,plan,sources:[source]}),/公开证据/);assert.ok(validateReview(value,{input,plan:{...plan,contractVersion:2},sources:[source]}).report);
});
test('three-part export contains only saved reasoning summaries and chronological actual tool records',()=>{
 const input={question:'合成快筛',mode:'A',sources:[source]},plan=createResearchPlan(input),result=validateReview(reviewFixture(input),{input,plan,sources:[source]});
 const job={id:'fixture',mode:'A',status:'completed',input,plan,result,events:[{type:'tool',time:'2026-09-07T01:00:00Z',message:'调用财务计算',toolName:'calculate_screen_metrics',toolCallId:'c1',arguments:{note:'```keep actual```'}},{type:'tool_result',time:'2026-09-07T01:00:01Z',message:'财务计算返回',toolCallId:'c1',result:{quickFcf:8}}]};
 const output=exportResearchMarkdown(job);assert.ok(output.indexOf('# 一、')<output.indexOf('# 二、'));assert.ok(output.indexOf('# 二、')<output.indexOf('# 三、'));assert.ok(output.indexOf('调用财务计算')<output.indexOf('财务计算返回'));assert.match(output,/c1/);assert.match(output,/````json/);assert.match(output,/无.*|未明确/);
 assert.match(researchApproachMarkdown({status:'completed'}),/没有保存公开研究计划/);assert.throws(()=>exportResearchMarkdown({result:null}),/尚未完成/);
});

test('approach presentation separates saved plans, completed evidence and interrupted states',()=>{
 const input={mode:'A',question:'合成快筛'},plan=createResearchPlan(input),result=reviewFixture(input);
 const completed=researchApproachMarkdown({mode:'A',status:'completed',plan,result});
 for(const text of ['五个完整年度 + 最新一期','红旗是否经得起反证','同口径单季','Quick FCF','至少三条证伪条件','证据判断','下一步验证重点','什么会推翻判断','数据缺口与影响'])assert.ok(completed.includes(text),text);
 for(const status of ['queued','running','failed','cancelled']){
  const text=researchApproachMarkdown({mode:'A',status,plan,result});
  assert.ok(text.includes('本次查证问题'));assert.ok(!text.includes('### 业务质量'));assert.ok(!text.includes('## 筛选判断与后续验证'));
  assert.match(text,/尚未|仍在/);
 }
 const legacy={status:'completed',plan:{researchApproach:{objective:'当时保存的目标',steps:[{title:'旧问题',question:'当时的验证问题'}],boundaries:[]}}};
 const before=JSON.stringify(legacy),text=researchApproachMarkdown(legacy);
 assert.ok(text.includes('当时的验证问题'));assert.ok(!text.includes('五个完整年度'));assert.match(text,/没有保存证据判断摘要/);assert.equal(JSON.stringify(legacy),before);
});
test('MODE A executes screen arithmetic and refuses forbidden tool calls in the actual agent loop',async()=>{
 const previous=global.fetch;let calls=0;const events=[];
 const input={question:'合成快筛',mode:'A',sources:[source]},job={mode:'A',input};
 global.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls++;
  if(calls===1){assert.ok(!body.tools.some(t=>t.function.name==='calculate_dcf'));return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[['ok','calculate_screen_metrics',args([annual(2025)])],['denied','calculate_dcf',{}]].map(([id,name,values])=>({id,type:'function',function:{name,arguments:JSON.stringify(values)}}))}}]});}
  if(calls===2){const results=body.messages.filter(m=>m.role==='tool').map(m=>JSON.parse(m.content));assert.equal(results[0].financial[0].quickFcf,8);assert.match(results[1].error,/当前模式不允许/);return Response.json({choices:[{message:{role:'assistant',content:'合成草稿[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(input))}}]});
 };
 try{const result=await runAgent(job,(...event)=>events.push(event),new AbortController().signal);assert.ok(result.researchSummary);assert.equal(result.sections.length,10);assert.ok(events.some(e=>e[0]==='research_plan'));}finally{global.fetch=previous;}
});
