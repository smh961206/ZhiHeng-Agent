// Live diagnostics: no model calls, research jobs or orders. Public data may be archived.
import {fetchQuote,createQuoteFetcher,cnReportList,secReports,remote} from '../server/market-data.mjs';
import {createSECLookup} from '../server/sec-directory.mjs';
import {extractPDF} from '../server/pdf-extractor.mjs';
const samples=[{market:'CN',symbol:'600519'},{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}];
const results=[];
async function check(name,run){
 const started=Date.now();
 try{const detail=await run();results.push({name,status:'passed',ms:Date.now()-started,detail});}
 catch(error){results.push({name,status:'failed',ms:Date.now()-started,error:error.message});process.exitCode=1;}
 console.log(JSON.stringify(results.at(-1)));
}
const signal=AbortSignal.timeout(180000);
for(const security of samples){
 const label=`${security.market}:${security.symbol}`;
 await check(label+' quote',async()=>{const q=await fetchQuote(security,signal);return {provider:q.provider,currency:q.currency,asOf:q.asOf,stale:!!q.stale};});
 // Force the primary offline locally to exercise the independent live backup.
 const fallback=createQuoteFetcher({longbridgeConfigured:()=>false,request:(url,options)=>url.startsWith('https://qt.gtimg.cn/')?remote(url,options):Promise.reject(new Error('诊断模拟主行情源不可用'))});
 await check(label+' backup quote',async()=>{const q=await fallback(security,signal);return {provider:q.provider,currency:q.currency,asOf:q.asOf};});
 await check(label+' official reports',async()=>{
  const list=security.market==='US'?await secReports(security,3,'A',signal):await cnReportList(security,3,'A',signal);
  let readable;
  if(security.market==='US'){
   readable=list.sources.filter(item=>item.factsCount>0).length;
   if(!readable)throw new Error('财报目录可读，但核心XBRL事实为空');
  }else{
   const bytes=await remote(list.reports[0].url,{signal,maxBytes:32_000_000,timeoutMs:45000,totalTimeoutMs:60000,retries:1});
   if(!bytes.subarray(0,1024).toString('latin1').includes('%PDF-'))throw new Error('最新官方报告返回的不是PDF');
   const pdf=await extractPDF(bytes,signal);readable=pdf.text.trim().length;
   if(readable<200)throw new Error('最新官方PDF没有可读取的正文');
  }
  return {name:list.name,reports:list.reports.length,limited:list.limited,warnings:list.warnings,...(security.market==='US'?{usableFacts:readable}:{pdfCharacters:readable})};
 });
}
await check('SEC backup company directory',async()=>{
 const lookup=createSECLookup({request:(url,options)=>url.includes('efts.sec.gov')?Promise.reject(new Error('诊断模拟SEC搜索不可用')):remote(url,options)});
 const matches=await lookup('AAPL',signal);if(matches.length!==1||matches[0].symbol!=='AAPL')throw new Error('SEC备用目录未唯一匹配AAPL');
 return matches.map(({symbol,cik,verifiedBy})=>({symbol,cik,verifiedBy}));
});
console.log(`${results.filter(item=>item.status==='passed').length}/${results.length} checks passed`);
const {closeStorage}=await import('../server/storage.mjs');
const {fetchLongbridgeQuote}=await import('../server/longbridge-quotes.mjs');
fetchLongbridgeQuote.close();await closeStorage();
