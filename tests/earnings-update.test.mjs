import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchPlan,resolveMode} from '../shared/research-framework.mjs';
import {earningsUpdateProgress,eligibleUpdateBaselines} from '../shared/earnings-update.mjs';
import {quickScreenMetrics} from '../server/quick-screen.mjs';
import {validateReview} from '../server/research-output.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {runAgent} from '../server/agent.mjs';

const security={market:'CN',symbol:'002594'},source={id:'S1',type:'official-report',official:true,text:'合成测试来源，不代表真实公司财报。'};
const input={question:'比亚迪最新财报分析',mode:'C',depth:'Standard',sources:[source]};
const row=(year,end,values)=>({start:year+'-01-01',end:year+'-'+end,kind:'cumulative',sourceIds:['S1'],...values});
const metrics=periods=>quickScreenMetrics({sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'加权ROE，小数',basis:{currency:'CNY',sourceIds:['S1']},periods,balances:[]});

test('MODE C distinguishes a new baseline from a change to a provided prior judgment',()=>{
 assert.equal(resolveMode({question:input.question}),'C');
 for(const depth of ['Quick','Standard','Deep']){
  const plan=createResearchPlan({...input,depth});assert.deepEqual(plan.output.actions,['建立基线']);assert.equal(plan.output.sections.length,6);
  assert.ok(plan.researchApproach.steps.some(step=>step.id==='disclosure'));assert.match(plan.constraints.join(' '),/利润率.*不能相减/);
 }
 const plan=createResearchPlan(input),review=reviewFixture(input);
 assert.equal(validateReview(review,{input,plan,sources:[source]}).decision.baselineStatus,'new_baseline');
 for(const action of ['维持','升级','降级','剔除'])assert.throws(()=>validateReview({...review,decision:{...review.decision,action}},{input,plan,sources:[source]}),/模式|基线/);
 const prior={...input,previousResearch:'旧判断与参数，仅作对照'};assert.deepEqual(createResearchPlan(prior).output.actions,['升级','维持','降级','剔除']);
 const legacy={...plan,contractVersion:4,output:{...plan.output,actions:['维持']}};
 assert.equal(validateReview({...review,decision:{...review.decision,action:'维持'}},{input,plan:legacy,sources:[source]}).decision.action,'维持');
});

test('update calculations derive Q2, compare comparable quarters and recalculate margins',()=>{
 const result=metrics([
  row(2025,'03-31',{revenue:100,netIncome:5,adjustedNetIncome:4,grossProfit:20,ocf:10,capex:20,roe:.02}),
  row(2025,'06-30',{revenue:300,netIncome:25,adjustedNetIncome:20,grossProfit:60,overseasRevenue:90,ocf:50,capex:90,roe:.07}),
  row(2026,'03-31',{revenue:120,netIncome:6,adjustedNetIncome:5,grossProfit:24,ocf:15,capex:25,roe:.02}),
  row(2026,'06-30',{revenue:360,netIncome:42,adjustedNetIncome:35,grossProfit:84,overseasRevenue:180,ocf:90,capex:100,roe:.08}),
 ]);
 const q2=result.quarterlyComparisons.find(row=>row.start==='2026-04-01');
 assert.equal(q2.netIncome,36);assert.equal(q2.netMargin,.15);assert.equal(q2.adjustedNetMargin,.125);assert.equal(q2.grossMargin,.25);
 assert.ok(Math.abs(q2.yoy.metrics.revenue.growth-.2)<1e-9);assert.equal(q2.qoq.metrics.netIncome.growth,5);
 assert.ok(Math.abs(q2.yoy.percentagePoints.netMargin-5)<1e-9);assert.equal(q2.roe,undefined);
 const h1=result.financial.at(-1);assert.equal(h1.comparison.metrics.quickFcf.change,30);assert.equal(h1.comparison.metrics.quickFcf.growth,null);
 assert.equal(h1.overseasShare,.5);assert.equal(h1.comparison.percentagePoints.overseasShare,20);
 assert.equal(q2.overseasRevenue,null,'H1 regional disclosure cannot invent missing Q1 regional data');
});

test('missing, conflicting and nonpositive quarter inputs never become confident comparisons',()=>{
 const q1=row(2026,'03-31',{revenue:100,netIncome:-5}),h1=row(2026,'06-30',{revenue:200,netIncome:10});
 const q2=metrics([q1,h1]).quarterlyComparisons.at(-1);
 assert.equal(q2.yoy,null);assert.equal(q2.qoq.metrics.netIncome.growth,null);assert.equal(q2.grossMargin,null);
 const direct={...h1,start:'2026-04-01',kind:'quarter',revenue:999};
 const conflict=metrics([q1,h1,direct]).quarterlyComparisons.find(row=>row.start==='2026-04-01');
 assert.equal(conflict.comparisonBlocked,true);assert.equal(conflict.qoq,null);assert.equal(conflict.yoy,null);
});

