import test from 'node:test';
import assert from 'node:assert/strict';
import {parseValuationHistory,valuationPercentiles,createValuationHistory} from '../server/valuation-history.mjs';
import {extractHTML} from '../server/filing-text.mjs';
import {parseHKEXCompany,parseHKEXReports,createHKEXDisclosures,mergeReportAlternatives} from '../server/hkex-disclosures.mjs';
import {chooseReports,reportCoverage} from '../server/report-periods.mjs';
import {createOfficialReportReader,secAttachments} from '../server/official-reports.mjs';
import {createDataArchive} from '../server/data-archive.mjs';
import {createTushareClient} from '../server/tushare-client.mjs';
import {dividendLedger} from '../server/capital-evidence.mjs';
import {xbrlObservations} from '../server/financial-observations.mjs';
import {officialReportList,collectMarketData} from '../server/market-data.mjs';
import {createRemoteClient} from '../server/market-request.mjs';
import {brokerValuationWindows,validateBrokerFundamental,createBrokerFundamentals} from '../server/longbridge-fundamentals.mjs';

const cn={market:'CN',symbol:'600519'},hk={market:'HK',symbol:'00700'},clock=()=>Date.parse('2026-09-07T00:00:00Z');
const raw=rows=>({code:0,data:{fields:Object.keys(rows[0]),items:rows.map(row=>Object.values(row))}});
const valuation={ts_code:'600519.SH',trade_date:'20260904',close:1500,pe:20,pe_ttm:18,pb:8,ps:9,ps_ttm:8,dv_ratio:2,dv_ttm:2.1,total_mv:200000};
test('valuation samples preserve nulls, reject conflicting identities and dates, and exclude missing denominators',()=>{
 const rows=parseValuationHistory(raw([{...valuation,trade_date:'20210906',pe:10},{...valuation,trade_date:'20230905',pe:null},valuation]),cn,{start:'20210901',end:'20260904'});
 const windows=valuationPercentiles(rows);assert.equal(windows[1].metrics.pe.percentile,100);assert.equal(windows[1].metrics.pe.validObservations,2);
 assert.equal(windows[1].metrics.pe.excludedObservations,1);assert.equal(windows[1].shortHistory,false);assert.equal(valuationPercentiles([valuation])[1].shortHistory,true);
 assert.equal(valuationPercentiles([{...valuation,pe:null}])[0].metrics.pe.percentile,null);
 assert.throws(()=>parseValuationHistory(raw([{...valuation,ts_code:'000001.SZ'}]),cn,{start:'20210101',end:'20260907'}),/证券/);
 assert.throws(()=>parseValuationHistory(raw([{...valuation,trade_date:'20270904'}]),cn,{start:'20210101',end:'20260907'}),/范围/);
 assert.throws(()=>parseValuationHistory(raw([valuation,{...valuation,pe:30}]),cn,{start:'20210101',end:'20260907'}),/冲突/);
});
test('valuation permission failure produces missing coverage instead of a fabricated percentile',async()=>{
 const client=async()=>{throw new Error('no permission');};client.configured=()=>true;
 const result=await createValuationHistory({client,clock})(cn);
 assert.equal(result.sources.length,0);assert.equal(result.coverage[0].status,'failed');
});
test('HTML preserves entity-decoded financial cells and excludes executable/hidden content',()=>{
 const html='<html><head><script>steal()</script></head><body><h1>FORM 10-K</h1><ix:header>hidden facts 999</ix:header><p>USD &amp; shares</p><table><tr><td>Income</td><td>(1,200)</td></tr></table><div style="display:none">wrong 100</div><a href="ex99.htm">Exhibit 99.1</a></body></html>';
 const parsed=extractHTML(html);assert.match(parsed.text,/Income\t\(1,200\)/);assert.match(parsed.text,/USD & shares/);assert.doesNotMatch(parsed.text,/steal|999|wrong/);assert.equal(parsed.truncated,false);
 assert.equal(parsed.links[0].href,'ex99.htm');assert.equal(extractHTML('<p>'+ 'a'.repeat(100)+'</p>',{maxCharacters:30}).truncated,true);
});
const hkHTML=(code='00700',title='ANNUAL REPORT 2020')=>`<div class="title-search-result"><table><tr><td class="release-time">Release Time: 08/04/2021 17:00</td><td class="stock-short-code">Stock Code: ${code}<br>80700</td><td><a href="/listedco/listconews/sehk/2021/0408/2021040802046_c.pdf">${title}</a></td></tr></table></div>`;
test('HKEX identity is exact, dual-counter filings match explicitly and scripts are not evaluated',()=>{
 assert.equal(parseHKEXCompany('callback({"stockInfo":[{"code":"00700","stockId":7609,"name":"TENCENT"}]});',hk).stockId,7609);
 assert.throws(()=>parseHKEXCompany('callback({"stockInfo":[]});',hk),/唯一/);
 assert.throws(()=>parseHKEXCompany('globalThis.exfiltrate()',hk),/格式/);
 assert.equal(parseHKEXReports(hkHTML(),hk).reports[0].annual,true);
 assert.throws(()=>parseHKEXReports(hkHTML('00005'),hk),/不匹配/);
 assert.throws(()=>parseHKEXReports('<html>access denied</html>',hk),/格式/);
});
test('HKEX capped queries retain found reports with explicit unresolved ranges',async()=>{
 const reader=createHKEXDisclosures({clock,maxRequests:1,request:async url=>Buffer.from(url.includes('prefix.do')?'callback({"stockInfo":[{"code":"00700","stockId":7609,"name":"TENCENT"}]});':hkHTML().replace('</table>',hkHTML().match(/<tr>.*<\/tr>/)[0].repeat(99)+'</table>'))});
 const result=await reader(hk,{years:8,mode:'F'});assert.equal(result.limited,true);assert.ok(result.unresolvedRanges.length);assert.equal(result.reports.length,1);
});
test('annual selection exposes a missing year rather than filling it with an older annual',()=>{
 const years=[2017,2018,2019,2021,2022,2023,2024,2025];
 const reports=years.map(year=>({title:`${year} 年报`,date:`${year+1}-04-01`,annual:true,url:`https://example.test/${year}`}));
 const selected=chooseReports(reports,8,'F');assert.equal(selected.filter(item=>item.annual&&item.title.includes('2017')).length,0);
 assert.deepEqual(reportCoverage(selected,{years:8,market:'HK',clock}).missingAnnualYears,[2020]);
 assert.equal(reportCoverage(reports,{years:8,market:'HK',clock}).recentEightPeriodsObserved,false);
});
test('quarterly selection keeps eight distinct periods and latest revisions without treating copies as quarters',()=>{
 const periods=['20240630','20240930','20241231','20250331','20250630','20250930','20251231','20260331','20260630'];
 const reports=periods.map(date=>({title:`${date} report`,reportDate:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,date:`${date.slice(0,4)}-${date.slice(4,6)}-30`,annual:date.endsWith('1231'),url:`https://example.test/${date}`}));
 const chosen=chooseReports(reports,2,'B');assert.equal(reportCoverage(chosen,{years:2,market:'US',clock}).recentPeriods.length,8);assert.equal(reportCoverage(chosen,{years:2,market:'US',clock}).recentEightPeriodsObserved,true);
});
const document={title:'2020 年报',date:'2021-04-08',annual:true,security:'HK:00700',official:true,provider:'港交所',url:'https://www1.hkexnews.hk/listedco/listconews/sehk/2021/0408/2021040802046_c.pdf'};
const memoryStore=()=>{const entries=new Map();return {entries,async getCachedReport(key){return entries.get(key)||null;},async saveCachedReport(key,source){entries.set(key,source);}};};
test('official report fallback archives verified text and preserves its source and original timestamps',async()=>{
 const store=memoryStore();let calls=0;
 const alt={...document,url:'https://static.cninfo.com.cn/finalpage/2021-04-08/1200000000.PDF',provider:'巨潮'};
 const report=mergeReportAlternatives([document],[alt])[0];
 const reader=createOfficialReportReader({clock,storage:async()=>store,request:async url=>{calls++;if(url===document.url)throw new Error('offline');return Buffer.from('%PDF-1.7 fixture');},parsePDF:async()=>({text:'合法财报原文'.repeat(100),pages:1,readPages:1,truncated:false})});
 const first=await reader(report);assert.equal(first.url,alt.url);assert.match(first.fallbackReason,/offline/);
 const second=await reader({...alt});assert.equal(second.fromCache,true);assert.equal(second.fetchedAt,first.fetchedAt);assert.equal(calls,2);
 // A corrupted archive cannot silently become financial evidence.
 for(const entry of store.entries.values())entry.text='tampered';
 await reader(alt);assert.equal(calls,3);
});
test('failed archive reads/writes do not prevent a fresh official report, and fake PDFs are rejected',async()=>{
 const store={getCachedReport:async()=>{throw new Error('db offline');},saveCachedReport:async()=>{throw new Error('db offline');}};
 const reader=createOfficialReportReader({storage:async()=>store,request:async()=>Buffer.from('%PDF-1.7'),parsePDF:async()=>({text:'annual report '.repeat(50),pages:1,readPages:1})});
 const source=await reader(document);assert.match(source.cacheWarning,/归档失败/);
 const fake=createOfficialReportReader({storage:async()=>store,request:async()=>Buffer.from('<html>login</html>')});await assert.rejects(fake(document),/未返回PDF/);
});
test('SEC attachments only use links in the exact official accession directory',async()=>{
 const filing={url:'https://www.sec.gov/Archives/edgar/data/320193/000032019326000020/aapl.htm',accession:'0000320193-26-000020',title:'8-K',form:'8-K'};
 const result=await secAttachments(filing,{request:async()=>Buffer.from('<a href="ex99.htm">Exhibit 99.1</a><a href="https://evil.test/ex99.htm">Exhibit 99</a><a href="../ex99.htm">Exhibit 99</a>')});assert.equal(result.reports.length,1);assert.equal(result.reports[0].form,undefined);
});
test('persistent archive detects corruption and enforces age without refreshing timestamps',async()=>{
 const store=memoryStore();let now=clock();const archive=createDataArchive({storage:async()=>store,clock:()=>now});
 await archive.put('fixture',{value:1});assert.deepEqual(await archive.get('fixture',{maxAgeMs:100}),{value:1});
 now+=101;assert.equal(await archive.get('fixture',{maxAgeMs:100}),null);
 now=clock();for(const entry of store.entries.values())entry.text='{}';await assert.rejects(archive.get('fixture',{maxAgeMs:100}),/完整性/);
});
test('Tushare outages can reuse dated data but permission errors and aborts never masquerade as success',async()=>{
 const entries=new Map(),archive={put:async(key,value)=>entries.set(key,value),get:async key=>entries.get(key)};let offline=false;
 const create=()=>createTushareClient({archive,clock,token:()=>'fixture-secret',wait:async()=>{},request:async()=>{if(offline)throw new Error('network unavailable');return Buffer.from(JSON.stringify({code:0,data:{fields:['n'],items:[[1]]}}));}});
 const first=await create()('income',{ts_code:'600519.SH'});offline=true;
 const stale=await create()('income',{ts_code:'600519.SH'});assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,first.fetchedAt);assert.doesNotMatch(JSON.stringify(stale),/fixture-secret/);
 const denied=createTushareClient({archive,clock,token:()=>'fixture-secret',wait:async()=>{},request:async()=>Buffer.from('{"code":40203,"msg":"no permission"}')});
 await assert.rejects(denied('income',{ts_code:'600519.SH'}),/40203/);
 const cancel=new AbortController();cancel.abort();await assert.rejects(create()('income',{ts_code:'600519.SH'},{signal:cancel.signal}));
});
test('two independent official directories merge gaps; a dated archive is labelled stale during a full outage',async()=>{
 const store=new Map(),archive={put:async(key,value)=>store.set(key,value),get:async key=>store.get(key)};
 const primary={name:'TENCENT',reports:[{...document,title:'2025 年报',date:'2026-04-01',url:'https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0409/2026040901231.pdf'}],warnings:[],limited:false};
 const fallback={name:'腾讯',reports:[document],warnings:[],limited:false};
 const first=await officialReportList(hk,8,'F',undefined,{hk:async()=>primary,cn:async()=>fallback,archive});assert.equal(first.reports.length,2);
 const fail=async()=>{throw new Error('network down');};const stale=await officialReportList(hk,8,'F',undefined,{hk:fail,cn:fail,archive});assert.equal(stale.stale,true);assert.equal(stale.limited,true);
});
test('dividend ledger deduplicates implementation events without guessing special dividends or resolving conflicts',()=>{
 const row={div_proc:'实施',end_date:'20251231',record_date:'20260501',ex_date:'20260502',pay_date:'20260502',cash_div_tax:2,cash_div:1.8,base_share:100};
 const ledger=dividendLedger([row,{...row}, {...row,div_proc:'预案'}],'20260907');assert.equal(ledger.events.length,1);assert.equal(ledger.events[0].duplicateRows,1);assert.equal(ledger.events[0].baseShares,1000000);assert.equal(ledger.events[0].regularOrSpecial,'unverified');
 const conflict=dividendLedger([row,{...row,cash_div_tax:3}],'20260907');assert.equal(conflict.events[0].cashPerShareBeforeTax,null);assert.equal(conflict.events[0].status,'conflict');
});
test('XBRL keeps units and true periods separate, retains revisions and never sums YTD with quarters',()=>{
 const facts=[{tag:'us-gaap:NetIncomeLoss',value:100,unit:'USD',start:'2025-01-01',end:'2025-12-31',filed:'2026-02-01'}, {tag:'us-gaap:NetIncomeLoss',value:110,unit:'USD',start:'2025-01-01',end:'2025-12-31',filed:'2026-03-01'}, {tag:'us-gaap:NetIncomeLoss',value:30,unit:'USD',start:'2026-01-01',end:'2026-03-31',filed:'2026-04-01'}];
 const result=xbrlObservations([{id:'S1',type:'official-xbrl',text:'header\n'+JSON.stringify(facts)}]);assert.equal(result.observations.length,2);assert.equal(result.observations[0].hasRevision,true);assert.equal(result.observations[0].unitMultiplier,1);assert.equal(result.observations[1].periodType,'quarter');
});
test('new official hosts and SEC files retain strict URL allowlists',async()=>{
 let calls=0;const read=createRemoteClient({wait:async()=>{},fetchImpl:async()=>{calls++;return new Response('ok');}});
 await read(document.url);await read('https://www.sec.gov/Archives/edgar/data/320193/000032019326000020/aapl.htm');
 for(const url of ['https://www.sec.gov/Archives/../../admin','https://www1.hkexnews.hk/account','https://static.www.tencent.com/uploads/evil.htm','https://www1.hkexnews.hk:444/search/prefix.do'])await assert.rejects(read(url),/允许列表/);
 assert.equal(calls,2);
});
test('broker valuation reports missing ratios and short windows instead of inventing daily five-year coverage',()=>{
 const list=Array.from({length:156},(_,i)=>({timestamp:Date.parse('2023-09-11')/1000+i*7*86400,value:String(10+i%20)}));
 const windows=brokerValuationWindows({history:{metrics:{pe:{list}}}});
 assert.deepEqual(windows[1].missingMetrics,['pb','ps']);assert.equal(windows[1].metrics.pe.medianSpacingDays,7);assert.equal(windows[1].metrics.pe.shortHistory,true);
 assert.throws(()=>brokerValuationWindows({history:{metrics:{pe:{list:[{timestamp:100,value:'10'}]}}}}),/时间戳/);
});
test('broker dividend text remains unclassified and rows with an explicit wrong symbol are rejected',async()=>{
 const data={list:[{symbol:'',id:'',desc:'Cash Dividend: 18.13HKD',recordDate:'2023-01-06',exDate:'2023-01-05',paymentDate:'2023-03-24'}]};
 validateBrokerFundamental('dividendDetail',data,hk);
 assert.throws(()=>validateBrokerFundamental('dividendDetail',{list:[{...data.list[0],symbol:'5.HK'}]},hk),/不匹配/);
 const fetcher=async(_s,_sig,{method})=>{if(method!=='dividendDetail')throw new Error('unavailable');return {data,fetchedAt:'2026-09-07T00:00:00Z'};};
 const result=await createBrokerFundamentals({fetcher,configured:()=>true,clock})(hk);
 assert.equal(result.sources.length,1);assert.equal(result.sources[0].official,false);assert.equal(result.sources[0].limited,true);assert.match(result.sources[0].text,/实物分派/);assert.equal(result.coverage.length,4);
});
test('a missing latest SEC annual body retains the expected year from the directory',()=>{
 const reports=[{title:'2024 10-K',annual:true,reportDate:'2024-09-28'}];
 assert.deepEqual(reportCoverage(reports,{market:'US',years:2,expectedAnnualYears:[2024,2025]}).missingAnnualYears,[2025]);
});
test('invalid new Tushare data cannot overwrite a valid persistent snapshot',async()=>{
 let writes=0;const client=createTushareClient({token:()=> 'fixture',wait:async()=>{},archive:{put:async()=>writes++,get:async()=>null},request:async()=>Buffer.from('{"code":0,"data":{}}')});
 await assert.rejects(client('income',{}, {validate:()=>{throw new Error('wrong schema');}}),/wrong schema/);assert.equal(writes,0);
});
