import {collectMarketData} from '../server/market-data.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
import {closeStorage} from '../server/storage.mjs';
try{
const samples=[{market:'CN',symbol:'600519'},{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}];
const result=await collectMarketData(samples,{years:3,mode:'A',signal:AbortSignal.timeout(300000),emit:(type,message)=>console.log(type,message)});
const summary={fetchedAt:result.fetchedAt,quotes:result.snapshots.map(({market,symbol,provider,currency,asOf})=>({market,symbol,provider,currency,asOf})),coverage:result.coverage,sources:result.sources.map(({text,...s})=>({...s,characters:text.length})),warnings:result.warnings};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/data-smoke.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({quotes:summary.quotes,coverage:summary.coverage,warnings:summary.warnings},null,2));
if(result.snapshots.length!==3||result.coverage.some(c=>c.read===0))process.exitCode=1;
}finally{await closeStorage();}
