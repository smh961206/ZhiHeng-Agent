import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLongbridge} from '../server/longbridge-quotes.mjs';
import {parseTencent,parseEastmoney} from '../server/market-data.mjs';
import {tencentQuotes} from './fixtures/tencent-quotes.mjs';
import {securityIdentity,companyLogo,quoteMovement,quoteAmount,quoteNumber} from '../src/lib/security-display.mjs';

test('company identities preserve exchange, HK leading zeros and share class',()=>{
 for(const [market,symbol,expected] of [['CN','601318','SH:601318'],['CN','002594','SZ:002594'],['CN','920001','BJ:920001'],['HK','700','HK:00700'],['US','BRK-B','US:BRK-B']])assert.equal(securityIdentity({market,symbol}).code,expected);
 assert.equal(companyLogo({market:'CN',symbol:'601318'}),companyLogo({market:'HK',symbol:'2318'}));
 assert.equal(companyLogo({market:'CN',symbol:'000001'}),null);
});
test('quote formatting distinguishes missing, unchanged and negative movements',()=>{
 assert.equal(quoteNumber(null),'—');assert.equal(quoteAmount(undefined),'—');assert.equal(quoteAmount(0,'股'),'0股');
 assert.equal(quoteAmount(25000000,'股'),'2,500万股');
 assert.equal(quoteMovement({price:110,previousClose:100}).percent,10);
 assert.equal(quoteMovement({price:100,previousClose:100}).direction,'flat');
 assert.equal(quoteMovement({price:90,previousClose:100}).direction,'down');
 assert.equal(quoteMovement({price:100,previousClose:0}).percent,null);
});
test('Longbridge optional metrics preserve zero volume and reject invalid prices',()=>{
 const base={symbol:'AAPL.US',lastDone:'100',prevClose:'99',timestamp:'2026-09-07T20:00:00Z',info:{symbol:'AAPL.US',currency:'USD'}};
 const q=parseLongbridge({...base,open:'99.5',high:'102',low:'98',volume:0,turnover:'0'},{market:'US',symbol:'AAPL'});
 assert.deepEqual([q.open,q.high,q.low,q.volume,q.turnover],[99.5,102,98,0,0]);
 const missing=parseLongbridge({...base,open:'0',high:'NaN',low:'-1',volume:-1,turnover:''},{market:'US',symbol:'AAPL'});
 assert.deepEqual([missing.open,missing.high,missing.low,missing.volume,missing.turnover],[null,null,null,null,null]);
});
test('captured Tencent payloads convert A-share lots and turnover without scaling HK or US',()=>{
 const cn=parseTencent(tencentQuotes.CN,{market:'CN',symbol:'600519'});
 assert.deepEqual([cn.open,cn.high,cn.low,cn.volume,cn.turnover],[1295.88,1338.86,1295.6,4541600,6022590000]);
 const hk=parseTencent(tencentQuotes.HK,{market:'HK',symbol:'00700'}),us=parseTencent(tencentQuotes.US,{market:'US',symbol:'AAPL'});
 assert.equal(hk.volume,24025286);assert.equal(hk.turnover,10664922337.702);assert.equal(us.volume,39606884);assert.equal(us.turnover,12721652691);
});
test('Eastmoney uses declared precision only for prices and leaves missing metrics empty',()=>{
 const q=parseEastmoney({data:{f57:'00700',f58:'腾讯',f59:3,f43:442800,f44:447600,f45:440000,f46:442400,f48:10664922337.702,f86:1788509281}},{market:'HK',symbol:'00700'});
 assert.deepEqual([q.open,q.high,q.low,q.turnover],[442.4,447.6,440,10664922337.702]);
});
