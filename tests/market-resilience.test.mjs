import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
import {createRemoteClient} from '../server/market-request.mjs';
import {createMarketCache} from '../server/market-cache.mjs';
import {createSECLookup} from '../server/sec-directory.mjs';
import {parseTencent,createQuoteFetcher,cnReportList,secCompany,secReports} from '../server/market-data.mjs';
import {tencentQuotes} from './fixtures/tencent-quotes.mjs';

test('transient HTTP and connection errors retry with bounded backoff',async()=>{
 const waits=[];let calls=0;
 const request=createRemoteClient({wait:async ms=>waits.push(ms),random:()=>0,fetchImpl:async()=>{
  calls++;if(calls===1)return new Response('',{status:503,headers:{'Retry-After':'2'}});
  if(calls===2)throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});
  return new Response('recovered');
 }});
 assert.equal((await request('https://qt.gtimg.cn/q=sh600519')).toString(),'recovered');
 assert.equal(calls,3);assert.deepEqual(waits,[2000,800]);
 let failures=0;
 const alwaysFails=createRemoteClient({wait:async()=>{},fetchImpl:async()=>{failures++;return new Response('',{status:502});}});
 await assert.rejects(alwaysFails('https://qt.gtimg.cn/q=sh600519'),/已尝试3次/);assert.equal(failures,3);
});

test('403 and 429 cool down the source and respect Retry-After without replay',async()=>{
 for(const status of [403,429]){
  let now=0,calls=0;
  const request=createRemoteClient({clock:()=>now,wait:async()=>{},fetchImpl:async()=>{calls++;return new Response('',{status,headers:{'Retry-After':'120'}});}});
  await assert.rejects(request('https://data.sec.gov/submissions/test.json'),/不会绕过/);
  await assert.rejects(request('https://www.sec.gov/files/company_tickers.json'),/冷却中/);
  assert.equal(calls,1);
  now=status===403?900001:120001;
  await assert.rejects(request('https://data.sec.gov/submissions/test.json'),/不会绕过/);assert.equal(calls,2);
 }
});

test('unsafe URLs, permanent errors, oversized payloads and writes are not retried',async()=>{
 for(const response of [()=>new Response('',{status:404}),()=>new Response('too large',{headers:{'Content-Length':'100'}}),()=>new Response('stream too large')]){
  let calls=0;const request=createRemoteClient({fetchImpl:async()=>{calls++;return response();}});
  await assert.rejects(request('https://qt.gtimg.cn/q=sh600519',{maxBytes:4}));assert.equal(calls,1);
 }
 let calls=0;const request=createRemoteClient({fetchImpl:async()=>{calls++;return new Response('',{status:503});}});
 for(const url of ['http://127.0.0.1/','https://qt.gtimg.cn:444/','https://www.sec.gov/other','https://qt.gtimg.cn.evil.test/'])await assert.rejects(request(url),/允许列表/);
 assert.equal(calls,0);
 await assert.rejects(request('https://qt.gtimg.cn/',{method:'POST',body:'write=1'}));assert.equal(calls,1);
});

test('official announcement search POST retries, but cancellation stops backoff immediately',async()=>{
 let calls=0;const controller=new AbortController();
 const request=createRemoteClient({wait:async(ms,value,{signal})=>{controller.abort(new Error('user cancelled'));signal.throwIfAborted();},fetchImpl:async()=>{calls++;return new Response('',{status:503});}});
 await assert.rejects(request('https://www.cninfo.com.cn/new/hisAnnouncement/query',{method:'POST',body:'pageNum=1',signal:controller.signal}),/user cancelled/);
 assert.equal(calls,1);
 let recovered=0;
 const retry=createRemoteClient({wait:async()=>{},fetchImpl:async()=>++recovered===1?new Response('',{status:502}):new Response('{}')});
 assert.equal((await retry('https://www.cninfo.com.cn/new/hisAnnouncement/query',{method:'POST',body:'pageNum=1'})).toString(),'{}');assert.equal(recovered,2);
});

