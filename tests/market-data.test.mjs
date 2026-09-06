import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSecurities,parseEastmoney,parseYahoo,secFactsSources,selectReports,remote,collectMarketData,freshness,newYorkTime} from '../server/market-data.mjs';
import {validateInput} from '../server/router.mjs';
test('三市场代码校验，不接受URL及未知市场',()=>{
 assert.deepEqual(validateSecurities([{market:'HK',symbol:'700'},{market:'US',symbol:'aapl'}]),[{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}]);
 for(const s of [{market:'CN',symbol:'123'},{market:'US',symbol:'https://x'},{market:'BAD',symbol:'AAPL'}])assert.throws(()=>validateSecurities([s]));
 assert.throws(()=>validateInput({question:'test',securities:[]}));
 assert.equal(validateInput({question:'test',securities:[{market:'US',symbol:'AAPL'}]}).historyYears,5);
 assert.deepEqual(validateInput({question:'test',securities:[{market:'US',symbol:'AAPL'}]}).sources,[]);
});
test('行情价格精度、数据时间、缺失数据和代码严格校验',()=>{
 const d={data:{f57:'00700',f58:'腾讯',f59:3,f43:442800,f60:433000,f86:1788509281,f170:226,f167:308}};
 const q=parseEastmoney(d,{market:'HK',symbol:'00700'});assert.equal(q.price,442.8);assert.equal(q.changePercent,2.26);assert.equal(q.marketCap,null);assert.equal(q.currency,'HKD');assert.equal(q.pb,3.08);
 assert.throws(()=>parseEastmoney({...d,data:{...d.data,f43:'-'}},{market:'HK',symbol:'00700'}));
 assert.throws(()=>parseEastmoney(d,{market:'CN',symbol:'600519'}));
 assert.match(freshness(q,Date.parse(q.asOf)+8*86400000),/过时/);
 const us=parseYahoo({chart:{result:[{meta:{symbol:'AAPL',currency:'USD',regularMarketPrice:100,regularMarketTime:1788552001}}]}},{market:'US',symbol:'AAPL'});assert.equal(us.price,100);assert.equal(us.previousClose,null);
});
test('XBRL严格按申报号分组，保留单位和比较期，不混合年度/季度',()=>{
 const fact={cik:1,entityName:'Test',facts:{'us-gaap':{NetIncomeLoss:{label:'Net income',units:{USD:[{accn:'X',val:10,start:'2025-01-01',end:'2025-12-31',filed:'2026-02-01'},{accn:'X',val:8,start:'2024-01-01',end:'2024-12-31',filed:'2026-02-01'},{accn:'OTHER',val:999,end:'2025-12-31'}]}}}}};
 const [s]=secFactsSources(fact,[{accession:'X',form:'10-K',date:'2026-02-01',reportDate:'2025-12-31',url:'https://www.sec.gov/filing'}],{symbol:'TEST'},'https://data.sec.gov/facts');
 assert.equal(s.factsCount,2);assert.match(s.text,/2024-01-01/);assert.doesNotMatch(s.text,/999/);assert.match(s.text,/不是完整财报正文/);
});
test('美股交易时间夏令时和冬令时转换，非法日期拒绝',()=>{
 assert.equal(newYorkTime('2026-09-04 16:00:01'),'2026-09-04T20:00:01.000Z');
 assert.equal(newYorkTime('2026-01-05 16:00:01'),'2026-01-05T21:00:01.000Z');
 assert.throws(()=>newYorkTime('2026-02-30 16:00:01'));
});
test('报告选择保留最新披露和按年度去重的年报',()=>{
 const docs=[{title:'2025 年报',annual:true,date:'2026-04-01',url:'1'},{title:'2025 年报（修订）',annual:true,date:'2026-05-01',url:'2'},{title:'2024 年报',annual:true,date:'2025-04-01',url:'3'},{title:'2026 中期',annual:false,date:'2026-08-01',url:'4'}];
 const selected=selectReports(docs,3,'A');assert.ok(selected.some(x=>x.url==='4'));assert.ok(selected.some(x=>x.url==='2'));assert.ok(selected.some(x=>x.url==='3'));assert.ok(!selected.some(x=>x.url==='1'));
});
test('外部请求只允许固定公开数据域名，403不重试绕过',async()=>{
 await assert.rejects(remote('http://127.0.0.1/admin'),/允许列表/);
 await assert.rejects(remote('https://static.cninfo.com.cn.evil.test/file'),/允许列表/);
 const old=global.fetch;let count=0;global.fetch=async()=>{count++;return new Response('',{status:403});};
 try{await assert.rejects(remote('https://data.sec.gov/submissions/test.json'),/不会绕过/);assert.equal(count,1);}finally{global.fetch=old;}
});
test('行情和财报失败均保留原因，不伪造来源，取消停止后续请求',async()=>{
 const old=global.fetch;global.fetch=async()=>new Response('',{status:503});
 try{const fail=async()=>{throw new Error('source offline');};const r=await collectMarketData([{market:'CN',symbol:'600519'}],{quotes:fail,listReports:fail});assert.equal(r.sources.length,0);assert.equal(r.coverage[0].read,0);assert.equal(r.warnings.length,2);const c=new AbortController();c.abort();await assert.rejects(collectMarketData([{market:'US',symbol:'AAPL'}],{signal:c.signal}));}finally{global.fetch=old;}
});
