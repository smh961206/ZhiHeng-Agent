// Run after data-readiness-diagnostics.mjs. Inject failures into new clients;
// do not stop the real services or modify network settings. No model or orders.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fetchQuote,createQuoteFetcher,officialReportList} from '../server/market-data.mjs';
import {createOfficialReportReader} from '../server/official-reports.mjs';
import {createTushareClient} from '../server/tushare-client.mjs';
import {createTushareFinancials} from '../server/tushare-financials.mjs';
import {createBrokerFundamentals,fetchLongbridgeFundamental} from '../server/longbridge-fundamentals.mjs';
import {fetchLongbridgeQuote} from '../server/longbridge-quotes.mjs';
import {providerConfig} from '../server/data-provider-config.mjs';
import {dataArchive} from '../server/data-archive.mjs';
import {closeStorage} from '../server/storage.mjs';

const offline=async()=>{throw new Error('diagnostic: network unavailable');};
const security={market:'US',symbol:'AAPL'},signal=AbortSignal.timeout(120000),results=[];
const baseline=JSON.parse(await readFile(new URL('../artifacts/data-readiness.json',import.meta.url),'utf8'));
const reference=baseline.results.find(item=>item.security==='US:AAPL');
const check=async(name,run)=>{
 try{results.push({name,status:'passed',...await run()});}
 catch(error){results.push({name,status:'failed',error:error.message});process.exitCode=1;}
 console.log(JSON.stringify(results.at(-1)));
};
try{
 const fresh=await fetchQuote(security,signal);
 assert.notEqual(fresh.stale,true);
 await check('行情跨实例恢复及过期拒绝',async()=>{
  const fallback=await createQuoteFetcher({request:offline,longbridgeConfigured:()=>false,archive:dataArchive})(security,signal);
  assert.equal(fallback.stale,true);assert.equal(fallback.fromCache,true);
  assert.equal(fallback.fetchedAt,fresh.fetchedAt);assert.equal(fallback.asOf,fresh.asOf);
  await assert.rejects(createQuoteFetcher({request:offline,longbridgeConfigured:()=>false,archive:dataArchive,clock:()=>Date.now()+16*60000})(security,signal),/行情源均不可用/);
  return {fetchedAt:fallback.fetchedAt,stale:true,expiredSnapshotRejected:true};
 });
 await check('官方目录断网恢复',async()=>{
  const directory=await officialReportList(security,8,'F',signal,{us:offline,archive:dataArchive});
  assert.equal(directory.stale,true);assert.ok(directory.directoryFetchedAt);assert.ok(directory.reports.length>=8);
  return {reports:directory.reports.length,directoryFetchedAt:directory.directoryFetchedAt,stale:directory.stale};
 });
 await check('官方正文持久归档与原抓取时间',async()=>{
  const original=reference.sources.find(source=>source.type==='official-report');assert.ok(original);
  let requests=0;
  const source=await createOfficialReportReader({request:async()=>{requests++;return offline();}})({...original,security:'US:AAPL'},signal);
  assert.equal(source.fromCache,true);assert.equal(requests,0);assert.equal(source.fetchedAt,original.fetchedAt);assert.ok(source.text.length>200);
  return {fromCache:true,requests,fetchedAt:source.fetchedAt,sha256Verified:true};
 });
 await check('Tushare三张财务表断网恢复',async()=>{
  const client=createTushareClient({request:offline,archive:dataArchive});
  const data=await createTushareFinancials({client})(security,{years:9,signal});
  assert.equal(data.sources.length,3);
  for(const source of data.sources){
   assert.equal(source.stale,true);assert.equal(source.fromCache,true);
   assert.equal(source.fetchedAt,reference.sources.find(item=>item.type==='vendor-financials'&&item.title===source.title)?.fetchedAt);
  }
  return {tables:data.sources.length,allMarkedStale:true,originalTimesPreserved:true};
 });
 await check('长桥四类基本面断网恢复',async()=>{
  const scope=()=>createHash('sha256').update(providerConfig().longbridge.accessToken).digest('hex');
  const data=await createBrokerFundamentals({fetcher:offline,configured:()=>true,archive:dataArchive,scope})(security,{years:8,signal});
  assert.equal(data.sources.length,4);
  for(const source of data.sources){
   assert.equal(source.stale,true);assert.equal(source.fromCache,true);
   assert.equal(source.fetchedAt,reference.sources.find(item=>item.title===source.title)?.fetchedAt);
  }
  return {tables:data.sources.length,allMarkedStale:true,originalTimesPreserved:true};
 });
}catch(error){results.push({name:'前置条件',status:'failed',error:error.message});process.exitCode=1;}
finally{
 fetchLongbridgeQuote.close();fetchLongbridgeFundamental.close();await closeStorage();
 await writeFile(new URL('../artifacts/data-failover.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),injectedNetworkFailure:true,results},null,2));
}
