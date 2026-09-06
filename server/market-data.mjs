import {remote} from './market-request.mjs';
import {createMarketCache} from './market-cache.mjs';
import {lookupSECCompanies,normalizedTicker} from './sec-directory.mjs';
import {providerStatus} from './data-provider-config.mjs';
import {fetchLongbridgeQuote} from './longbridge-quotes.mjs';
import {fetchTushareFinancials} from './tushare-financials.mjs';
import {fetchShareholderData} from './shareholder-data.mjs';
import {checkDataBasis} from './data-basis.mjs';
import {fetchValuationHistory} from './valuation-history.mjs';
import {chooseReports,reportPeriod,reportCoverage} from './report-periods.mjs';
import {hkexDisclosures,mergeReportAlternatives} from './hkex-disclosures.mjs';
import {readOfficialReport,secAttachments} from './official-reports.mjs';
import {dataArchive} from './data-archive.mjs';
import {capitalEvidence} from './capital-evidence.mjs';
import {xbrlObservations,factCoverage,coreFactGroups} from './financial-observations.mjs';
import {parsingWarnings} from './document-layout.mjs';
import {fetchBrokerFundamentals} from './longbridge-fundamentals.mjs';
export {remote} from './market-request.mjs';
const now=()=>new Date().toISOString();
const dateCN=value=>new Date(value).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
const clean=text=>String(text??'').replace(/<[^>]*>/g,'').trim();
export function validateSecurities(value){
 if(!Array.isArray(value)||value.length>3)throw new Error('每项研究最多3个标的');
 const securities=value.map(x=>{
  if(!x||!['CN','HK','US'].includes(x.market)||typeof x.symbol!=='string')throw new Error('市场或股票代码无效');
  const symbol=x.symbol.trim().toUpperCase();
  if(x.market==='CN'&&!/^[036489]\d{5}$/.test(symbol))throw new Error('A股请输入6位股票代码');
  if(x.market==='HK'&&!/^\d{1,5}$/.test(symbol))throw new Error('港股请输入1至5位代码');
  if(x.market==='US'&&!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw new Error('美股代码格式无效，例如 AAPL、BRK-B');
  return {market:x.market,symbol:x.market==='HK'?symbol.padStart(5,'0'):symbol};
 });
 return [...new Map(securities.map(x=>[x.market+':'+x.symbol,x])).values()];
}
const json=async(url,options)=>{
 const bytes=await remote(url,options);
 try{return JSON.parse(bytes.toString('utf8'));}catch{throw new Error(`${new URL(url).hostname} 返回了无效JSON，接口可能暂不可用或格式已变化`);}
};
const cachedRead=createMarketCache();
const cachedJSON=(url,signal,{ttlMs=300000,...options}={})=>cachedRead(url,shared=>json(url,{...options,signal:shared}),{signal,ttlMs});
function validNumber(x){return typeof x==='number'&&Number.isFinite(x)?x:null;}
export function parseEastmoney(data,security,fetchedAt=now()){
 const d=data?.data;
 if(!d||d.f57!==security.symbol||!Number.isInteger(d.f59)||d.f59<0||d.f59>5)throw new Error('行情代码或价格精度校验失败');
 const divisor=10**d.f59;
 const price=validNumber(d.f43),timestamp=validNumber(d.f86);
 if(price===null||price<=0||!timestamp||timestamp<946684800)throw new Error('行情缺少有效价格/行情时间，可能停牌或来源暂不可用');
 return {market:security.market,symbol:security.symbol,name:d.f58,currency:security.market==='HK'?'HKD':'CNY',price:price/divisor,previousClose:validNumber(d.f60)===null?null:d.f60/divisor,changePercent:validNumber(d.f170)===null?null:d.f170/100,marketCap:validNumber(d.f116),pb:validNumber(d.f167)>0?d.f167/100:null,asOf:new Date(timestamp*1000).toISOString(),fetchedAt,provider:'东方财富公开行情',official:false,url:`https://push2.eastmoney.com/api/qt/stock/get?secid=${security.market==='HK'?'116':security.symbol.startsWith('6')?'1':'0'}.${security.symbol}`,notice:'最新可得行情快照；来源可能延迟，非交易所直连。行情币种不代表财报币种。PE口径未核实，未自动用于估值。'};
}
export function parseYahoo(data,security,fetchedAt=now()){
 const d=data?.chart?.result?.[0]?.meta;
 if(!d||d.symbol?.toUpperCase()!==security.symbol.replaceAll('.','-'))throw new Error('美股行情代码校验失败');
 if(!(validNumber(d.regularMarketPrice)>0)||!(validNumber(d.regularMarketTime)>946684800)||!d.currency)throw new Error('美股行情缺少价格、时间或币种');
 return {market:'US',symbol:security.symbol,name:d.longName||d.shortName||d.symbol,currency:d.currency,price:d.regularMarketPrice,previousClose:validNumber(d.chartPreviousClose),changePercent:validNumber(d.regularMarketChangePercent),asOf:new Date(d.regularMarketTime*1000).toISOString(),fetchedAt,provider:'Yahoo Finance 公开行情',official:false,url:`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(d.symbol)}?interval=1d&range=1d`,notice:'最近常规交易时段行情，可能延迟；不混入盘前盘后价格。非交易所直连。'};
}
export function freshness(quote,reference=Date.now()){
 const age=reference-Date.parse(quote.asOf);
 return age<0?'行情时间晚于本机时间，请核对时钟':age>7*86400000?'市场数据可能过时（超过7个自然日；未使用交易日历）':'显示来源行情时间；休市时保留最近交易行情，延迟未获保证';
}
export function newYorkTime(value){
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))throw new Error('美股行情时间格式无效');
 const numbers=value.match(/\d+/g).map(Number);const [year,month,day,hour,minute,second]=numbers;
 const wall=Date.UTC(year,month-1,day,hour,minute,second);
 const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const parts=Object.fromEntries(formatter.formatToParts(new Date(wall)).map(p=>[p.type,p.value]));
 const offset=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)-wall;
 const utc=wall-offset;
 if(formatter.format(new Date(utc))!==value)throw new Error('美股交易时区换算未通过校验');
 return new Date(utc).toISOString();
}
const tencentCode=security=>security.market==='US'?`us${security.symbol}`:security.market==='HK'?`hk${security.symbol}`:`${security.symbol.startsWith('6')?'sh':/^[489]/.test(security.symbol)?'bj':'sz'}${security.symbol}`;
function chinaTime(value){
 const formatted=/^\d{14}$/.test(value)?value.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,'$1-$2-$3 $4:$5:$6'):value.replaceAll('/','-');
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(formatted))throw new Error('行情时间格式无效');
 const date=new Date(formatted.replace(' ','T')+'+08:00');
 if(!Number.isFinite(date.getTime())||new Date(date.getTime()+8*3600000).toISOString().slice(0,19)!==formatted.replace(' ','T'))throw new Error('行情日期无效');
 return date.toISOString();
}
export function parseTencent(text,security,fetchedAt=now()){
 const match=text.trim().match(/^v_([^=]+)="([^"]+)";$/);
 if(!match||match[1]!==tencentCode(security))throw new Error('备用行情市场或代码不匹配');
 const parts=match[2].split('~');
 const code=parts[2]?.replace(/\.(OQ|N|A)$/,'').replaceAll('.','-');
 if(code!==security.symbol.replaceAll('.','-'))throw new Error('备用行情证券代码不匹配');
 const num=s=>typeof s==='string'&&s.trim()!==''&&Number.isFinite(Number(s))?Number(s):null;
 const price=num(parts[3]);
 const currency={CN:'CNY',HK:'HKD',US:'USD'}[security.market];
 // Currency positions differ by market. Never infer it from the company name.
 const currencyIndex={CN:82,HK:75,US:35}[security.market];
 if(!(price>0)||parts[currencyIndex]!==currency)throw new Error('备用行情价格或币种校验失败');
 return {market:security.market,symbol:security.symbol,name:security.market==='US'?parts[46]||parts[1]:parts[1],currency,price,previousClose:num(parts[4]),changePercent:num(parts[32]),asOf:security.market==='US'?newYorkTime(parts[30]):chinaTime(parts[30]),fetchedAt,provider:'腾讯财经公开行情（备用源）',official:false,url:`https://qt.gtimg.cn/q=${encodeURIComponent(tencentCode(security))}`,notice:security.market==='US'?'美国东部交易时间按America/New_York转换，处理夏令时。公开行情可能延迟，非交易所直连。':'行情时间按UTC+8转换。公开行情可能延迟，非交易所直连；未核实估值字段不自动用于估值。'};
}
export function createQuoteFetcher({request=remote,clock=Date.now,longbridge=fetchLongbridgeQuote,longbridgeConfigured=()=>providerStatus().longbridge.configured,archive}={}){
 const cache=new Map(),read=createMarketCache({maxEntries:256,clock});
 return async function fetchQuote(input,signal){
  const security=validateSecurities([input])[0],key=`${security.market}:${security.symbol}`;
  const quote=await read(key,async shared=>{
   const errors=[];
   const secid=`${security.market==='HK'?'116':security.symbol.startsWith('6')?'1':'0'}.${security.symbol}`;
   const primary=security.market==='US'?`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(security.symbol.replaceAll('.','-'))}?interval=1d&range=1d`:`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f59,f60,f86,f116,f167,f170`;
   const providers=[
    [primary,bytes=>(security.market==='US'?parseYahoo:parseEastmoney)(JSON.parse(bytes.toString('utf8')),security,new Date(clock()).toISOString())],
    [`https://qt.gtimg.cn/q=${encodeURIComponent(tencentCode(security))}`,bytes=>parseTencent(new TextDecoder('gb18030').decode(bytes),security,new Date(clock()).toISOString())],
   ].map(([url,parse])=>({name:new URL(url).hostname,load:async()=>parse(await request(url,{signal:shared,timeoutMs:5000,totalTimeoutMs:11000,retries:1}))}));
   if(longbridgeConfigured())providers.unshift({name:'长桥 OpenAPI',load:()=>longbridge(security,shared)});
   for(const {name,load} of providers){
    try{
     const value=await load();
     const result={...value,...(errors.length?{fallbackReason:errors.join('；')}:{})};
     if(!cache.has(key)&&cache.size>=256)cache.delete(cache.keys().next().value);
     cache.set(key,{at:clock(),value:result});
     if(archive){try{await archive.put(`quote:${key}`,{at:clock(),value:result},{retainMs:86400000});}catch{result.cacheWarning='行情已读取，但持久快照保存失败。';}}
     return result;
    }catch(error){shared.throwIfAborted();errors.push(`${name}：${error.message}`);}
   }
   const previous=cache.get(key)||await archive?.get(`quote:${key}`,{maxAgeMs:15*60000}).catch(()=>null);
   if(previous&&clock()-previous.at<=15*60000)return {...previous.value,fromCache:true,stale:true,warning:'行情源暂不可用，显示15分钟内成功获取的旧快照；请核对行情时间。',fallbackReason:errors.join('；')};
   cache.delete(key);throw new Error(`行情源均不可用：${errors.join('；')}`);
  },{signal,ttlMs:15000,shouldCache:value=>!value.stale});
  return {...quote,freshness:freshness(quote,clock())};
 };
}
export const fetchQuote=createQuoteFetcher({archive:dataArchive});
export async function securityCatalog(market,signal){
 const key=market==='HK'?'hke':'szse';
 return cachedRead(`catalog:${key}`,async shared=>{
  const data=await json(`https://www.cninfo.com.cn/new/data/${key}_stock.json`,{signal:shared});
  if(!Array.isArray(data.stockList)||!data.stockList.length||data.stockList.some(item=>typeof item.code!=='string'||typeof item.zwjc!=='string'||typeof item.orgId!=='string'))throw new Error('官方代码目录格式变化');
  return data.stockList;
 },{signal,ttlMs:86400000});
}
async function cnCompany(security,signal){
 const company=(await securityCatalog(security.market,signal)).find(s=>s.code===security.symbol);
 if(!company)throw new Error('巨潮资讯官方目录未找到该证券；不猜测公司身份');
 return company;
}
export function selectReports(reports,years,mode){
 return chooseReports(reports,years,mode);
}
export async function cnReportList(security,years,mode,signal,{loadCompany=cnCompany,requestJSON=json}={}){
 const company=await loadCompany(security,signal);
 const today=dateCN(Date.now());const from=`${Number(today.slice(0,4))-years-1}-01-01`;
 const column=security.market==='HK'?'hke':security.symbol.startsWith('6')?'sse':/^[489]/.test(security.symbol)?'bse':'szse';
 const queries=security.market==='HK'?['年报','年報','报告','報告','业绩','業績']:[''];
 const reports=[],warnings=[];let limited=false;
 searchQueries:for(const searchkey of queries){
  const maxPages=security.market==='HK'?3:6;
  for(let pageNum=1;pageNum<=maxPages;pageNum++){
  signal?.throwIfAborted();
  const payload=new URLSearchParams({pageNum:String(pageNum),pageSize:'30',column,tabName:'fulltext',stock:`${company.code},${company.orgId}`,seDate:`${from}~${today}`,searchkey,category:security.market==='CN'?'category_ndbg_szsh;category_bndbg_szsh;category_yjdbg_szsh;category_sjdbg_szsh':'',sortName:'time',sortType:'desc',isHLtitle:'false'});
  let data;
  try{
   data=await requestJSON('https://www.cninfo.com.cn/new/hisAnnouncement/query',{signal,method:'POST',body:payload.toString()});
   if(!data||!Array.isArray(data.announcements)&&Number(data.totalAnnouncement)!==0)throw new Error('官方公告列表格式变化');
  }catch(error){
   signal?.throwIfAborted();limited=true;
   warnings.push(`官方公告检索${searchkey?`“${searchkey}”`:''}第${pageNum}页失败：${error.message}`);
   break searchQueries;
  }
  const hasMore=data.hasMore===true||data.hasMore==='true';
  if(hasMore&&pageNum===maxPages)limited=true;
  for(const a of data.announcements??[]){
   const title=clean(a.announcementTitle);
   if(a.secCode!==security.symbol||/摘要|英文|English|通知|董事会|董事會|会议|會議|预告|預告|提示|说明会|說明會|通告/i.test(title))continue;
   if(/环境|環境|社会|社會|管治|可持续|可持續/i.test(title)&&!/年度报告|年度報告|年报|年報|annual report/i.test(title))continue;
   if(!/年度报告|年度報告|年报|年報|半年度|中期|季度|全年业绩|全年業績|annual report|interim report/i.test(title))continue;
   const url=new URL(a.adjunctUrl,'https://static.cninfo.com.cn/').href;
   if(!/^https:\/\/static\.cninfo\.com\.cn\/finalpage\/[\w/.-]+\.pdf$/i.test(url))continue;
   reports.push({title,url,date:dateCN(a.announcementTime),annual:/年度报告|年度報告|年报|年報|annual report/i.test(title)&&!/半年度/.test(title),provider:'巨潮资讯官方披露平台',official:true,security:`${security.market}:${security.symbol}`});
  }
  if(!hasMore||!data.announcements?.length)break;
  }
 }
 const selected=selectReports(reports,years,mode);
 if(!selected.length)throw new Error(warnings.length?warnings.join('；'):'官方披露检索未找到可读取的定期报告');
 return {name:company.zwjc,reports:selected,listedCount:new Set(reports.map(r=>r.url)).size,limited,warnings,periodCoverage:reportCoverage(selected,{years:mode==='A'?5:years,market:security.market})};
}
export async function pdfReport(report,signal){
 return readOfficialReport(report,signal);
}
export async function cnCapitalReports(security,years,signal,{loadCompany=cnCompany,requestJSON=json}={}){
 const company=await loadCompany(security,signal),today=dateCN(Date.now()),from=`${Number(today.slice(0,4))-years}-01-01`;
 const reports=[],warnings=[];let limited=false;
 const column=security.symbol.startsWith('6')?'sse':/^[489]/.test(security.symbol)?'bse':'szse';
 for(const searchkey of ['分红','权益分派','利润分配','回购','注销']){
  for(let pageNum=1;pageNum<=3;pageNum++){
   signal?.throwIfAborted();
   const payload=new URLSearchParams({pageNum:String(pageNum),pageSize:'30',column,tabName:'fulltext',stock:`${company.code},${company.orgId}`,seDate:`${from}~${today}`,searchkey,category:'',sortName:'time',sortType:'desc',isHLtitle:'false'});
   let data;
   try{data=await requestJSON('https://www.cninfo.com.cn/new/hisAnnouncement/query',{signal,method:'POST',body:payload.toString()});if(!Array.isArray(data.announcements)&&Number(data.totalAnnouncement)!==0)throw new Error('公告目录格式变化');}
   catch(error){signal?.throwIfAborted();limited=true;warnings.push(`资本配置公告“${searchkey}”查询失败：${error.message}`);break;}
   const hasMore=data.hasMore===true||data.hasMore==='true';if(hasMore&&pageNum===3)limited=true;
   for(const item of data.announcements||[]){
    const title=clean(item.announcementTitle);if(item.secCode!==security.symbol||/摘要|英文|English|法律意见|法律意見/i.test(title))continue;
    const url=new URL(item.adjunctUrl,'https://static.cninfo.com.cn/').href;
    if(!/^https:\/\/static\.cninfo\.com\.cn\/finalpage\/[\w/.-]+\.pdf$/i.test(url))continue;
    reports.push({title,url,date:dateCN(item.announcementTime),annual:false,security:`CN:${security.symbol}`,provider:'巨潮资讯官方披露平台',official:true,purpose:'shareholder-action'});
   }
   if(!hasMore||!data.announcements?.length)break;
  }
 }
 return {reports:[...new Map(reports.map(item=>[item.url,item])).values()],warnings,limited};
}

