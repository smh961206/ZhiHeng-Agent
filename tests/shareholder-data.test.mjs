import test from 'node:test';
import assert from 'node:assert/strict';
import {createShareholderFetcher,parseActionTable,dividendCoverage,shareTimeline} from '../server/shareholder-data.mjs';
import {checkDataBasis} from '../server/data-basis.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {parseLongbridge} from '../server/longbridge-quotes.mjs';
import {collectMarketData} from '../server/market-data.mjs';

const cn={market:'CN',symbol:'600519'},clock=()=>Date.parse('2026-09-06T12:00:00Z');
const paid={ts_code:'600519.SH',end_date:'20251231',ann_date:'20260401',div_proc:'实施',cash_div_tax:2,cash_div:null,pay_date:'20260601',record_date:'20260529',ex_date:'20260601',base_share:100,stk_div:0};
const buyback={ts_code:'600519.SH',ann_date:'20250801',end_date:'20250731',proc:'实施',vol:10,amount:100};
const shares={ts_code:'600519.SH',trade_date:'20251231',total_share:120.3456,float_share:100,free_share:null};
function table(rows,emptyFields){const fields=rows.length?Object.keys(rows[0]):emptyFields;return {code:0,data:{fields,items:rows.map(row=>fields.map(field=>row[field]??null))}};}
function clientHarness(handler){const calls=[];const client=async(api,params,options)=>{calls.push({api,params,options});return {data:await handler(api,params,options),fetchedAt:'2026-09-06T12:00:00Z'};};client.configured=()=>true;return {client,calls};}
const defaults=api=>api==='dividend'?table([paid]):api==='repurchase'?table([buyback]):table([shares]);

test('action schemas preserve nulls, require the exact target and validate dates/numbers',()=>{
 assert.equal(parseActionTable(table([paid]),'dividend',cn)[0].cash_div,null);
 assert.throws(()=>parseActionTable(table([{...paid,ts_code:'000001.SZ'}]),'dividend',cn),/不匹配/);
 assert.throws(()=>parseActionTable(table([{...paid,pay_date:'20260230'}]),'dividend',cn),/日期/);
 assert.throws(()=>parseActionTable(table([{...shares,total_share:'100'}]),'daily_basic',cn),/数值/);
 assert.equal(parseActionTable(table([{...buyback,ts_code:'200012.SZ'}]),'repurchase',cn,{marketWide:true}).length,1);
 assert.equal(parseActionTable(table([{...buyback,ts_code:'200012.SZ',amount:-1}]),'repurchase',cn,{marketWide:true}).length,1);
 assert.throws(()=>parseActionTable(table([{...buyback,ts_code:123}]),'repurchase',cn,{marketWide:true}),/不匹配/);
});

test('dividend coverage separates proposals, future payments, ambiguous revisions and missing years',()=>{
 const rows=[paid,{...paid,div_proc:'预案'},{...paid,end_date:'20260630',pay_date:'20261001'},
  {...paid,end_date:'20241231',cash_div_tax:1},{...paid,end_date:'20241231',cash_div_tax:3}];
 const result=dividendCoverage(rows,[2023,2024,2025,2026],'20260906');
 assert.equal(result[0].status,'missing');assert.equal(result[1].status,'ambiguous');
 assert.equal(result[2].implementedRecords,1);assert.equal(result[2].observedPaidRecords,1);
 assert.equal(result[3].observedPaidRecords,0);assert.equal(result[2].regularVsSpecialVerified,false);
 assert.equal(result[0].cashDividend,undefined,'absence is never converted into zero cash');
});

test('share history converts ten-thousand-share units and preserves observations without inventing causes',()=>{
 const timeline=shareTimeline([shares,{...shares,trade_date:'20251230',total_share:100},{...shares,trade_date:'20260102'}]);
 assert.equal(timeline.observations,3);assert.equal(timeline.changes.length,2);
 assert.equal(timeline.changes[1].totalShares,1203456);assert.equal(timeline.changes[1].freeShares,null);assert.equal(timeline.changes[1].changeCause,null);
 assert.equal(timeline.lastDate,'20260102');assert.equal(timeline.annualSnapshots.length,2);
 assert.throws(()=>shareTimeline([shares,{...shares,total_share:200}]),/冲突/);
});

test('full repurchase responses split dates, filter the exact ticker and deduplicate repeated snapshots',async()=>{
 let calls=0;const {client}=clientHarness((api,params)=>{
  if(api!=='repurchase')return defaults(api);
  if(++calls===1)return table(Array.from({length:2000},()=>buyback));
  return table(params.end_date<'20250801'?[{...buyback,ts_code:'200012.SZ',ann_date:params.start_date}]:[buyback]);
 });
 const result=await createShareholderFetcher({client,clock})(cn,{years:8});
 const coverage=result.coverage.find(item=>item.api==='repurchase');
 assert.equal(calls,3);assert.equal(coverage.rows,1);assert.equal(coverage.limited,false);assert.equal(coverage.totalBuybackCash,null);
 assert.equal(result.sources.length,3);assert.doesNotMatch(result.sources.find(source=>source.api==='repurchase').text,/200012/);
 assert.equal(result.sources.every(source=>source.official===false),true);
});

