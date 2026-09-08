import test from 'node:test';
import assert from 'node:assert/strict';
import {createDisclosureReader} from '../server/agent-disclosures.mjs';
import {reinvestmentDiagnostics} from '../server/reinvestment.mjs';
import {reviewValuationModels} from '../server/valuation-review.mjs';
import {valuationSnapshot} from '../server/valuation-snapshot.mjs';
import {researchExecutionChecks,toolResultHasGap} from '../shared/research-execution-checks.mjs';
import {exportExecutionMarkdown} from '../shared/research-export.mjs';
import {runAgent,toolsForMode} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

// All financial values and remote responses below are synthetic, not BYD data.
const basis={currency:'CNY',period:'2026H1与2025H1',shareBasis:'全体普通股，单位股；金额元',assumptions:'合成核算测试',sourceIds:['S1']};
const source={id:'S1',type:'official-report',official:true,security:'CN:002594',text:'营业收入 1000 900；研发投入 100 80；费用化 80 76；资本化 20 4',title:'合成财报'};
const row=(year,values={})=>({start:year+'-01-01',end:year+'-06-30',sourceIds:['S1'],revenue:1000,profit:100,ocf:200,capex:150,rdTotal:100,rdExpensed:80,rdCapitalized:20,...values});
const inputs=()=>({current:row(2026),previous:row(2025,{revenue:900,ocf:150,capex:160,rdTotal:80,rdExpensed:76,rdCapitalized:4}),basis});
const sec={market:'CN',symbol:'002594',name:'合成标的'};
const task=()=>({id:'test',mode:'B',input:{question:'合成深度研究，私密持仓文本',mode:'B',securities:[sec],sources:[structuredClone(source)]}});
const args={security:'CN:002594',topic:'sales',from:'2026-08-01',to:'2026-09-08',maxReports:2};
const announcement=(id,extra={})=>({secCode:'002594',announcementTitle:'合成产销公告 '+id,announcementTime:Date.parse('2026-09-01T00:00:00Z'),adjunctUrl:`finalpage/2026-09-01/${id}.PDF`,...extra});
const response=items=>Buffer.from(JSON.stringify({announcements:items,hasMore:false}));
const reader=overrides=>createDisclosureReader({catalog:async()=>[{code:'002594',orgId:'gssz0002594'}],clock:()=>Date.parse('2026-09-08T12:00:00Z'),request:async()=>response([announcement(1)]),readReport:async r=>({...r,type:'official-report',text:'合成产销 100',pages:1,sha256:'a'.repeat(64),fetchedAt:'2026-09-08T01:00:00Z'}),...overrides});

