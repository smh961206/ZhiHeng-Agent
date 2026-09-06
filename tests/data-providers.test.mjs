import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {providerStatus,redactProviderError} from '../server/data-provider-config.mjs';
import {longbridgeSymbol,parseLongbridge,createLongbridgeFetcher} from '../server/longbridge-quotes.mjs';
import {tushareSymbol,parseTushareTable,createTushareFinancials} from '../server/tushare-financials.mjs';
import {createQuoteFetcher,collectMarketData} from '../server/market-data.mjs';
import {createRemoteClient} from '../server/market-request.mjs';

const us={market:'US',symbol:'AAPL'},cn={market:'CN',symbol:'600519'},hk={market:'HK',symbol:'00700'};
const keys={appKey:'fixture-app',appSecret:'fixture-secret',accessToken:'fixture-access'};
const quote={symbol:'AAPL.US',lastDone:'100.125',prevClose:'100',timestamp:'2026-09-04T20:00:00.000Z',info:{symbol:'AAPL.US',name:'Apple',currency:'USD'}};

test('provider status exposes flags only and incomplete credentials do not enable Longbridge',()=>{
 const status=providerStatus({TUSHARE_TOKEN:'secret',LONGBRIDGE_APP_KEY:'app'});
 assert.deepEqual(status,{tushare:{configured:true},longbridge:{configured:false,partial:true}});
 assert.doesNotMatch(JSON.stringify(status),/secret/);
 assert.doesNotMatch(redactProviderError(new Error('Bearer secret-token fixture-secret'),['fixture-secret']),/secret-token|fixture-secret/);
});

test('provider symbols preserve markets, HK padding conventions and US share classes',()=>{
 assert.equal(longbridgeSymbol(cn),'600519.SH');assert.equal(longbridgeSymbol(hk),'700.HK');
 assert.equal(longbridgeSymbol({market:'US',symbol:'BRK-B'}),'BRK.B.US');
 assert.throws(()=>longbridgeSymbol({market:'CN',symbol:'920001'}),/其他行情源/);
 assert.equal(tushareSymbol(cn),'600519.SH');assert.equal(tushareSymbol(hk),'00700.HK');
 assert.equal(tushareSymbol({market:'CN',symbol:'920001'}),'920001.BJ');assert.equal(tushareSymbol(us),'AAPL');
});

test('Longbridge parses decimal values and source timestamps, rejecting missing identity/currency',()=>{
 const q=parseLongbridge(quote,us,'2026-09-06T10:00:00Z');assert.equal(q.price,100.125);assert.ok(Math.abs(q.changePercent-.125)<1e-10);
 assert.equal(q.asOf,quote.timestamp);assert.equal(q.fetchedAt,'2026-09-06T10:00:00Z');assert.equal(q.official,false);
 for(const bad of [{...quote,lastDone:''},{...quote,lastDone:'Infinity'},{...quote,timestamp:'invalid'},{...quote,info:{...quote.info,currency:''}},{...quote,symbol:'MSFT.US'}])assert.throws(()=>parseLongbridge(bad,us));
});

function workerHarness(options={}){
 const workers=[];
 const fetchQuote=createLongbridgeFetcher({credentials:()=>keys,createWorker:()=>{
  const worker=new EventEmitter();worker.messages=[];worker.terminated=0;
  worker.postMessage=message=>worker.messages.push(message);worker.ref=()=>{};worker.unref=()=>{};
  worker.terminate=async()=>{worker.terminated++;};workers.push(worker);return worker;
 },...options});
 return {fetchQuote,workers};
}
test('Longbridge shares a context, isolates cancellation and terminates abandoned requests',async()=>{
 const {fetchQuote,workers}=workerHarness();
 const controller=new AbortController();
 const first=fetchQuote(us,controller.signal),second=fetchQuote(us);
 assert.equal(workers.length,1);const worker=workers[0];
 controller.abort(new Error('caller left'));await assert.rejects(first,/caller left/);assert.equal(worker.terminated,0);
 worker.emit('message',{id:worker.messages[1].id,value:quote});assert.equal((await second).price,100.125);
 const thirdController=new AbortController(),third=fetchQuote(us,thirdController.signal);
 thirdController.abort(new Error('last left'));await assert.rejects(third,/last left/);assert.equal(worker.terminated,1);
 const fourth=fetchQuote(us);assert.equal(workers.length,2);
 workers[1].emit('message',{id:workers[1].messages[0].id,value:quote});const fourthQuote=await fourth;assert.equal(typeof fourthQuote.fetchedAt,'string');fetchQuote.close();
});
test('Longbridge timeouts release connections and worker errors redact credentials',async()=>{
 const {fetchQuote,workers}=workerHarness({timeoutMs:5});await assert.rejects(fetchQuote(us),/超时/);assert.equal(workers[0].terminated,1);
 const failed=fetchQuote(us);workers[1].emit('error',new Error('credential fixture-secret fixture-access'));
 await assert.rejects(failed,error=>!error.message.includes('fixture-secret')&&!error.message.includes('fixture-access'));
});

test('configured Longbridge takes priority; failure falls back to existing public data',async()=>{
 let legacy=0;
 const request=async()=>{legacy++;return Buffer.from(JSON.stringify({chart:{result:[{meta:{symbol:'AAPL',currency:'USD',regularMarketPrice:98,regularMarketTime:1788552001}}]}}));};
 const primary=createQuoteFetcher({request,longbridgeConfigured:()=>true,longbridge:async()=>parseLongbridge(quote,us)});
 assert.equal((await primary(us)).provider,'长桥 OpenAPI');assert.equal(legacy,0);
 const fallback=createQuoteFetcher({request,longbridgeConfigured:()=>true,longbridge:async()=>{throw new Error('longbridge offline');}});
 const q=await fallback(us);assert.equal(q.price,98);assert.match(q.fallbackReason,/longbridge offline/);assert.equal(legacy,1);
});