export function selectCapitalReports(reports,{maxReports=24}={}){
 const sorted=[...reports].sort((a,b)=>b.date.localeCompare(a.date)),selected=[],seen=new Set();
 const add=report=>{if(!seen.has(report.url)){seen.add(report.url);selected.push(report);}};
 // Include final/implementation evidence and a spread of historical years.
 const completed=sorted.filter(item=>/完成|实施|實施|注销|註銷|distribution|dividend|monthly return|next day|completed/i.test(item.title));
 for(const year of [...new Set(sorted.map(item=>item.date.slice(0,4)))]){
  const candidate=completed.find(item=>item.date.startsWith(year))||sorted.find(item=>item.date.startsWith(year));if(candidate)add(candidate);
 }
 for(const report of [...completed,...sorted]){if(selected.length>=maxReports)break;add(report);}
 return {reports:selected.slice(0,maxReports).sort((a,b)=>b.date.localeCompare(a.date)),limited:reports.length>maxReports,totalFound:reports.length};
}
export async function secCompany(security,signal,{lookup=lookupSECCompanies,loadJSON=cachedJSON}={}){
 const matches=(await lookup(security.symbol,signal)).filter(item=>normalizedTicker(item.symbol)===normalizedTicker(security.symbol));
 const ciks=[...new Set(matches.map(item=>item.cik))];
 if(ciks.length!==1||!/^\d{10}$/.test(ciks[0]))throw new Error('SEC代码未唯一匹配公司，无法自动确认CIK');
 const cik=ciks[0],url=`https://data.sec.gov/submissions/CIK${cik}.json`;
 const submissions=await loadJSON(url,signal);
 if(Number(submissions.cik)!==Number(cik)||!submissions.tickers?.some(t=>normalizedTicker(t)===normalizedTicker(security.symbol)))throw new Error('SEC公司披露中的股票代码或CIK不匹配');
 return {cik,submissions,url};
}
const metricPattern=/^(Revenue|SalesRevenue|NetIncomeLoss|ProfitLoss|OperatingIncomeLoss|GrossProfit|Assets$|Liabilities$|StockholdersEquity|CashAndCashEquivalentsAtCarryingValue|NetCashProvidedByUsedInOperatingActivities|PaymentsToAcquirePropertyPlantAndEquipment|EarningsPerShare|CommonStockSharesOutstanding|EntityCommonStockSharesOutstanding|WeightedAverageNumberOf|ShareBasedCompensation|StockBasedCompensation|CommonStockDividendsPerShare|PaymentsOfDividends|PaymentsForRepurchaseOf|LongTermDebt|ShortTermBorrowings|ShortTermInvestments|MarketableSecurities|MinorityInterest|NoncontrollingInterest|PreferredStock|OperatingLeaseLiability|AccountsReceivableNetCurrent|InventoryNet|Goodwill$)|Revenue|ProfitLoss|Equity$|CashFlowsFromUsedInOperatingActivities|DividendsPaid|PurchaseOfPropertyPlantAndEquipment|WeightedAverageNumberOfOrdinaryShares/;
export function secFactsSources(data,filings,security,sourceUrl){
 const sources=[];
 for(const filing of filings){
  const rows=[];
  for(const [taxonomy,metrics] of Object.entries(data.facts??{}))for(const [tag,metric] of Object.entries(metrics)){
   if(!metricPattern.test(tag)&&!Object.values(coreFactGroups).flat().includes(tag))continue;
   for(const [unit,values] of Object.entries(metric.units??{}))for(const v of values){
    if(v.accn!==filing.accession||!Number.isFinite(v.val))continue;
    rows.push({tag:`${taxonomy}:${tag}`,label:metric.label,entity:String(data.cik),entityScheme:'http://www.sec.gov/CIK',dimensions:[],standardConcept:['us-gaap','ifrs-full','dei'].includes(taxonomy),origin:'companyfacts-api',unit,value:v.val,start:v.start??null,end:v.end,filed:v.filed,form:v.form,fy:v.fy,fp:v.fp,frame:v.frame??null});
   }
  }
  const dedup=[...new Map(rows.map(r=>[JSON.stringify(r),r])).values()];
  sources.push({financialFacts:dedup,coreFactCoverage:factCoverage(dedup),title:`${security.symbol} ${filing.form} · ${filing.reportDate||filing.date}`,url:sourceUrl,filingUrl:filing.url,date:filing.date,reportDate:filing.reportDate,annual:filing.annual,fetchedAt:now(),official:true,provider:'SEC EDGAR 官方 XBRL',type:'official-xbrl',security:`US:${security.symbol}`,coverage:dedup.length?'指定核心财务标签；非完整财报正文':'官方已披露，但所选XBRL标签无匹配事实',text:`公司：${data.entityName}；CIK：${data.cik}\n申报表单：${filing.form}；报告期：${filing.reportDate}；披露日：${filing.date}；Accession：${filing.accession}\n官方原件：${filing.url}\n下列是该次申报的官方XBRL核心财务事实。保留原始单位、期间、比较期和标签，不自动相加或拼接TTM。不是完整财报正文，不含管理层讨论及所有附注。空列表代表数据不足（不等于零）。\n${JSON.stringify(dedup,null,2)}`,factsCount:dedup.length});
 }
 return sources;
}
export async function secReports(security,years,mode,signal,{loadCompany=secCompany,loadJSON=cachedJSON}={}){
 const {cik,submissions,url}=await loadCompany(security,signal);
 let recent=submissions.filings?.recent;
 if(!recent||!['form','filingDate','accessionNumber','primaryDocument','reportDate'].every(key=>Array.isArray(recent[key])&&recent[key].length===recent.form?.length))throw new Error('SEC披露目录格式无效');
 const cutoff=`${new Date().getUTCFullYear()-years-1}-01-01`;
 // Older directory failures must not discard readable recent filings.
 let limited=false;const warnings=[];
 if((recent.filingDate.at(-1)??'')>cutoff){
  const allOlder=(submissions.filings.files??[]).filter(f=>f.filingTo>=cutoff),older=allOlder.slice(0,8);
  if(allOlder.length>older.length){limited=true;warnings.push('SEC历史目录超过本次分页预算，保留覆盖缺口');}
  for(const f of older){
   if(!/^CIK\d+-submissions-\d+\.json$/.test(f.name)){limited=true;continue;}
   try{
    const more=await loadJSON(`https://data.sec.gov/submissions/${f.name}`,signal);
    if(!['form','filingDate','accessionNumber','primaryDocument','reportDate'].every(key=>Array.isArray(more[key])&&more[key].length===more.form?.length))throw new Error('SEC历史披露目录格式无效');
    recent=Object.fromEntries(Object.entries(recent).map(([k,v])=>[k,Array.isArray(v)?[...v,...(more[k]??[])]:v]));
   }catch(error){signal?.throwIfAborted();limited=true;warnings.push(`SEC历史目录 ${f.name} 获取失败：${error.message}`);}
  }
  limited=limited||(recent.filingDate.at(-1)??'')>cutoff;
 }
 const filings=[],adHoc=[];
 for(let i=0;i<recent.form.length;i++){
  const form=recent.form[i];if(!/^(10-K|10-Q|20-F|40-F|8-K|6-K)(\/A)?$/.test(form)||recent.filingDate[i]<cutoff)continue;
  const accession=recent.accessionNumber[i];if(!/^\d{10}-\d{2}-\d{6}$/.test(accession))continue;
  const doc=recent.primaryDocument[i];if(!/^[\w.-]+\.(?:htm|html|txt|pdf)$/i.test(doc))continue;
  const record={title:`${recent.reportDate[i]||recent.filingDate[i]} ${form}`,form,accession,reportDate:recent.reportDate[i],date:recent.filingDate[i],annual:/^(10-K|20-F|40-F)/.test(form),security:`US:${security.symbol}`,official:true,provider:'SEC EDGAR',url:`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll('-','')}/${encodeURIComponent(doc)}`};
  (/^(8-K|6-K)/.test(form)?adHoc:filings).push(record);
 }
 const selected=selectReports(filings,years,mode);
 if(!selected.length)throw new Error('SEC未找到受支持的10-K/10-Q/20-F/40-F财报');
 const factUrl=`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
 let factSources=[];
 try{
  const facts=await loadJSON(factUrl,signal,{maxBytes:35_000_000,timeoutMs:30000,totalTimeoutMs:60000,retries:1});
  if(Number(facts.cik)!==Number(cik))throw new Error('SEC财务数据CIK不匹配');
  factSources=secFactsSources(facts,selected,security,factUrl);
 }catch(error){signal?.throwIfAborted();warnings.push(`SEC结构化事实未取得，继续使用已确认身份的原件目录：${error.message}`);}
 const selectedEvents=adHoc.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,mode==='A'?1:8);
 return {name:submissions.name,listUrl:url,reports:selected,adHocReports:selectedEvents,adHocLimited:adHoc.length>selectedEvents.length,sources:factSources,limited,warnings,
  periodCoverage:reportCoverage(selected,{years:mode==='A'?5:years,market:'US'})};
}

export async function officialReportList(security,years,mode,signal,{cn=cnReportList,hk=hkexDisclosures,us=secReports,archive=dataArchive}={}){
 const key=`official-directory:v4:${security.market}:${security.symbol}:${years}:${mode}`;
 try{
  let result;
  if(security.market==='US')result=await us(security,years,mode,signal);
  else if(security.market==='CN')result=await cn(security,years,mode,signal);
  else{
   // Independent published directories; a failed directory does not discard the
   // other. Keep identity-checked alternative report URLs for download failures.
   const reads=await Promise.allSettled([hk(security,{years,mode,signal}),cn(security,years,mode,signal)]);
   signal?.throwIfAborted();
   const primary=reads[0].status==='fulfilled'?reads[0].value:null,secondary=reads[1].status==='fulfilled'?reads[1].value:null;
   if(!primary&&!secondary)throw new Error(reads.map(item=>item.reason.message).join('；'));
   result={...(primary||secondary),warnings:reads.flatMap(item=>item.status==='rejected'?[item.reason.message]:item.value.warnings||[])};
   if(primary&&secondary){
    const periods=new Set(primary.reports.map(report=>`${report.annual}:${reportPeriod(report)}`).filter(key=>!key.endsWith(':null')));
    const extra=secondary.reports.filter(report=>!periods.has(`${report.annual}:${reportPeriod(report)}`));
    result.reports=selectReports([...mergeReportAlternatives(primary.reports,secondary.reports),...extra],years,mode);
    result.limited=primary.limited||secondary.limited;
   }
   result.periodCoverage=reportCoverage(result.reports,{years:mode==='A'?5:years,market:'HK'});
  }
  try{await archive?.put(key,{...result,directoryFetchedAt:now()});}catch{result.warnings.push('官方目录归档失败，后续断网时可能无法复用目录。');}
  return result;
 }catch(error){
  signal?.throwIfAborted();
  const previous=await archive?.get(key,{maxAgeMs:30*86400000}).catch(()=>null);
  signal?.throwIfAborted();
  if(!previous)throw error;
  return {...previous,limited:true,stale:true,warnings:[...(previous.warnings||[]),`官方目录刷新失败，使用 ${previous.directoryFetchedAt} 留存目录，可能缺少新披露：${error.message}`]};
 }
}
export async function collectMarketData(securities,{years=5,mode='B',signal,emit=()=>{},financials=fetchTushareFinancials,shareholder=fetchShareholderData,valuations=fetchValuationHistory,listReports=officialReportList,readReport=readOfficialReport,capitalReports=cnCapitalReports,quotes=fetchQuote,brokerFundamentals=fetchBrokerFundamentals}={}){
 const sources=[],snapshots=[],coverage=[],warnings=[],financialCoverage=[],shareholderCoverage=[],valuationCoverage=[],dataChecks=[];
 const add=s=>sources.push({...s,id:`S${sources.length+1}`});
 for(const security of securities){
  signal?.throwIfAborted();const label=`${security.market}:${security.symbol}`;
  emit('fetch',`${label} 获取最新行情`);
  try{const q=await quotes(security,signal);snapshots.push(q);if(q.warning)warnings.push(`${label} ${q.warning}`);if(q.cacheWarning)warnings.push(q.cacheWarning);add({title:`${q.name} ${q.stale?'缓存':'最新'}行情快照`,url:q.url,date:q.asOf,fetchedAt:q.fetchedAt,official:false,stale:q.stale===true,fromCache:q.fromCache===true,provider:q.provider,type:'quote',currency:q.currency,security:label,text:JSON.stringify(q,null,2)});emit('fetch',`${label} ${q.stale?'使用旧快照':'行情已获取'}：${q.asOf}`);}
  catch(e){signal?.throwIfAborted();warnings.push(`${label} 行情获取失败：${e.message}`);emit('fetch_error',warnings.at(-1));}
  emit('fetch',`${label} 查询官方财报（目标${years}年；初筛按需缩减）`);
  try{
   const list=await cachedRead(`reports:v4:${label}:${years}:${mode}`,shared=>listReports(security,years,mode,shared),{signal,ttlMs:60000,shouldCache:value=>!value.stale});
   if(list.warnings?.length)warnings.push(...list.warnings.map(warning=>`${label} ${warning}`));
   const outcome={security:label,name:list.name,listed:list.reports.length,read:0,fullTextRead:0,coreFactsRead:0,failed:[],limited:list.limited,stale:list.stale===true,periodCoverage:list.periodCoverage};
   const readURLs=new Set();
   if(security.market==='US'){
    for(const s of list.sources||[]){add(s);if(s.factsCount){outcome.coreFactsRead++;readURLs.add(s.filingUrl);}else outcome.failed.push(s.title+'：无匹配XBRL事实');}
   }
   for(const report of list.reports){
     signal?.throwIfAborted();emit('fetch',`${label} 下载并解析：${report.title}`);
     try{const parsed=await readReport(report,signal);add(parsed);readURLs.add(report.url);outcome.fullTextRead++;if(parsed.cacheWarning)warnings.push(parsed.cacheWarning);warnings.push(...parsingWarnings(parsed).map(warning=>`${report.title}：${warning}`));}
     catch(e){signal?.throwIfAborted();outcome.failed.push(`${report.title}：${e.message}`);emit('fetch_error',outcome.failed.at(-1));}
   }
   outcome.read=readURLs.size;
   const readable=sources.filter(source=>source.security===label&&source.type==='official-report');
   outcome.parsing={documents:readable.length,completeTextDocuments:readable.filter(source=>!source.truncated&&!source.emptyPages).length,
    needsReviewDocuments:readable.filter(source=>parsingWarnings(source).length||source.legacyParser).map(source=>source.id),ocrPages:readable.reduce((n,source)=>n+(source.qualitySummary?.ocrPages||0),0)};
   if(outcome.parsing.needsReviewDocuments.length)outcome.limited=true;
   outcome.readPeriodCoverage=reportCoverage(readable,{years:mode==='A'?5:years,market:security.market,expectedAnnualYears:list.periodCoverage?.expectedAnnualYears});
   if(list.periodCoverage?.missingAnnualYears.length)warnings.push(`${label} 官方报告目录缺少年份：${list.periodCoverage.missingAnnualYears.join('、')}`);
   if(outcome.readPeriodCoverage.missingAnnualYears.length)warnings.push(`${label} 年报正文未完整取得：${outcome.readPeriodCoverage.missingAnnualYears.join('、')}`);
   coverage.push(outcome);
   if(list.limited)warnings.push(`${label} 公告检索范围受限或部分请求失败，不能保证历史覆盖完整`);
   if(outcome.failed.length)warnings.push(...outcome.failed);
   add({title:`${list.name} 官方财报获取目录与覆盖范围`,url:list.listUrl||'https://www.cninfo.com.cn/new/index',date:dateCN(Date.now()),fetchedAt:list.directoryFetchedAt||now(),official:true,provider:security.market==='US'?'SEC EDGAR':security.market==='HK'?'港交所/巨潮资讯':'巨潮资讯',type:'filing-index',security:label,stale:list.stale===true,text:JSON.stringify({coverage:outcome,reports:list.reports,notice:'目录只证明找到披露，未解析成功的报告不可当作已读；即使全部读取，也不保证全部历史/附注覆盖。'},null,2)});
   emit('fetch',`${label} 财报完成：${outcome.read}/${outcome.listed}份读取成功`);
   if(mode!=='A'){
    try{
     emit('fetch',`${label} 补充股东回报公告与近期披露`);
     const events=security.market==='US'?{reports:list.adHocReports||[],limited:list.adHocLimited,warnings:[]}:security.market==='HK'?await hkexDisclosures(security,{years,mode,signal,events:true}):await capitalReports(security,years,signal);
     const chosen=selectCapitalReports(events.reports);let read=0;const failed=[];
     warnings.push(...(events.warnings||[]));
     for(const report of chosen.reports){
      signal?.throwIfAborted();
      if(sources.some(source=>source.security===label&&source.type==='official-report'&&source.url===report.url))continue;
      try{const parsed=await readReport({...report,purpose:'shareholder-action'},signal);add(parsed);read++;if(parsed.truncated)warnings.push(`${report.title}：正文提取达到上限`);}
      catch(error){signal?.throwIfAborted();failed.push(`${report.title}：${error.message}`);}
      if(security.market==='US'){
       try{
        const attachments=await secAttachments(report,{signal});if(attachments.limited)warnings.push(`${report.title}：附件超过本次读取上限`);
        for(const attachment of attachments.reports){try{add(await readReport(attachment,signal));read++;}catch(error){signal?.throwIfAborted();failed.push(`${attachment.title}：${error.message}`);}}
       }catch(error){signal?.throwIfAborted();failed.push(`${report.title} 附件目录：${error.message}`);}
      }
     }
     outcome.capitalDisclosures={found:chosen.totalFound,selected:chosen.reports.length,read,failed,limited:events.limited||chosen.limited,notice:security.market==='HK'?'翌日披露只查最近90天，月报及分红公告按历史窗口查询；原件按预算选取':'原件按预算选取，不代表全量公司行动历史'};
     if(outcome.capitalDisclosures.limited)warnings.push(`${label} 专项公告按预算选取，尚不代表所有分红、回购或注销事件已齐全`);
     warnings.push(...failed);emit('fetch',`${label} 资本配置及临时披露：新增${read}份原文`);
    }catch(error){signal?.throwIfAborted();warnings.push(`${label} 专项官方公告暂不可用：${error.message}`);}
   }
  }catch(e){signal?.throwIfAborted();coverage.push({security:label,listed:0,read:0,failed:[e.message]});warnings.push(`${label} 官方财报获取失败：${e.message}`);emit('fetch_error',warnings.at(-1));}
  let financialResult={},shareholderResult={},valuationResult={};
  try{
   // One extra period supplies opening equity for the first requested year's ROE.
   const extra=await financials(security,{years:years+1,signal});financialResult=extra;
   if(extra.configured){
    extra.sources.forEach(add);warnings.push(...extra.warnings);
    financialCoverage.push({security:label,provider:'Tushare Pro',tables:extra.coverage});
    emit(extra.sources.length?'fetch':'fetch_error',`${label} Tushare结构化财务数据：${extra.sources.length}/3张表；官方原文读取情况另行记录`);
    if(extra.sources.length)warnings.push(`${label} Tushare数据为数据商整理，币种、单位与财务口径需和官方原文核对`);
   }
  }catch(error){signal?.throwIfAborted();warnings.push(`${label} 补充财务数据暂不可用：${error.message}`);}
  try{
   shareholderResult=mode==='A'?{configured:false,sources:[],scope:'not-required-for-screen'}:await shareholder(security,{years,signal,emit});
   if(shareholderResult.configured){
    shareholderResult.sources.forEach(add);warnings.push(...shareholderResult.warnings);
    shareholderCoverage.push({security:label,provider:'Tushare Pro',supported:shareholderResult.supported,tables:shareholderResult.coverage});
    if(shareholderResult.supported)emit('fetch',`${label} 分红、回购与股本资料：${shareholderResult.sources.length}/3类；实施状态与历史缺口已保留`);
    else if(security.market==='CN')warnings.push(`${label} 专项历史数据未取得，须从已读取官方披露核对`);
   }
  }catch(error){signal?.throwIfAborted();warnings.push(`${label} 股东回报资料暂不可用：${error.message}`);}
  try{
   valuationResult=mode==='A'?{sources:[],scope:'not-required-for-screen'}:await valuations(security,{signal});
   valuationResult.sources?.forEach(add);warnings.push(...(valuationResult.warnings||[]));
   valuationCoverage.push({security:label,supported:valuationResult.supported,tables:valuationResult.coverage||[]});
   if(valuationResult.sources?.length)emit('fetch',`${label} 历史估值及三年/五年分位已取得，样本截止日独立保留`);
  }catch(error){signal?.throwIfAborted();warnings.push(`${label} 历史估值暂不可用：${error.message}`);}
  if(security.market!=='CN'&&mode!=='A'){
   try{
    const extra=await brokerFundamentals(security,{years,signal});
    extra.sources?.forEach(add);warnings.push(...(extra.warnings||[]));
    const shareholderTables=(extra.coverage||[]).filter(item=>item.api!=='longbridge_valuationHistory'),valuationTables=(extra.coverage||[]).filter(item=>item.api==='longbridge_valuationHistory');
    shareholderResult.brokerCoverage=shareholderTables;
    shareholderCoverage.push({security:label,provider:'长桥基本面 API',supported:extra.configured&&extra.supported,tables:shareholderTables});
    if(valuationTables.length){
     valuationResult={...valuationResult,supported:true,sources:extra.sources.filter(source=>source.type==='valuation-history'),coverage:valuationTables,windows:extra.windows};
     const index=valuationCoverage.findIndex(item=>item.security===label);if(index>=0)valuationCoverage[index]={security:label,provider:'长桥基本面 API',supported:true,tables:valuationTables};
    }
    if(extra.sources?.length)emit('fetch',`${label} 长桥历史估值及公司行动：${extra.sources.length}类资料，按实际覆盖保留缺口`);
    warnings.push(`${label} 专项回报历史仍须和官方原件逐事件核对；数据商可能只返回部分年度或将实物分派折算成金额，不能直接汇总为现金分红`);
   }catch(error){signal?.throwIfAborted();warnings.push(`${label} 长桥补充基本面暂不可用：${error.message}`);}
  }
  const evidence=sources.filter(source=>source.security===label);
  if(evidence.length){
   const checks=checkDataBasis(security,{years,mode,financials:financialResult,shareholder:shareholderResult,valuations:valuationResult,reportCoverage:coverage.find(item=>item.security===label),snapshot:snapshots.find(item=>item.market===security.market&&item.symbol===security.symbol),sources:evidence});
   checks.capitalEvidence=capitalEvidence(evidence);
   checks.documentParsing=evidence.filter(source=>source.type==='official-report').map(source=>({sourceId:source.id,parserVersion:source.parserVersion||'legacy',pages:source.pages,readPages:source.readPages,truncated:source.truncated,quality:source.qualitySummary,warnings:parsingWarnings(source),inlineXbrl:source.inlineXbrl?{accepted:source.inlineXbrl.acceptedFacts,rejected:source.inlineXbrl.rejectedFacts,omitted:source.inlineXbrl.omittedFacts}:undefined}));
   if(security.market==='US')checks.financialObservations=xbrlObservations(evidence);
   dataChecks.push({...checks,capitalEvidence:{status:checks.capitalEvidence.status,snippetCount:checks.capitalEvidence.snippets.length,notice:checks.capitalEvidence.notice},
    ...(checks.financialObservations?{financialObservations:{observationCount:checks.financialObservations.observations.length,errors:checks.financialObservations.errors,notice:checks.financialObservations.notice}}:{})});
   add({title:`${label} 数据覆盖与口径检查`,provider:'知衡数据检查',official:false,type:'data-check',security:label,date:dateCN(Date.now()),fetchedAt:now(),
    coverage:'年度缺口、分红状态、回购用途与股本口径；检查结果不能代替原始财报证据',text:JSON.stringify(checks,null,2)});
  }
 }
 return {sources,snapshots,coverage,financialCoverage,shareholderCoverage,valuationCoverage,dataChecks,warnings:[...new Set(warnings)],fetchedAt:now()};
}