test('official disclosure lookup sends fixed public fields, adds readable unique sources, and reuses saved originals',async()=>{
 const j=task();j.input.sources.push({id:'S3',type:'note',text:'keep'});let reads=0;
 const read=reader({request:async(url,options)=>{
  assert.equal(url,'https://www.cninfo.com.cn/new/hisAnnouncement/query');assert.equal(options.method,'POST');
  const form=new URLSearchParams(options.body);assert.equal(form.get('stock'),'002594,gssz0002594');assert.equal(form.get('searchkey'),'产销');assert.equal(form.get('pageSize'),'30');
  assert.ok(!options.body.includes('私密'));return response([announcement(1),announcement(1),announcement(2,{secCode:'600519'}),announcement(3,{adjunctUrl:'https://evil.invalid/x.pdf'}),announcement(4,{adjunctUrl:'http://['})]);
 },readReport:async r=>{reads++;return {...r,type:'official-report',text:'产销 100',pages:1};}});
 const result=await read(args,{job:j});assert.equal(result.status,'located');assert.deepEqual(result.sourceIds,['S2']);assert.equal(j.input.sources.length,3);assert.equal(j.input.sources[2].disclosureTopic,'sales');
 const again=await read(args,{job:j});assert.equal(again.read[0].reused,true);assert.equal(reads,1);assert.equal(j.input.sources.length,3);
});
test('official disclosure budgets and scope reject unauthorized symbols, future dates and ambiguous identity',async()=>{
 let requested=0;const read=reader({request:async()=>{requested++;return response([]);}}),j=task();
 for(const change of [{security:'CN:600519'},{security:'HK:01211'},{to:'2026-09-09'},{from:'2026-02-30'},{maxReports:4},{topic:'任意私密查询'}])await assert.rejects(()=>read({...args,...change},{job:j}));
 await assert.rejects(()=>read(args,{job:j,records:Array.from({length:6},()=>({toolName:'read_official_disclosures',result:{error:'old failure'}}))}),/预算/);
 assert.equal(requested,0);
 await assert.rejects(()=>reader({catalog:async()=>[{code:'002594',orgId:'a'},{code:'002594',orgId:'b'}]})(args,{job:j}),/唯一/);
});
test('official disclosure failures remain partial or failed, not empty evidence; truncation and stale reads remain visible',async()=>{
 const j=task(),read=reader({request:async()=>Buffer.from(JSON.stringify({announcements:[announcement(1),announcement(2),announcement(3)],hasMore:true})),readReport:async r=>{if(r.url.endsWith('2.PDF'))throw new Error('synthetic timeout');return {...r,type:'official-report',text:'部分正文',truncated:true,stale:true};}});
 const result=await read(args,{job:j});assert.equal(result.status,'partial');assert.equal(result.limited,true);assert.equal(result.failures.length,1);assert.equal(result.read[0].stale,true);assert.equal(j.input.sources.length,2);
 const failed=await reader({readReport:async()=>{throw new Error('network');}})(args,{job:task()});assert.equal(failed.status,'failed');assert.deepEqual(failed.sourceIds,[]);
 const empty=await reader({request:async()=>Buffer.from('{"announcements":null,"totalAnnouncement":0}')})(args,{job:task()});assert.equal(empty.status,'not-found');
 for(const payload of ['{}','null','{"announcements":null,"totalAnnouncement":null}'])await assert.rejects(()=>reader({request:async()=>Buffer.from(payload)})(args,{job:task()}),/格式无效/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>reader()(args,{job:task(),signal:controller.signal}),/abort/i);
});
test('reinvestment computes like-for-like R&D and cash changes, preserves nulls and rejects mixed periods or amounts',()=>{
 const output=reinvestmentDiagnostics(inputs(),{sources:[source]});assert.equal(output.current.metrics.rdCapitalization,.2);assert.equal(output.previous.metrics.rdCapitalization,.05);assert.ok(Math.abs(output.changes.rdCapitalizationPercentagePoints-15)<1e-10);assert.equal(output.changes.quickFCF,60);assert.equal(output.sameRateSensitivity.extraCapitalized,15);
 assert.match(output.limitations.join(''),/不是虚增利润/);assert.match(output.limitations.join(''),/不是FCFE/);
 for(const change of [r=>r.previous.end='2025-12-31',r=>r.current.rdExpensed=70,r=>r.current.capex=-1,r=>r.current.revenue=Infinity,r=>r.current.sourceIds=['NOPE']]){const r=inputs();change(r);assert.throws(()=>reinvestmentDiagnostics(r,{sources:[source]}));}
 const missing=inputs();missing.current.rdCapitalized=null;const r=reinvestmentDiagnostics(missing,{sources:[source]});assert.equal(r.status,'incomplete');assert.equal(r.sameRateSensitivity.extraCapitalized,null);assert.equal(r.current.metrics.rdCapitalization,null);
});
const modelRecords=()=>[{toolCallId:'profit-1',toolName:'calculate_normalized_earnings',arguments:{shares:100},result:{value:[20,30],basis}},
 {toolCallId:'cash-1',toolName:'calculate_dcf',arguments:{shares:100},result:{perShare:8,terminalShare:.8,basis}}];
