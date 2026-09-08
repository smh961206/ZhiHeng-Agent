import test from 'node:test';
import assert from 'node:assert/strict';
import {dcfSensitivity,dividendScenarios} from '../server/research-sensitivity.mjs';
import {shareholderReturn} from '../server/shareholder-return.mjs';
import {dcf} from '../server/calculations.mjs';
import {normalizedEarnings} from '../server/normalized-earnings.mjs';
import {runAgent,toolsForMode} from '../server/agent.mjs';
import {researchAnalysisReceipts} from '../shared/research-analysis-receipts.mjs';
import {exportResearchMarkdown,exportExecutionMarkdown} from '../shared/research-export.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
// Synthetic inputs only: no stored company research is loaded by the application.
const basis={currency:'CNY',period:'2023—2025完整年度，2026-09-08截止',shareBasis:'普通股，元与股',assumptions:'合成假设；非真实证券资料',sourceIds:['S1']};
const source={id:'S1',official:true,type:'official-report',title:'合成披露',text:'合成归母利润100，现金分红70，营业收入1000'};
const cash={cashFlow:70,growth:.03,discount:.09,terminalGrowth:.025,years:5,shares:10,kind:'FCFE',basis};
const earnings={equity:1000,shares:10,roeLow:.1,roeHigh:.12,peLow:18,peHigh:22,basis};
const records=()=>[{toolCallId:'cash',toolName:'calculate_dcf',arguments:cash,result:{...dcf(cash),basis}},{toolCallId:'earnings',toolName:'calculate_normalized_earnings',arguments:earnings,result:{...normalizedEarnings(earnings),basis}}];
const grid=()=>({baseToolCallId:'cash',growthRates:[.01,.03,.05],discountRates:[.08,.09,.1],basis});
const event=(year,more={})=>({eventId:'annual-'+year,revisionDate:(year+1)+'-06-01',fiscalYear:year,kind:'ordinary',status:'implemented',paymentDate:(year+1)+'-06-20',dps:7,totalCash:70,sourceIds:['S1'],...more});
const shareholder=()=>({asOf:'2026-09-08',latestFiscalYear:2025,price:140,events:[event(2023),event(2024),event(2025)],profits:[2023,2024,2025].map(year=>({year,profit:100,ocf:80,capex:10,sourceIds:['S1']})),reportedAggregate:null,basis});
const scenarios=()=>({models:[{label:'基准',toolCallId:'earnings'}],payout:.75,yields:[.03,.04,.05],policyThrough:'2026年',continuationAssumption:'2027年后沿用仅为假设',basis});

test('DCF matrix preserves saved baseline and invalid cells without averaging or invented receipts',()=>{
 const inputs=records(),before=structuredClone(inputs),r=dcfSensitivity(grid(),{records:inputs});
 assert.equal(r.cells.length,9);assert.equal(r.cells[4].perShare,dcf(cash).perShare);assert.deepEqual(inputs,before);
 const partial=dcfSensitivity({...grid(),discountRates:[.02,.09]},{records:inputs});assert.equal(partial.invalidCells,3);assert.equal(partial.status,'incomplete');assert.equal(partial.cells[0].perShare,null);assert.ok(partial.cells[1].perShare>0);
 for(const change of [a=>a.baseToolCallId='invented',a=>a.growthRates=[.03,.03],a=>a.discountRates=[Infinity],a=>a.basis={...basis,currency:'HKD'},a=>a.basis={...basis,sourceIds:[]}]){const a=grid();change(a);assert.throws(()=>dcfSensitivity(a,{records:inputs}));}
 assert.throws(()=>dcfSensitivity(grid(),{records:[...inputs,inputs[0]]}),/唯一/);
});

test('dividend scenarios reference actual EPS and retain policy expiry instead of promising payouts',()=>{
 const r=dividendScenarios(scenarios(),{records:records()});assert.deepEqual(r.scenarios[0].dps,[7.5,9]);assert.equal(r.scenarios[0].anchors[0][1].price,187.5);assert.match(r.continuationAssumption,/仅为假设/);
 for(const patch of [{payout:1.1},{models:[{label:'假',toolCallId:'cash'}]},{policyThrough:''},{yields:[0]},{continuationAssumption:''}])assert.throws(()=>dividendScenarios({...scenarios(),...patch},{records:records()}));
});