test('update baseline picker excludes incomplete and other-security research',()=>{
 const jobs=[{id:'match',status:'completed',plan:{securities:[security]}},{id:'wrong',status:'completed',plan:{securities:[{market:'HK',symbol:'01211'}]}},{id:'running',status:'running',plan:{securities:[security]}}];
 assert.deepEqual(eligibleUpdateBaselines(jobs,[security]).map(j=>j.id),['match']);assert.deepEqual(eligibleUpdateBaselines(jobs,[]),[]);
 assert.deepEqual(eligibleUpdateBaselines(jobs,[security,{market:'US',symbol:'AAPL'}]),[]);
 const job={status:'completed',input,workflow:{stages:[{id:'calculation',status:'skipped'}]}};
 assert.equal(earningsUpdateProgress(job,true).title,'本期财报基线已建立');
 assert.equal(earningsUpdateProgress({...job,input:{...input,previousResearch:'旧结论'}},true).title,'财报更新已完成');
 assert.match(earningsUpdateProgress({...job,workflow:{stages:[{id:'calculation',status:'failed'}]}},true).title,/缺口/);
});

test('turnover uses exact opening and closing balances with actual period days and preserves gaps',()=>{
 const args={sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'未提供',basis:{currency:'CNY',sourceIds:['S1']},periods:[row(2026,'06-30',{revenue:200,costOfRevenue:100})],
  balances:[{date:'2025-12-31',sourceIds:['S1'],inventory:20,receivables:10},{date:'2026-06-30',sourceIds:['S1'],inventory:40,receivables:30}]};
 const result=quickScreenMetrics(args).workingCapital[0];assert.equal(result.periodDays,181);assert.equal(result.averageInventory,30);assert.equal(result.inventoryDays,54.3);assert.equal(result.receivablesDays,18.1);
 for(const changed of [{...args,balances:args.balances.slice(1)},{...args,balances:[{...args.balances[0],date:'2025-09-30'},args.balances[1]]},{...args,sector:'bank'}]){
  const missing=quickScreenMetrics(changed).workingCapital[0];assert.equal(missing.inventoryDays,null);assert.equal(missing.receivablesDays,null);
 }
 const noCost=quickScreenMetrics({...args,periods:[{...args.periods[0],costOfRevenue:null}]}).workingCapital[0];assert.equal(noCost.inventoryDays,null);assert.equal(noCost.receivablesDays,18.1);
});

test('MODE C carries update rules through drafting and audit and saves the evidence summary',async()=>{
 const old=global.fetch;let count=0;
 const events=[];
 const calculation={sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'未提供',basis:{currency:'CNY',period:'2026 H1',shareBasis:'普通股',assumptions:'合成记录，验证调用路径',sourceIds:['S1']},periods:[row(2026,'03-31',{revenue:100,netIncome:5}),row(2026,'06-30',{revenue:250,netIncome:20})],balances:[]};
 global.fetch=async(_url,options)=>{
  const payload=JSON.parse(options.body);assert.match(payload.messages[0].content,/MODE C 财报更新/);assert.match(payload.messages[0].content,/不编造情景概率/);
  const step=count++;
  if(step<2){const name=step===0?'search_evidence':'calculate_screen_metrics',args=step===0?{query:'合成测试',sourceId:'S1'}:calculation;
   return Response.json({choices:[{message:{role:'assistant',tool_calls:[{id:'c'+step,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});}
  const content=step===2?'合成更新草稿，资料不足。[S1]':JSON.stringify(reviewFixture(input));
  return Response.json({choices:[{message:{role:'assistant',content}}]});
 };
 try{
  const result=await runAgent({mode:'C',input:structuredClone(input)},(type,message,data)=>events.push({type,message,...data}),new AbortController().signal);
  assert.equal(result.researchSummary.checks.length,3);assert.equal(result.decision.action,'建立基线');assert.equal(result.sections.length,6);
  const returned=events.find(event=>event.type==='tool_result'&&event.toolName==='calculate_screen_metrics');
  assert.ok(returned);assert.equal(returned.result.error,undefined);assert.equal(returned.result.derivedQuarters[0].netIncome,15);
 }finally{global.fetch=old;}
});