const models=()=>({models:[{toolCallId:'profit-1',role:'primary',limitation:'正常化ROE是假设'},{toolCallId:'cash-1',role:'stress-test',limitation:'仅条件式现金兑现'}]});
test('valuation review uses actual receipts, separates stress tests, rejects fabricated or incompatible inputs',()=>{
 const result=reviewValuationModels(models(),{records:modelRecords()});assert.equal(result.comparisons[0].relation,'below-primary');assert.equal(result.comparisons[0].gap,12);assert.equal(result.comparisons[0].role,'stress-test');assert.equal(result.fairValue,undefined);
 for(const change of [r=>r[1].toolCallId='other',r=>r[1].result.error='failed',r=>r[1].arguments.shares=200,r=>r[1].result={...r[1].result,basis:{...basis,currency:'HKD'}},r=>r[1].result.perShare=NaN,r=>r.push(r[1])]){const records=modelRecords();change(records);assert.throws(()=>reviewValuationModels(models(),{records}));}
 const bad=models();bad.models[1].role='primary';assert.throws(()=>reviewValuationModels(bad,{records:modelRecords()}));
});
test('ownership snapshot distinguishes A-price-equivalent from combined capitalization and deducts other equity once',()=>{
 const quote={price:20,currency:'CNY',asOf:'2026-09-08T01:00:00Z'},sources=[source,{id:'Q1',type:'quote',text:JSON.stringify(quote)}],stock=value=>({date:'2026-06-30',value,sourceIds:['S1']});
 const params={valuationBasis:'all-common-at-quote',equityBasis:'parent',otherEquity:stock(100),quote:{...quote,sourceId:'Q1'},shares:{...stock(100),changesReviewed:true},annual:{start:'2025-01-01',end:'2025-12-31',value:100,sourceIds:['S1']},current:null,previous:null,equity:stock(1000),earningsFactors:[1],peMultiples:[20],basis:{...basis,sourceIds:['S1','Q1']}};
 const result=valuationSnapshot(params,{sources});assert.equal(result.equityValueAtQuote,2000);assert.equal(result.marketCap,null);assert.equal(result.actualCombinedMarketCap,null);assert.equal(result.commonEquity,900);assert.equal(result.pbCommon,2000/900);
 assert.throws(()=>valuationSnapshot({...params,equityBasis:'common'},{sources}),/重复扣除/);
 assert.equal(valuationSnapshot({...params,equityBasis:'common',otherEquity:null,equity:stock(900)},{sources}).commonEquity,900);
 assert.equal(valuationSnapshot({...params,otherEquity:null},{sources}).pbCommon,null);
 assert.equal(valuationSnapshot({...params,valuationBasis:'unknown'},{sources}).marketCap,null);
});
const eventPair=(name,id,result)=>[{type:'tool',toolName:name,toolCallId:id,arguments:{marker:'PUBLIC_INPUT'}},{type:'tool_result',toolName:name,toolCallId:id,result}];
test('execution checks report actual limitations and interrupted exports never leak checkpoints or incomplete drafts',()=>{
 const job={...task(),status:'failed',events:[...eventPair('read_source_pages','page-1',{status:'unavailable'}),...eventPair('verify_financial_inputs','verify-1',{unresolved:1}),...eventPair('calculate_reinvestment','rd-1',{status:'calculated-needs-review'}),{type:'tool',toolName:'review_valuation_models',toolCallId:'pending',arguments:{models:[]}}],checkpoint:{messages:[{content:'HIDDEN_CHECKPOINT'}]},preview:{text:'UNFINISHED_DRAFT'},result:{report:'UNSAVED_REPORT'},delivery:{status:'failed'}};
 const checks=researchExecutionChecks(job);assert.equal(checks.find(c=>c.id==='pages').state,'has-gaps');assert.equal(checks.find(c=>c.id==='cash').state,'returned');assert.equal(checks.find(c=>c.id==='models').state,'pending');assert.equal(checks.find(c=>c.id==='disclosures').state,'not-recorded');
 for(const result of [{status:'partial'},{limited:true},{pages:[{status:'unreadable'}]},{checks:[{status:'mismatch'}]}])assert.ok(toolResultHasGap(result));
 const md=exportExecutionMarkdown(job);assert.match(md,/PUBLIC_INPUT/);assert.match(md,/未保存返回/);assert.match(md,/不是正式研究报告/);assert.doesNotMatch(md,/HIDDEN_CHECKPOINT|UNFINISHED_DRAFT|UNSAVED_REPORT/);
 for(const status of ['queued','running','cancelled','completed'])assert.match(exportExecutionMarkdown({...job,status}),/已保存执行记录/);
});
test('platform agent dispatches discovery → search added source → reinvestment → model receipts → review and audit',async()=>{
 const original=global.fetch,j=task(),events=[];j.input.securities=[]; // No network collection: disclosure scope is unit-tested above.
 const earnings={equity:1000,shares:100,roeLow:.1,roeHigh:.2,peLow:20,peHigh:25,basis},cash={cashFlow:10,growth:0,discount:.1,terminalGrowth:0,shares:100,kind:'FCFE',basis};
 const steps=[['disclosure','read_official_disclosures',args],['read-added','search_evidence',{sourceId:'S2',query:'产销'}],['rd','calculate_reinvestment',inputs()],['profit-1','calculate_normalized_earnings',earnings],['cash-1','calculate_dcf',cash],['models','review_valuation_models',models()]];
 let count=0;
 global.fetch=async(_url,options)=>{const request=JSON.parse(options.body),i=count++;
  if(i<steps.length){assert.ok(request.tools.some(t=>t.function.name==='read_official_disclosures'));const [id,name,args]=steps[i];return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});}
  if(i===steps.length)return Response.json({choices:[{message:{role:'assistant',content:'合成报告：利润与现金估值冲突，现金仅为压力测试。[S1][S2]'}}]});
  const audit=JSON.parse(request.messages[1].content);assert.ok(audit.toolEvidence.some(r=>r.toolName==='review_valuation_models'&&r.result.comparisons[0].role==='stress-test'));assert.ok(audit.initialEvidence.some(e=>e.id==='S2'));assert.ok(audit.sourceCatalog.some(s=>s.id==='S2'));
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(j.input))}}]});
 };
 try{
  const result=await runAgent(j,(type,message,extra)=>events.push({type,message,...extra}),new AbortController().signal,{disclosureReader:async(_args,{job})=>{job.input.sources.push({...source,id:'S2',text:'合成专项公告：产销 100'});return {status:'located',sourceIds:['S2']};}});
  assert.ok(result.report);assert.equal(count,8);assert.ok(!events.some(e=>e.result?.error));assert.equal(j.checkpoint.toolRecords.length,6);assert.ok(j.input.sources.some(s=>s.id==='S2'));assert.equal(j.checkpoint.toolRecords[5].result.primary,'profit-1');
  assert.ok(!toolsForMode('A').some(t=>t.function.name==='review_valuation_models'));
 }finally{global.fetch=original;}
});