test('shareholder ledger separates attribution from pay dates, dedupes revisions, preserves missing years and conflicts',()=>{
 const a=shareholder();a.events.push({...event(2025),revisionDate:'2026-04-01',status:'proposal',dps:6,totalCash:60},event(2025));
 const r=shareholderReturn(a,{sources:[source]});assert.equal(r.annual.length,8);assert.equal(r.annual[0].dps,null);assert.equal(r.annual.at(-1).cash,70);assert.equal(r.ttm.dps,7);assert.equal(r.ttm.yield,.05);assert.equal(r.rollingThreeYears.payout,.7);assert.equal(r.rollingThreeYears.quickFcfCoverage,1);assert.equal(r.revisions.at(-1).olderVersions,1);assert.equal(r.revisions.at(-1).duplicateCopies,1);assert.match(r.notice,/不独立证明实际付款/);
 const conflict=shareholder();conflict.events.push({...event(2025),dps:8});const cr=shareholderReturn(conflict,{sources:[source]});assert.equal(cr.conflicts.length,1);assert.equal(cr.ttm.dps,null);assert.equal(cr.annual.at(-1).cash,null);assert.equal(cr.rollingThreeYears.payout,null);
 const alias=shareholder();alias.events.push(event(2025,{eventId:'adjusted-2025'}));assert.equal(shareholderReturn(alias,{sources:[source]}).ttm.dps,null);
 const wrongYear=shareholder();wrongYear.events.push(event(2025,{fiscalYear:2024}));assert.throws(()=>shareholderReturn(wrongYear,{sources:[source]}),/归属年度不一致/);
});

test('future and unknown payments do not inflate TTM; aggregates use total profit rather than one-year average',()=>{
 const a=shareholder();a.events.push(event(2026,{eventId:'2026-interim',revisionDate:'2026-08-31',paymentDate:'2026-10-01',kind:'interim'}));a.reportedAggregate={startYear:2023,endYear:2025,cash:200,averageProfit:110,sourceIds:['S1']};
 const r=shareholderReturn(a,{sources:[source]});assert.equal(r.ttm.dps,7);assert.equal(r.rollingThreeYears.payout,.7);assert.equal(r.aggregateCheck.cashDifference,10);assert.equal(r.aggregateCheck.profitDifference,-10);assert.equal(r.aggregateCheck.status,'mismatch');
 a.events.at(-1).paymentDate=null;assert.equal(shareholderReturn(a,{sources:[source]}).ttm.dps,null);
 a.events.at(-1).status='approved';assert.equal(shareholderReturn(a,{sources:[source]}).ttm.dps,7);
});

test('ledger rejects invalid dates, ambiguous sources, duplicate annual profits and numerical overflow',()=>{
 for(const change of [a=>a.asOf='2026-02-30',a=>a.price=0,a=>a.events[0].sourceIds=['missing'],a=>a.events[0].revisionDate='2027-01-01',a=>a.events[0].dps=-1,a=>a.profits.push(a.profits[0]),a=>a.profits[0].capex=-1,a=>a.events.forEach(e=>e.totalCash=Number.MAX_VALUE)]){const a=shareholder();change(a);assert.throws(()=>shareholderReturn(a,{sources:[source]}));}
 assert.throws(()=>shareholderReturn(shareholder(),{sources:[{...source,official:false}]}));
 const a=shareholder();a.asOf='2024-02-29';a.latestFiscalYear=2023;a.events=[];a.profits=[];assert.equal(shareholderReturn(a,{sources:[source]}).ttm.startExclusive,'2023-02-28');
});

test('agent dispatches the new tools, checkpoints actual inputs, supplies audit evidence and exports results',async()=>{
 const original=global.fetch,events=[],job={id:'synthetic-cash-return',mode:'B',input:{mode:'B',depth:'Deep',question:'合成公司的深度投资研究',sources:[source],securities:[]}};
 const steps=[['cash','calculate_dcf',cash],['earnings','calculate_normalized_earnings',earnings],['grid','calculate_dcf_sensitivity',grid()],['payout','calculate_dividend_scenarios',scenarios()],['ledger','calculate_shareholder_return',shareholder()]];
 let calls=0;
 global.fetch=async(_url,options)=>{const request=JSON.parse(options.body),i=calls++;
  assert.match(request.messages[0].content,/calculate_shareholder_return/);
  if(i<steps.length){const [id,name,args]=steps[i];assert.ok(request.tools.some(t=>t.function.name===name));return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});}
  if(i===steps.length)return Response.json({choices:[{message:{role:'assistant',content:'合成研究：保留现金、分红和模型限制。[S1]'}}]});
  const audit=JSON.parse(request.messages[1].content);assert.ok(audit.toolEvidence.some(r=>r.toolName==='calculate_dcf_sensitivity'&&r.result.cells.length===9));assert.ok(audit.toolEvidence.some(r=>r.toolName==='calculate_shareholder_return'&&r.result.rollingThreeYears.payout===.7));
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 try{
  job.result=await runAgent(job,(type,message,extra)=>events.push({type,message,...extra}),new AbortController().signal);job.status='completed';job.events=events;
  assert.equal(job.checkpoint.toolRecords.length,5);assert.ok(!events.some(e=>e.result?.error));assert.equal(researchAnalysisReceipts(job).length,3);
  const md=exportResearchMarkdown(job);assert.match(md,/分红与敏感性核对/);assert.match(md,/rollingThreeYears/);assert.match(md,/baseToolCallId/);
  assert.match(exportExecutionMarkdown({...job,status:'failed'}),/calculate_shareholder_return/);
  for(const name of ['calculate_shareholder_return','calculate_dcf_sensitivity','calculate_dividend_scenarios'])assert.ok(!toolsForMode('A').some(t=>t.function.name===name));
 }finally{global.fetch=original;}
});
