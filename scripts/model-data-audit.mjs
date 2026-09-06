// Read-only live audit. No models, orders, accounts, or database writes.
import {writeFile,mkdir} from 'node:fs/promises';
import {providerStatus} from '../server/data-provider-config.mjs';
import {fetchLongbridgeQuote} from '../server/longbridge-quotes.mjs';
import {fetchTushareFinancials} from '../server/tushare-financials.mjs';
import {fetchShareholderData} from '../server/shareholder-data.mjs';
import {checkDataBasis} from '../server/data-basis.mjs';
import {cnReportList,secReports,remote,createQuoteFetcher} from '../server/market-data.mjs';
import {extractPDF} from '../server/pdf-extractor.mjs';
import {closeStorage} from '../server/storage.mjs';

const configuration=providerStatus(),startedAt=new Date().toISOString(),results=[];
const output=new URL('../artifacts/model-data-audit.json',import.meta.url);
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
const save=()=>writeFile(output,JSON.stringify({startedAt,updatedAt:new Date().toISOString(),configuration,sampleOnly:true,results},null,2));
async function check(security,name,run){
 const started=Date.now();let result;
 try{result={security:`${security.market}:${security.symbol}`,name,...await run(AbortSignal.timeout(240000)),ms:Date.now()-started};}
 catch(error){result={security:`${security.market}:${security.symbol}`,name,status:'failed',error:error.message,ms:Date.now()-started};}
 results.push(result);await save();console.log(JSON.stringify(result));
}
try{
 for(const security of [{market:'CN',symbol:'600519'},{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}]){
  await check(security,'longbridge_quote_and_capital',async signal=>{
   if(!configuration.longbridge.configured)return {status:'unconfigured'};
   const q=await fetchLongbridgeQuote(security,signal);
   return {status:'passed',provider:q.provider,currency:q.currency,asOf:q.asOf,shareCapital:q.shareCapital};
  });
  await check(security,'independent_tencent_backup',async signal=>{
   const fallback=createQuoteFetcher({longbridgeConfigured:()=>false,request:(url,options)=>url.startsWith('https://qt.gtimg.cn/')?remote(url,options):Promise.reject(new Error('诊断模拟主行情源不可用'))});
   const q=await fallback(security,signal);
   if(!q.provider.includes('腾讯'))throw new Error('没有实际使用独立腾讯备用源');
   return {status:'passed',provider:q.provider,currency:q.currency,asOf:q.asOf};
  });
  await check(security,'tushare_nine_year_financials',async signal=>{
   const result=await fetchTushareFinancials(security,{years:9,signal});
   return {status:!result.configured?'unconfigured':result.sources.length===3?'passed':'failed',tables:result.coverage,warnings:result.warnings,
    annualChecks:checkDataBasis(security,{years:8,financials:result}).checks.filter(item=>['income','balancesheet','cashflow','opening-equity','balance-identity'].includes(item.id)).map(({annualObservations,...item})=>item)};
  });
  await check(security,'official_eight_year_reports',async signal=>{
   const list=security.market==='US'?await secReports(security,8,'F',signal):await cnReportList(security,8,'F',signal);
   const reports=list.reports.map(({title,date,reportDate,annual,url})=>({title,date,reportDate,annual,url}));
   const observedAnnualYears=[...new Set(reports.filter(report=>report.annual).map(report=>Number((report.reportDate||report.title).match(/20\d{2}/)?.[0])).filter(Number.isFinite))].sort((a,b)=>a-b);
   const lastYear=security.market==='US'?observedAnnualYears.at(-1):new Date(startedAt).getUTCFullYear()-1;
   const expectedAnnualYears=Number.isFinite(lastYear)?Array.from({length:8},(_,i)=>lastYear-7+i):[];
   const annualCoverage={expectedAnnualYears,observedAnnualYears,missingAnnualYears:expectedAnnualYears.filter(year=>!observedAnnualYears.includes(year)),basis:security.market==='US'?'最近已取得年报所标财政年度及此前七年；不证明最新应披露年报已齐全':'最近八个完整自然年度'};
   if(security.market==='US'){
    const facts=list.sources.flatMap(source=>{const start=source.text.indexOf('\n[');return start<0?[]:JSON.parse(source.text.slice(start+1));});
    const tags=[...new Set(facts.map(item=>item.tag))];
    return {status:list.limited||annualCoverage.missingAnnualYears.length?'partial':facts.length?'passed':'failed',content:'official-core-xbrl-only',reports,annualCoverage,directoryLimited:list.limited,warnings:list.warnings,
     facts: facts.length,dividendTags:tags.filter(tag=>/Dividends/i.test(tag)),repurchaseTags:tags.filter(tag=>/Repurchase/i.test(tag)),shareTags:tags.filter(tag=>/Shares|StockOutstanding/i.test(tag)),
     limitation:'不代表完整财报正文、业务分部、全部附注或8-K/6-K覆盖'};
   }
   const parsed=[];
   for(const report of reports){
    try{
     const bytes=await remote(report.url,{signal,maxBytes:32_000_000,timeoutMs:45000,totalTimeoutMs:60000,retries:1});
     if(!bytes.subarray(0,1024).toString('latin1').includes('%PDF-'))throw new Error('返回内容不是PDF');
     const pdf=await extractPDF(bytes,signal);if(pdf.text.trim().length<200)throw new Error('没有可读正文');
     parsed.push({title:report.title,status:'passed',pages:pdf.pages,readPages:pdf.readPages,characters:pdf.text.length,truncated:pdf.truncated,emptyPages:pdf.emptyPages});
    }catch(error){signal.throwIfAborted();parsed.push({title:report.title,status:'failed',error:error.message});}
   }
   return {status:list.limited||annualCoverage.missingAnnualYears.length||parsed.some(item=>item.status!=='passed'||item.truncated||item.emptyPages>0)?'partial':'passed',reports,annualCoverage,directoryLimited:list.limited,warnings:list.warnings,parsed};
  });
  await check(security,'eight_year_shareholder_history',async signal=>{
   const result=await fetchShareholderData(security,{years:8,signal});
   return {status:!result.configured?'unconfigured':!result.supported?'unsupported':result.coverage.some(item=>item.status==='failed'||item.limited)?'partial':'passed',
    tables:result.coverage.map(({changes,annualSnapshots,...item})=>({...item,shareChangeObservations:changes?.length})),warnings:result.warnings};
  });
 }
}finally{fetchLongbridgeQuote.close();await closeStorage();await save();}
console.log(JSON.stringify({report:output.pathname,passed:results.filter(item=>item.status==='passed').length,total:results.length}));
process.exitCode=results.some(item=>item.status==='failed')?1:0;
