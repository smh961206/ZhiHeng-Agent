import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveSecurities,localMentions} from '../server/security-resolver.mjs';
const catalogs={CN:[{code:'600519',zwjc:'贵州茅台'},{code:'002594',zwjc:'比亚迪'},{code:'601318',zwjc:'中国平安'},{code:'000001',zwjc:'平安银行'}],HK:[{code:'00700',zwjc:'腾讯控股'},{code:'01211',zwjc:'比亚迪股份'}]};
const lookupUS=async q=>q==='Alphabet'?[{market:'US',symbol:'GOOG',name:'Alphabet'},{market:'US',symbol:'GOOGL',name:'Alphabet'}]:[{market:'US',symbol:q==='Microsoft'?'MSFT':'AAPL',name:q}];
const resolve=q=>resolveSecurities(q,{loadCatalog:async m=>catalogs[m],lookupUS});
test('从问题识别中文公司、中文美股别名及ticker',async()=>{
 const r=await resolve('比较茅台、腾讯和苹果的现金流');assert.deepEqual(r.securities.map(x=>x.symbol),['600519','00700','AAPL']);assert.equal(r.ambiguities.length,0);
 const us=await resolve('分析 AAPL 的 ROE、DCF、TTM 和 SEC 财报');assert.equal(us.securities.length,1);assert.deepEqual(us.unresolved,[]);
});
test('两地上市列候选，显式市场消歧，保留同一代码跨市场',async()=>{
 const ambiguous=await resolve('分析比亚迪');assert.equal(ambiguous.securities.length,0);assert.equal(ambiguous.ambiguities[0].candidates.length,2);
 const a=await resolve('分析A股比亚迪');assert.equal(a.securities[0].symbol,'002594');
 const h=await resolve('港股比亚迪值得研究吗');assert.equal(h.securities[0].symbol,'01211');
});
test('各种代码格式及公司名称重复只填一次',async()=>{
 const r=await resolve('比较 sh600519、00700.HK、AAPL');assert.equal(r.securities.length,3);
 const repeated=await resolve('贵州茅台600519');assert.equal(repeated.securities.length,1);
});
test('清空和未知代码不产生默认公司，不把财务数字作为代码',async()=>{
 assert.equal((await resolve('')).securities.length,0);
 assert.equal((await resolve('分析999999')).unresolved[0],'999999');
 assert.equal(localMentions('收入增长20%，未来2026年看ROE',catalogs).length,0);
});
test('歧义美股股类、来源失败和多于3标的不静默决定',async()=>{
 assert.equal((await resolve('分析谷歌')).ambiguities[0].candidates.length,2);
 const tooMany=await resolve('比较茅台、腾讯、苹果和微软');assert.equal(tooMany.overflow,true);
 const fail=await resolveSecurities('贵州茅台',{loadCatalog:async()=>{throw new Error('offline');},lookupUS});assert.equal(fail.securities.length,0);assert.equal(fail.warnings.length,2);
});
