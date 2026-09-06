// Full data-collection acceptance run; no model calls, research jobs, or orders.
import {writeFile,mkdir} from 'node:fs/promises';
import {collectMarketData} from '../server/market-data.mjs';
import {fetchLongbridgeQuote} from '../server/longbridge-quotes.mjs';
import {fetchLongbridgeFundamental} from '../server/longbridge-fundamentals.mjs';
import {closeStorage} from '../server/storage.mjs';

const startedAt=new Date().toISOString(),results=[];
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
const save=()=>writeFile(new URL('../artifacts/data-readiness.json',import.meta.url),JSON.stringify({startedAt,updatedAt:new Date().toISOString(),sampleOnly:true,results},null,2));
try{
 for(const security of [{market:'CN',symbol:'600519'},{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}]){
  const label=`${security.market}:${security.symbol}`;const started=Date.now();
  try{
   const data=await collectMarketData([security],{years:8,mode:'F',signal:AbortSignal.timeout(900000),emit:(type,message)=>console.log(JSON.stringify({type,message}))});
   const result={security:label,ms:Date.now()-started,coverage:data.coverage,financialCoverage:data.financialCoverage,shareholderCoverage:data.shareholderCoverage.map(item=>({...item,tables:item.tables.map(({ledger,changes,annualSnapshots,...table})=>({...table,eventCount:ledger?.events?.length}))})),valuationCoverage:data.valuationCoverage,
    sources:data.sources.map(({id,title,type,provider,date,fetchedAt,stale,fromCache,pages,readPages,truncated,url,sha256,factsCount})=>({id,title,type,provider,date,fetchedAt,stale,fromCache,pages,readPages,truncated,url,sha256,factsCount})),dataChecks:data.dataChecks,warnings:data.warnings};
   results.push(result);await save();console.log(JSON.stringify({security:label,status:'collected',sources:result.sources.length,ms:result.ms}));
  }catch(error){results.push({security:label,status:'failed',error:error.message,ms:Date.now()-started});await save();}
 }
}finally{fetchLongbridgeQuote.close();fetchLongbridgeFundamental.close();await closeStorage();await save();}
console.log(JSON.stringify({report:'artifacts/data-readiness.json',securities:results.length}));
process.exitCode=results.some(item=>item.status==='failed')?1:0;