test('attempt timeout is retryable, while an explicit abort never retries',async()=>{
 let calls=0;
 const request=createRemoteClient({wait:async()=>{},fetchImpl:async(url,{signal})=>{
  if(++calls===1){await pause(100,undefined,{signal});return new Response('too late');}return new Response('ok');
 }});
 assert.equal((await request('https://qt.gtimg.cn/q=sh600519',{timeoutMs:5})).toString(),'ok');assert.equal(calls,2);
 const controller=new AbortController();controller.abort(new Error('cancel before request'));
 await assert.rejects(request('https://qt.gtimg.cn/q=sh600519',{signal:controller.signal}),/cancel before/);assert.equal(calls,2);
});

test('shared reads isolate cancellation, expire and do not cache failures',async()=>{
 let now=0,calls=0,release,sharedSignal;
 const read=createMarketCache({clock:()=>now,maxEntries:1});
 const loader=signal=>{calls++;sharedSignal=signal;return new Promise(resolve=>release=resolve);};
 const first=new AbortController(),second=new AbortController();
 const a=read('a',loader,{signal:first.signal,ttlMs:10}),b=read('a',loader,{signal:second.signal,ttlMs:10});
 await Promise.resolve();first.abort(new Error('first left'));await assert.rejects(a,/first left/);
 assert.equal(sharedSignal.aborted,false);release({price:10});assert.deepEqual(await b,{price:10});assert.equal(calls,1);
 assert.deepEqual(await read('a',()=>{throw new Error('cached');}),{price:10});
 now=11;let failed=0;
 for(let i=0;i<2;i++)await assert.rejects(read('a',async()=>{failed++;throw new Error('offline');}),/offline/);
 assert.equal(failed,2);
 await read('a',async()=>1);await read('b',async()=>2);
 assert.equal(await read('a',async()=>3),3,'entry limit evicts the oldest item');
});

test('last reader abort cancels the shared request and a later read starts fresh',async()=>{
 const read=createMarketCache(),controller=new AbortController();let sharedSignal;
 const aborted=read('key',async signal=>{sharedSignal=signal;await pause(100,undefined,{signal});return 'late';},{signal:controller.signal});
 await Promise.resolve();controller.abort(new Error('all left'));await assert.rejects(aborted,/all left/);assert.equal(sharedSignal.aborted,true);
 assert.equal(await read('key',async()=>'fresh'),'fresh');
 const tiny=createMarketCache({maxBytes:2});let calls=0;
 for(let i=0;i<2;i++)await tiny('big',async()=>{calls++;return 'large';});assert.equal(calls,2,'oversized entries are not cached');
});

const securities={CN:{market:'CN',symbol:'600519'},HK:{market:'HK',symbol:'00700'},US:{market:'US',symbol:'AAPL'}};
test('captured Tencent quotes validate all three markets, currencies, timestamps and identities',()=>{
 const expected={CN:[1330,'CNY','2026-09-04T08:14:33.000Z'],HK:[442.8,'HKD','2026-09-04T08:08:06.000Z'],US:[319.97,'USD','2026-09-04T20:00:01.000Z']};
 for(const market of ['CN','HK','US']){
  const q=parseTencent(tencentQuotes[market],securities[market]);assert.deepEqual([q.price,q.currency,q.asOf],expected[market]);
  assert.throws(()=>parseTencent(tencentQuotes[market].replace(q.currency,'BAD'),securities[market]),/币种/);
  assert.throws(()=>parseTencent(tencentQuotes[market],{...securities[market],symbol:'WRONG'}),/代码/);
 }
 assert.throws(()=>parseTencent(tencentQuotes.CN.replace('20260904161433','20260230161433'),securities.CN),/日期/);
 assert.throws(()=>parseTencent(tencentQuotes.HK.replace('2026/09/04 16:08:06','not a date'),securities.HK),/时间/);
});

test('each market uses the independent fallback when primary fails',async()=>{
 for(const market of ['CN','HK','US']){
  const calls=[];
  const fetchQuote=createQuoteFetcher({request:async(url)=>{calls.push(url);if(!url.includes('qt.gtimg.cn'))throw new Error('primary offline');return Buffer.from(tencentQuotes[market]);}});
  const q=await fetchQuote(securities[market]);assert.match(q.provider,/腾讯/);assert.match(q.fallbackReason,/primary offline/);assert.equal(q.currency,{CN:'CNY',HK:'HKD',US:'USD'}[market]);assert.equal(calls.length,2);
 }
});