test('repurchase limits and partial failures retain usable target records and expose unresolved ranges',async()=>{
 const {client}=clientHarness(api=>api==='repurchase'?table(Array.from({length:2000},()=>buyback)):defaults(api));
 const result=await createShareholderFetcher({client,clock,maxRepurchaseRequests:1})(cn,{years:8});
 const entry=result.coverage.find(item=>item.api==='repurchase');assert.equal(entry.limited,true);assert.equal(entry.rows,1);assert.equal(entry.unresolvedRanges.length,2);
 let calls=0;const failing=clientHarness(api=>{if(api!=='repurchase')return defaults(api);if(++calls>1)throw new Error('upstream unavailable');return table(Array.from({length:2000},()=>buyback));});
 const partial=await createShareholderFetcher({client:failing.client,clock})(cn,{years:8});
 assert.equal(partial.records.repurchase.length,1);assert.ok(partial.warnings.some(w=>w.includes('部分范围失败')));
});

test('missing permissions, empty data and unsupported markets do not fabricate shareholder evidence',async()=>{
 const {client,calls}=clientHarness(api=>{if(api==='repurchase')throw new Error('no access');if(api==='dividend')return table([],Object.keys(paid));return defaults(api);});
 const fetcher=createShareholderFetcher({client,clock}),result=await fetcher(cn);
 assert.equal(result.sources.length,1);assert.equal(result.coverage[0].status,'empty');assert.equal(result.coverage[1].status,'failed');
 const before=calls.length;assert.equal((await fetcher({market:'HK',symbol:'00700'})).supported,false);assert.equal(calls.length,before);
 const abort=new AbortController();abort.abort();await assert.rejects(fetcher(cn,{signal:abort.signal}));assert.equal(calls.length,before);
});

test('repurchase time budget keeps completed evidence and stops scheduling further requests',async()=>{
 let time=clock(),calls=0;
 const {client}=clientHarness(api=>{if(api==='repurchase'){calls++;time+=20;return table(Array.from({length:2000},()=>buyback));}return defaults(api);});
 const result=await createShareholderFetcher({client,clock:()=>time,repurchaseBudgetMs:10})(cn,{years:8});
 assert.equal(calls,1);assert.equal(result.records.repurchase.length,1);
 assert.equal(result.coverage.find(item=>item.api==='repurchase').unresolvedRanges.length,2);
});

test('financial basis detects absent years, revisions, missing opening equity and balance conflicts',()=>{
 const rows=[{end_date:'20251231',report_type:'1',n_income_attr_p:100},{end_date:'20251231',report_type:'1',n_income_attr_p:110}];
 const result=checkDataBasis(cn,{years:3,clock,financials:{records:{income:rows,balancesheet:[{end_date:'20251231',report_type:'1',total_assets:100,total_liab:90,total_hldr_eqy_inc_min_int:20}]}}});
 const get=id=>result.checks.find(item=>item.id===id);
 assert.deepEqual(get('income').missingYears,[2023,2024]);assert.deepEqual(get('income').conflictingYears,[2025]);
 assert.equal(get('opening-equity').period,'20221231');assert.equal(get('opening-equity').status,'missing');assert.equal(get('balance-identity').status,'needs-review');
 assert.equal(get('currency-period-share-basis').status,'needs-review');assert.equal(result.status,'requires-review');
 assert.equal(checkDataBasis(cn,{clock}).checks.find(item=>item.id==='balance-identity').status,'missing');
});

test('calculations reject generated checks, unmatched currencies, mixed securities and vendor-only financials',()=>{
 const basis={currency:'CNY',period:'FY2025',shareBasis:'普通股',assumptions:'fixture',sourceIds:['S1']};
 const vendor={id:'S1',type:'shareholder-data',official:false,security:'CN:600519'};
 assert.throws(()=>calculationBasis(basis,[{id:'S1',type:'data-check'}]),/覆盖检查/);
 assert.throws(()=>calculationBasis(basis,[vendor]),/官方披露/);
 const official={id:'S2',type:'official-report',official:true,security:'CN:600519'};
 assert.equal(calculationBasis({...basis,sourceIds:['S1','S2']},[vendor,official]).currency,'CNY');
 assert.throws(()=>calculationBasis({...basis,sourceIds:['S1','S2']},[vendor,{...official,security:'HK:00700'}]),/不同证券/);
 assert.throws(()=>calculationBasis(basis,[{id:'S1',type:'quote',currency:'HKD'}]),/币种/);
});

test('Longbridge capital is in shares and is never labelled as diluted or effective on quote time',()=>{
 const quote=parseLongbridge({symbol:'700.HK',lastDone:'100',prevClose:'99',timestamp:'2026-09-04T08:00:00Z',info:{symbol:'700.HK',currency:'HKD',totalShares:100000,circulatingShares:90000,hkShares:80000,fetchedAt:'2026-09-06T10:00:00Z'}},{market:'HK',symbol:'00700'});
 assert.equal(quote.shareCapital.totalShares,100000);assert.equal(quote.shareCapital.hkShares,80000);assert.equal(quote.shareCapital.asOf,null);assert.equal(quote.shareCapital.shareBasisVerified,false);
});

test('collected shareholder sources get IDs and checks but cannot satisfy official coverage',async()=>{
 const previous=global.fetch;global.fetch=async()=>new Response('',{status:404});let history;
 try{
  const result=await collectMarketData([cn],{years:8,quotes:async()=>{throw new Error('quote offline');},listReports:async()=>{throw new Error('official directory offline');},financials:async(_,{years})=>{history=years;return {configured:false};},shareholder:async()=>({configured:true,supported:true,sources:[{title:'fixture',text:'fixture',type:'shareholder-data',security:'CN:600519'}],warnings:[],coverage:[]})});
  assert.equal(history,9);assert.equal(result.coverage[0].read,0);assert.equal(result.shareholderCoverage.length,1);
  assert.equal(result.sources.at(-1).type,'data-check');assert.deepEqual(result.dataChecks[0].sourceIds,[result.sources[0].id]);
 }finally{global.fetch=previous;}
});
