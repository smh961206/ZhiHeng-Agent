import test from 'node:test';
import assert from 'node:assert/strict';
import {securityDisplayLabel, researchSecurityDisplay} from '../src/domain/security-display.ts';

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
