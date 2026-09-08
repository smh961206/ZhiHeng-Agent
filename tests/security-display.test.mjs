import test from 'node:test';
import assert from 'node:assert/strict';
import {securityDisplayLabel, researchSecurityDisplay} from '../shared/security-display.mjs';
import {createExchangeLookup, secExchangeSource} from '../server/security-exchanges.mjs';
import {createRemoteClient} from '../server/market-request.mjs';

test('stock labels preserve leading zeroes, exchange prefixes and share classes', () => {
 for (const [security, expected] of [
  [{market:'CN',symbol:'002594'},'SZ:002594'], [{market:'CN',symbol:'600519'},'SH:600519'],
  [{market:'CN',symbol:'920001'},'BJ:920001'], [{market:'HK',symbol:'700'},'HK:00700'],
  ['002594.SZ','SZ:002594'], ['HK:01211','HK:01211'], ['NASDAQ:AAPL','NASDAQ:AAPL'],
  [{market:'US',symbol:'BRK.B',exchange:'NYSE'},'NYSE:BRK.B'],
  [{market:'US',ticker:'AAPL',name:'Apple'},'US:AAPL'],
 ]) assert.equal(securityDisplayLabel(security), expected);
 assert.equal(securityDisplayLabel({market:'US',symbol:'BRK.B'},{'BRK-B':{exchange:'NYSE'}}),'NYSE:BRK.B');
 assert.equal(securityDisplayLabel({market:'US',symbol:'AAPL'},{AAPL:{exchange:'Nasdaq'}}),'NASDAQ:AAPL');
});

test('comparison cards recover names from saved records and keep each listing distinct', () => {
 const job={input:{securities:[{market:'CN',symbol:'002594'},{market:'CN',symbol:'601633',name:'CN:601633'}]},marketData:{
  snapshots:[{market:'HK',symbol:'1211',name:'比亚迪股份'},{market:'CN',symbol:'002594',name:'比亚迪'}],
  coverage:[{security:'CN:601633',name:'长城汽车'},{security:'CN:601127',name:'赛力斯'},{security:'US:BRK-B',name:'Berkshire Hathaway',exchange:'NYSE'}],
 }};
 for(const [key,name,code] of [['CN:002594','比亚迪','SZ:002594'],['SH:601633','长城汽车','SH:601633'],['CN:601127','赛力斯','SH:601127'],['HK:01211','比亚迪股份','HK:01211'],['US:BRK.B','Berkshire Hathaway','NYSE:BRK.B']]){
  const stock=researchSecurityDisplay(job,key);assert.equal(stock.name,name);assert.equal(stock.code,code);
 }
 assert.equal(researchSecurityDisplay({plan:{securities:[{market:'US',symbol:'AAPL',name:'Apple'}]}},'US:AAPL',{AAPL:{exchange:'NASDAQ'}}).code,'NASDAQ:AAPL');
 assert.equal(researchSecurityDisplay(job,'US:UNKNOWN').name,'名称未记录');
 assert.equal(researchSecurityDisplay(job,'US:UNKNOWN').code,'US:UNKNOWN');
});

test('official exchange lookup reads fields by name and shares the cached directory', async () => {
 let calls=0;
 const lookup=createExchangeLookup({request:async url=>{
  assert.equal(url,secExchangeSource);calls++;
  return Buffer.from(JSON.stringify({fields:['exchange','name','ticker','cik'],data:[['Nasdaq','Apple','AAPL',320193],['NYSE','Berkshire','BRK-B',1067983]]}));
 }});
 const [apple,berkshire]=await Promise.all([lookup(['AAPL']),lookup(['BRK.B'])]);
 assert.equal(apple[0].exchange,'NASDAQ');assert.equal(berkshire[0].exchange,'NYSE');assert.equal(calls,1);
 assert.equal((await lookup(['UNKNOWN']))[0].exchange,null);
 assert.equal(calls,1);
});

test('unknown, conflicting or failed exchange data never become a guessed venue', async () => {
 for (const data of [null,{fields:['ticker','exchange'],data:[['ABC','NYSE'],['ABC','Nasdaq'],['ABC','NYSE']]}, {fields:['ticker','exchange'],data:[['ABC','NewExchange']]}]) {
  const lookup=createExchangeLookup({request:async()=>Buffer.from(JSON.stringify(data))});
  assert.equal((await lookup(['ABC']))[0].exchange,null);
 }
 let fail=true;
 const lookup=createExchangeLookup({request:async()=>{if(fail)throw new Error('offline');return Buffer.from(JSON.stringify({fields:['ticker','exchange'],data:[['ABC','NYSE']]}));}});
 assert.equal((await lookup(['ABC']))[0].exchange,null);fail=false;
 assert.equal((await lookup(['ABC']))[0].exchange,'NYSE');
 await assert.rejects(lookup(['https://invalid.test']),/有效美股代码/);
 const controller=new AbortController();controller.abort();await assert.rejects(lookup(['ABC'],controller.signal),{name:'AbortError'});
});

test('exchange directory access keeps the SEC path allowlist narrow', async () => {
 let calls=0;
 const request=createRemoteClient({wait:async()=>{},fetchImpl:async()=>{calls++;return new Response('{}');}});
 await request(secExchangeSource);assert.equal(calls,1);
 await assert.rejects(request('https://www.sec.gov/files/other.json'),/允许列表/);assert.equal(calls,1);
});