test('quote cache preserves fetch time, labels outage data and expires after 15 minutes',async()=>{
 let now=Date.parse('2026-09-06T12:00:00Z'),offline=false,calls=0;
 const fetchQuote=createQuoteFetcher({clock:()=>now,request:async(url)=>{
  calls++;if(offline)throw new Error('offline');
  return Buffer.from(JSON.stringify({chart:{result:[{meta:{symbol:'AAPL',currency:'USD',regularMarketPrice:100,regularMarketTime:1788552001}}]}}));
 }});
 const q=await fetchQuote(securities.US);now+=1000;
 assert.equal((await fetchQuote(securities.US)).fetchedAt,q.fetchedAt);assert.equal(calls,1);
 offline=true;now+=20000;
 const stale=await fetchQuote(securities.US);assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,q.fetchedAt);assert.match(stale.warning,/旧快照/);
 now+=15*60000;await assert.rejects(fetchQuote(securities.US),/行情源均不可用/);
});

test('SEC search failure uses the official ticker directory with share classes preserved',async()=>{
 const urls=[];
 const lookup=createSECLookup({request:async url=>{
  urls.push(url);if(url.includes('efts.sec.gov'))throw new Error('temporary search failure');
  return Buffer.from(JSON.stringify({0:{cik_str:320193,ticker:'AAPL',title:'Apple Inc.'},1:{cik_str:1652044,ticker:'GOOG',title:'Alphabet Inc.'},2:{cik_str:1652044,ticker:'GOOGL',title:'Alphabet Inc.'}}));
 }});
 assert.equal((await lookup('AAPL'))[0].cik,'0000320193');
 assert.deepEqual((await lookup('Alphabet')).map(item=>item.symbol),['GOOG','GOOGL']);
 assert.equal(urls.filter(url=>url.includes('company_tickers.json')).length,1);
 assert.deepEqual(await lookup('UNKNOWN'),[]);
 await assert.rejects(secCompany(securities.US,undefined,{lookup,loadJSON:async()=>({cik:'0000320193',tickers:['WRONG']})}),/不匹配/);
});

test('official announcement pagination failure retains earlier reports and marks a gap',async()=>{
 const requestJSON=async(url,{body})=>{
  if(new URLSearchParams(body).get('pageNum')==='2')throw new Error('temporary failure');
  return {hasMore:true,announcements:[{secCode:'600519',announcementTitle:'2025年度报告',announcementTime:Date.parse('2026-04-01'),adjunctUrl:'finalpage/2026-04-01/123.PDF'}]};
 };
 const options={loadCompany:async()=>({code:'600519',orgId:'company',zwjc:'贵州茅台'}),requestJSON};
 const list=await cnReportList(securities.CN,3,'A',undefined,options);
 assert.equal(list.reports.length,1);assert.equal(list.limited,true);assert.match(list.warnings[0],/第2页失败/);
 const controller=new AbortController();
 await assert.rejects(cnReportList(securities.CN,3,'A',controller.signal,{...options,requestJSON:async()=>{controller.abort(new Error('cancel report listing'));throw new Error('offline');}}),/cancel report listing/);
});

test('SEC older-directory failure retains recent filings and exact accession facts',async()=>{
 const accession='0000320193-26-000001',year=new Date().getUTCFullYear();
 const recent={form:['10-K'],filingDate:[`${year}-02-01`],accessionNumber:[accession],primaryDocument:['report.htm'],reportDate:[`${year-1}-12-31`]};
 const list=await secReports(securities.US,3,'A',undefined,{
  loadCompany:async()=>({cik:'0000320193',url:'https://data.sec.gov/submissions/CIK0000320193.json',submissions:{name:'Apple Inc.',filings:{recent,files:[{name:'CIK0000320193-submissions-001.json',filingTo:`${year-1}-01-01`}]}}}),
  loadJSON:async url=>{
   if(url.includes('/submissions/'))throw new Error('older directory offline');
   return {cik:320193,entityName:'Apple Inc.',facts:{'us-gaap':{NetIncomeLoss:{label:'Net income',units:{USD:[{accn:accession,val:10,end:`${year-1}-12-31`,filed:`${year}-02-01`}]}}}}};
  },
 });
 assert.equal(list.reports.length,1);assert.equal(list.sources[0].factsCount,1);assert.equal(list.limited,true);assert.match(list.warnings[0],/older directory offline/);
});
