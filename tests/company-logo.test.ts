import test from 'node:test';
import assert from 'node:assert/strict';
import {companyLogo} from '../src/lib/security-display.ts';

test('company logos use a generic security endpoint without a company allowlist',()=>{
 for(const [security,path] of [
  [{market:'CN',symbol:'000333'},'CN/000333'],
  [{market:'CN',symbol:'920001'},'CN/920001'],
  [{market:'HK',symbol:'700'},'HK/00700'],
  [{market:'HK',symbol:'00700'},'HK/00700'],
  [{market:'US',symbol:' brk.b '},'US/BRK.B'],
  [{market:'US',symbol:'UNKNOWN'},'US/UNKNOWN'],
 ])assert.equal(companyLogo(security),`/api/securities/${path}/logo`);
});

test('company logo paths reject missing or malformed listing identities',()=>{
 for(const security of [null,{}, {market:'CN',symbol:'0'}, {market:'HK',symbol:'../AAPL'}, {market:'HK',symbol:'00000'}, {market:'US',symbol:'AAPL?url=http://localhost'}, {market:'US',symbol:'https://example.com'}, {market:'OTHER',symbol:'AAPL'}])assert.equal(companyLogo(security),null);
});