const now=()=>Date.parse('2026-09-06T12:00:00Z');
function table(security){return security.market==='CN'?{code:0,data:{fields:['ts_code','ann_date','end_date','report_type','revenue','update_flag'],items:[[tushareSymbol(security),'20260401','20251231','1',100,'1'],[tushareSymbol(security),'20260401','20251231','4',null,'0']]}}:
 {code:0,data:{fields:['ts_code','end_date','name','ind_name','ind_value','report_type'],items:[[tushareSymbol(security),'20251231','公司','营业收入',100,'年度'],[tushareSymbol(security),'20251231','公司','其他收入',null,'年度']]}};}

test('Tushare validates schema and security, while preserving missing values and report types',()=>{
 for(const security of [cn,hk,us]){
  const raw=table(security),parsed=parseTushareTable(raw,security);assert.equal(parsed.rows.length,2);
  assert.equal(parsed.rows[1][security.market==='CN'?'revenue':'ind_value'],null);
  raw.data.items[0][0]='WRONG';assert.throws(()=>parseTushareTable(raw,security),/不匹配/);
 }
 const invalid=table(hk);invalid.data.items[0][1]='20260230';assert.throws(()=>parseTushareTable(invalid,hk),/日期/);
 const missing=table(us);missing.data.items[0].pop();assert.throws(()=>parseTushareTable(missing,us),/数量/);
});
test('Tushare is opt-in, uses HTTPS JSON read APIs, caches successes and reports supplemental provenance',async()=>{
 let calls=0;const bodies=[];
 const request=async(url,options)=>{
  assert.equal(url,'https://api.tushare.pro/');assert.equal(options.contentType,'application/json');
  calls++;const body=JSON.parse(options.body);bodies.push(body);return Buffer.from(JSON.stringify(table(us)));
 };
 const disabled=createTushareFinancials({request,token:()=>''});assert.equal((await disabled(us)).configured,false);assert.equal(calls,0);
 const fetchFinancials=createTushareFinancials({request,token:()=>'fixture-token',clock:now,wait:async()=>{}});
 const result=await fetchFinancials(us,{years:5});assert.equal(result.sources.length,3);assert.deepEqual(bodies.map(body=>body.api_name),['us_income','us_balancesheet','us_cashflow']);
 assert.equal(bodies[0].params.start_date,'20210101');assert.equal(bodies[0].params.end_date,'20260906');
 for(const source of result.sources){assert.equal(source.official,false);assert.equal(source.currency,null);assert.equal(source.unit,null);assert.equal(source.type,'vendor-financials');assert.match(source.text,/不是官方财报原文/);assert.doesNotMatch(source.text,/fixture-token/);}
 await fetchFinancials(us,{years:5});assert.equal(calls,3);
});
test('one Tushare permission failure preserves the other financial statements and redacts tokens',async()=>{
 const fetchFinancials=createTushareFinancials({token:()=>'fixture-token',clock:now,wait:async()=>{},request:async(url,{body})=>{
  const {api_name}=JSON.parse(body);return Buffer.from(JSON.stringify(api_name==='hk_income'?{code:2002,msg:'no permission fixture-token'}:table(hk)));
 }});
 const result=await fetchFinancials(hk);assert.equal(result.sources.length,2);assert.equal(result.warnings.length,1);assert.match(result.warnings[0],/2002/);assert.doesNotMatch(JSON.stringify(result),/fixture-token/);
});
test('Tushare retains historical revisions and does not turn an empty financial table into evidence',async()=>{
 const fetchFinancials=createTushareFinancials({token:()=>'fixture',clock:now,wait:async()=>{},request:async()=>Buffer.from(JSON.stringify(table(cn)))});
 const result=await fetchFinancials(cn);assert.match(result.sources[0].text,/"report_type": "1"/);assert.match(result.sources[0].text,/"report_type": "4"/);
 const empty=createTushareFinancials({token:()=>'fixture',clock:now,wait:async()=>{},request:async()=>Buffer.from(JSON.stringify({...table(cn),data:{...table(cn).data,items:[]}}))});
 const missing=await empty(cn);assert.equal(missing.sources.length,0);assert.equal(missing.warnings.length,3);
});
test('only allowlisted Tushare read POSTs retry',async()=>{
 let calls=0;const request=createRemoteClient({wait:async()=>{},fetchImpl:async()=>++calls%2?new Response('',{status:503}):new Response('{}')});
 await request('https://api.tushare.pro/',{method:'POST',contentType:'application/json',body:JSON.stringify({api_name:'income'})});assert.equal(calls,2);
 await assert.rejects(request('https://api.tushare.pro/',{method:'POST',body:JSON.stringify({api_name:'portfolio_save'})}));assert.equal(calls,3);
});
test('supplemental vendor tables never satisfy the official-report coverage requirement',async()=>{
 const previous=global.fetch;global.fetch=async()=>new Response('',{status:404});
 try{
  const result=await collectMarketData([{market:'CN',symbol:'600001'}],{quotes:async()=>{throw new Error('quote offline');},listReports:async()=>{throw new Error('official directory offline');},financials:async()=>({configured:true,sources:[{title:'vendor fixture',provider:'Tushare Pro',official:false,type:'vendor-financials',text:'fixture'}],warnings:[],coverage:[{api:'income',rows:1}]})});
  assert.equal(result.coverage[0].read,0);assert.equal(result.sources.filter(source=>source.type==='vendor-financials').length,1);assert.equal(result.financialCoverage.length,1);
 }finally{global.fetch=previous;}
});
