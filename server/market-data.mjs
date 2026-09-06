import {getStorage} from './storage.mjs';
import {createHash} from 'node:crypto';
import {extractPDF} from './pdf-extractor.mjs';
import {setTimeout as pause} from 'node:timers/promises';

const allowedHosts=new Set(['push2.eastmoney.com','query1.finance.yahoo.com','qt.gtimg.cn','www.cninfo.com.cn','static.cninfo.com.cn','efts.sec.gov','data.sec.gov']);
let secQueue=Promise.resolve();
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
export async function remote(url,{signal,method='GET',body,maxBytes=12_000_000}={}){
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||!allowedHosts.has(parsed.hostname)||parsed.username||parsed.password)throw new Error('数据源地址不在允许列表');
 signal?.throwIfAborted();
 if(parsed.hostname.endsWith('sec.gov')){
  const slot=secQueue.then(()=>pause(350));secQueue=slot.catch(()=>{});await slot;signal?.throwIfAborted();
 }
 const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(45000)]):AbortSignal.timeout(45000);
 const headers={'User-Agent':parsed.hostname.endsWith('sec.gov')?(process.env.SEC_USER_AGENT||'ValueResearchAgent/1.0 local-research'):'ValueResearchAgent/1.0','Accept':'application/json, application/pdf, */*'};
 if(body)headers['Content-Type']='application/x-www-form-urlencoded';
 const res=await fetch(url,{signal:deadline,method,body,headers,redirect:'error'});
 if(!res.ok)throw new Error(`${parsed.hostname} HTTP ${res.status}${[403,429].includes(res.status)?'：来源拒绝访问或限流；不会绕过限制':''}`);
 if(Number(res.headers.get('content-length'))>maxBytes){await res.body?.cancel();throw new Error('数据文件超过大小上限');}
 const chunks=[];let size=0;
 for await(const chunk of res.body){size+=chunk.length;if(size>maxBytes)throw new Error('数据文件超过大小上限');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
const json=async(url,options)=>JSON.parse((await remote(url,options)).toString('utf8'));
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
export function parseTencent(text,security){
 const match=text.match(/^v_us[^=]+="([^"]+)";/);
 if(!match)throw new Error('备用美股行情格式无效');
 const parts=match[1].split('~');
 const code=parts[2]?.replace(/\.(OQ|N|A)$/,'').replaceAll('.','-');
 if(code!==security.symbol.replaceAll('.','-'))throw new Error('备用美股行情证券代码不匹配');
 const num=s=>s!==''&&Number.isFinite(Number(s))?Number(s):null;
 const price=num(parts[3]);
 if(!(price>0)||parts[35]!=='USD')throw new Error('备用美股行情价格或币种校验失败');
 return {market:'US',symbol:security.symbol,name:parts[46]||parts[1],currency:'USD',price,previousClose:num(parts[4]),changePercent:num(parts[32]),asOf:newYorkTime(parts[30]),fetchedAt:now(),provider:'腾讯财经公开行情（备用源）',official:false,url:`https://qt.gtimg.cn/q=us${encodeURIComponent(security.symbol)}`,notice:'美国东部交易时间按America/New_York转换，处理夏令时。公开行情可能延迟，非交易所直连。'};
}
let yahooBlockedUntil=0;
export async function fetchQuote(security,signal){
 let quote;
 if(security.market==='US'){
  let primaryError='Yahoo近期拒绝访问，冷却15分钟';
  if(Date.now()>=yahooBlockedUntil){
   try{quote=parseYahoo(await json(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(security.symbol.replaceAll('.','-'))}?interval=1d&range=1d`,{signal}),security);}
   catch(e){signal?.throwIfAborted();primaryError=e.message;if(/HTTP (403|429)/.test(e.message))yahooBlockedUntil=Date.now()+15*60000;}
  }
  if(!quote){const raw=await remote(`https://qt.gtimg.cn/q=us${encodeURIComponent(security.symbol)}`,{signal});quote={...parseTencent(new TextDecoder('gb18030').decode(raw),security),fallbackReason:primaryError};}
 }
 else{
  const secid=`${security.market==='HK'?'116':security.symbol.startsWith('6')?'1':'0'}.${security.symbol}`;
  quote=parseEastmoney(await json(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f57,f58,f59,f60,f86,f116,f167,f170`,{signal}),security);
 }
 return {...quote,freshness:freshness(quote)};
}
let catalogs=new Map();
export async function securityCatalog(market,signal){
 const key=market==='HK'?'hke':'szse';let cached=catalogs.get(key);
 if(!cached||Date.now()-cached.time>86400000){const data=await json(`https://www.cninfo.com.cn/new/data/${key}_stock.json`,{signal});if(!Array.isArray(data.stockList))throw new Error('官方代码目录格式变化');cached={time:Date.now(),list:data.stockList};catalogs.set(key,cached);}
 return cached.list;
}
async function cnCompany(security,signal){
 const company=(await securityCatalog(security.market,signal)).find(s=>s.code===security.symbol);
 if(!company)throw new Error('巨潮资讯官方目录未找到该证券；不猜测公司身份');
 return company;
}
export function selectReports(reports,years,mode){
 const sorted=[...new Map(reports.map(r=>[r.url,r])).values()].sort((a,b)=>b.date.localeCompare(a.date));
 const annual=sorted.filter(r=>r.annual);const chosen=[];const seenYears=new Set();
 for(const r of annual){const year=r.title.match(/20\d{2}/)?.[0]||r.date.slice(0,4);if(!seenYears.has(year)){chosen.push(r);seenYears.add(year);}if(chosen.length>=(mode==='A'?1:years))break;}
 // Preserve the newest disclosure even if it is an amended filing.
 return [...new Map([...sorted.slice(0,mode==='A'?2:4),...chosen].map(r=>[r.url,r])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export async function cnReportList(security,years,mode,signal){
 const company=await cnCompany(security,signal);
 const today=dateCN(Date.now());const from=`${Number(today.slice(0,4))-years-1}-01-01`;
 const column=security.market==='HK'?'hke':security.symbol.startsWith('6')?'sse':/^[489]/.test(security.symbol)?'bse':'szse';
 const queries=security.market==='HK'?['年报','年報','报告','報告','业绩','業績']:[''];
 const reports=[];let limited=false;
 for(const searchkey of queries){
  const maxPages=security.market==='HK'?3:6;
  for(let pageNum=1;pageNum<=maxPages;pageNum++){
  signal?.throwIfAborted();
  const payload=new URLSearchParams({pageNum:String(pageNum),pageSize:'30',column,tabName:'fulltext',stock:`${company.code},${company.orgId}`,seDate:`${from}~${today}`,searchkey,category:security.market==='CN'?'category_ndbg_szsh;category_bndbg_szsh;category_yjdbg_szsh;category_sjdbg_szsh':'',sortName:'time',sortType:'desc',isHLtitle:'false'});
  const data=await json('https://www.cninfo.com.cn/new/hisAnnouncement/query',{signal,method:'POST',body:payload.toString()});
  if(!Array.isArray(data.announcements)&&Number(data.totalAnnouncement)!==0)throw new Error('官方公告列表格式变化');
  const hasMore=data.hasMore===true||data.hasMore==='true';
  if(hasMore&&pageNum===maxPages)limited=true;
  for(const a of data.announcements??[]){
   const title=clean(a.announcementTitle);
   if(a.secCode!==security.symbol||/摘要|英文|English|环境|環境|社会|社會|管治|可持续|可持續|通知|董事会|董事會|会议|會議|预告|預告|提示|说明会|說明會|通告/i.test(title))continue;
   if(!/年度报告|年度報告|年报|年報|半年度|中期|季度|全年业绩|全年業績|annual report|interim report/i.test(title))continue;
   const url=new URL(a.adjunctUrl,'https://static.cninfo.com.cn/').href;
   if(!/^https:\/\/static\.cninfo\.com\.cn\/finalpage\/[\w/.-]+\.pdf$/i.test(url))continue;
   reports.push({title,url,date:dateCN(a.announcementTime),annual:/年度报告|年度報告|年报|年報|annual report/i.test(title)&&!/半年度/.test(title),provider:'巨潮资讯官方披露平台',official:true,security:`${security.market}:${security.symbol}`});
  }
  if(!hasMore||!data.announcements?.length)break;
  }
 }
 const selected=selectReports(reports,years,mode);
 if(!selected.length)throw new Error('官方披露检索未找到可读取的定期报告');
 return {name:company.zwjc,reports:selected,listedCount:new Set(reports.map(r=>r.url)).size,limited};
}
export async function pdfReport(report,signal){
 const key=createHash('sha256').update(report.url).digest('hex');const storage=await getStorage();
 const cached=await storage.getCachedReport(key);if(cached?.url===report.url)return {...report,...cached,fromCache:true};
 const bytes=await remote(report.url,{signal,maxBytes:32_000_000});
 if(!bytes.subarray(0,1024).toString('latin1').includes('%PDF-'))throw new Error('官方链接返回的不是PDF文件');
 const parsed=await extractPDF(bytes,signal);
 if(parsed.text.trim().length<200)throw new Error('PDF无可提取文字（可能为扫描件），未执行OCR');
 const source={...report,...parsed,type:'official-report',fetchedAt:now(),sha256:createHash('sha256').update(bytes).digest('hex'),fromCache:false};
 await storage.saveCachedReport(key,source);
 return source;
}
export async function secCompany(security,signal){
 const data=await json(`https://efts.sec.gov/LATEST/search-index?keysTyped=${encodeURIComponent(security.symbol)}&narrow=true`,{signal});
 const equivalent=s=>s.toUpperCase().replaceAll('.','-');
 const matches=(data.hits?.hits??[]).filter(h=>String(h._source?.tickers??'').split(/[,;\s]+/).some(t=>equivalent(t)===equivalent(security.symbol)));
 if(matches.length!==1||!/^\d{1,10}$/.test(matches[0]._id))throw new Error('SEC代码未唯一匹配公司，无法自动确认CIK');
 const cik=matches[0]._id.padStart(10,'0');const url=`https://data.sec.gov/submissions/CIK${cik}.json`;
 const submissions=await json(url,{signal});
 if(!submissions.tickers?.some(t=>equivalent(t)===equivalent(security.symbol)))throw new Error('SEC公司披露中的股票代码不匹配');
 return {cik,submissions,url};
}
const metricPattern=/^(Revenue|SalesRevenue|NetIncomeLoss|ProfitLoss|OperatingIncomeLoss|GrossProfit|Assets$|Liabilities$|StockholdersEquity|CashAndCashEquivalentsAtCarryingValue|NetCashProvidedByUsedInOperatingActivities|PaymentsToAcquirePropertyPlantAndEquipment|EarningsPerShare|CommonStockSharesOutstanding|EntityCommonStockSharesOutstanding|CommonStockDividendsPerShare|PaymentsOfDividends|PaymentsForRepurchaseOfCommonStock|LongTermDebt|ShortTermBorrowings|AccountsReceivableNetCurrent|InventoryNet|Goodwill$)|Revenue|ProfitLoss|Equity$|CashFlowsFromUsedInOperatingActivities/;
export function secFactsSources(data,filings,security,sourceUrl){
 const sources=[];
 for(const filing of filings){
  const rows=[];
  for(const [taxonomy,metrics] of Object.entries(data.facts??{}))for(const [tag,metric] of Object.entries(metrics)){
   if(!metricPattern.test(tag))continue;
   for(const [unit,values] of Object.entries(metric.units??{}))for(const v of values){
    if(v.accn!==filing.accession||typeof v.val!=='number')continue;
    rows.push({tag:`${taxonomy}:${tag}`,label:metric.label,unit,value:v.val,start:v.start??null,end:v.end,filed:v.filed,form:v.form,fy:v.fy,fp:v.fp,frame:v.frame??null});
   }
  }
  const dedup=[...new Map(rows.map(r=>[JSON.stringify(r),r])).values()];
  sources.push({title:`${security.symbol} ${filing.form} · ${filing.reportDate||filing.date}`,url:sourceUrl,filingUrl:filing.url,date:filing.date,fetchedAt:now(),official:true,provider:'SEC EDGAR 官方 XBRL',type:'official-xbrl',security:`US:${security.symbol}`,coverage:dedup.length?'指定核心财务标签；非完整财报正文':'官方已披露，但所选XBRL标签无匹配事实',text:`公司：${data.entityName}；CIK：${data.cik}\n申报表单：${filing.form}；报告期：${filing.reportDate}；披露日：${filing.date}；Accession：${filing.accession}\n官方原件：${filing.url}\n下列是该次申报的官方XBRL核心财务事实。保留原始单位、期间、比较期和标签，不自动相加或拼接TTM。不是完整财报正文，不含管理层讨论及所有附注。空列表代表数据不足（不等于零）。\n${JSON.stringify(dedup,null,2)}`,factsCount:dedup.length});
 }
 return sources;
}
export async function secReports(security,years,mode,signal){
 const {cik,submissions,url}=await secCompany(security,signal);
 let recent=submissions.filings?.recent;
 if(!recent||!Array.isArray(recent.form))throw new Error('SEC披露目录格式无效');
 const cutoff=`${new Date().getUTCFullYear()-years-1}-01-01`;
 // One older official submissions file, when the recent window is insufficient.
 let limited=false;
 if((recent.filingDate.at(-1)??'')>cutoff){
  const older=(submissions.filings.files??[]).filter(f=>f.filingTo>=cutoff).slice(0,2);
  for(const f of older){if(!/^CIK\d+-submissions-\d+\.json$/.test(f.name))continue;const more=await json(`https://data.sec.gov/submissions/${f.name}`,{signal});recent=Object.fromEntries(Object.entries(recent).map(([k,v])=>[k,Array.isArray(v)?[...v,...(more[k]??[])]:v]));}
  limited=(recent.filingDate.at(-1)??'')>cutoff;
 }
 const filings=[];
 for(let i=0;i<recent.form.length;i++){
  const form=recent.form[i];if(!/^(10-K|10-Q|20-F|40-F)(\/A)?$/.test(form)||recent.filingDate[i]<cutoff)continue;
  const accession=recent.accessionNumber[i];if(!/^\d{10}-\d{2}-\d{6}$/.test(accession))continue;
  const doc=recent.primaryDocument[i];
  filings.push({title:`${recent.reportDate[i]} ${form}`,form,accession,reportDate:recent.reportDate[i],date:recent.filingDate[i],annual:/^(10-K|20-F|40-F)/.test(form),url:`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll('-','')}/${encodeURIComponent(doc)}`});
 }
 const selected=selectReports(filings,years,mode);
 if(!selected.length)throw new Error('SEC未找到受支持的10-K/10-Q/20-F/40-F财报');
 const factUrl=`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
 const facts=await json(factUrl,{signal,maxBytes:35_000_000});
 if(Number(facts.cik)!==Number(cik))throw new Error('SEC财务数据CIK不匹配');
 return {name:submissions.name,listUrl:url,reports:selected,sources:secFactsSources(facts,selected,security,factUrl),limited};
}
export async function collectMarketData(securities,{years=5,mode='B',signal,emit=()=>{}}={}){
 const sources=[],snapshots=[],coverage=[],warnings=[];
 const add=s=>sources.push({...s,id:`S${sources.length+1}`});
 for(const security of securities){
  signal?.throwIfAborted();const label=`${security.market}:${security.symbol}`;
  emit('fetch',`${label} 获取最新行情`);
  try{const q=await fetchQuote(security,signal);snapshots.push(q);add({title:`${q.name} 最新行情快照`,url:q.url,date:q.asOf,fetchedAt:q.fetchedAt,official:false,provider:q.provider,type:'quote',security:label,text:JSON.stringify(q,null,2)});emit('fetch',`${label} 行情已获取：${q.asOf}`);}
  catch(e){signal?.throwIfAborted();warnings.push(`${label} 行情获取失败：${e.message}`);emit('fetch_error',warnings.at(-1));}
  emit('fetch',`${label} 查询官方财报（目标${years}年；初筛按需缩减）`);
  try{
   const list=security.market==='US'?await secReports(security,years,mode,signal):await cnReportList(security,years,mode,signal);
   const outcome={security:label,name:list.name,listed:list.reports.length,read:0,failed:[],limited:list.limited};
   if(security.market==='US'){
    for(const s of list.sources){add(s);if(s.factsCount)outcome.read++;else outcome.failed.push(s.title+'：无匹配XBRL事实');}
    warnings.push(`${label} 使用SEC官方XBRL核心财务标签，非完整财报正文；6-K等临时/中期披露及未映射标签不在当前自动采集范围`);
   }else{
    for(const report of list.reports){
     signal?.throwIfAborted();emit('fetch',`${label} 下载并解析：${report.title}`);
     try{const parsed=await pdfReport(report,signal);add(parsed);outcome.read++;if(parsed.truncated)warnings.push(`${report.title}：解析达到上限，正文不完整`);if(parsed.emptyPages>0)warnings.push(`${report.title}：${parsed.emptyPages}页未提取到文字（未OCR）`);}
     catch(e){signal?.throwIfAborted();outcome.failed.push(`${report.title}：${e.message}`);emit('fetch_error',outcome.failed.at(-1));}
    }
   }
   coverage.push(outcome);
   if(list.limited)warnings.push(`${label} 公告检索达到分页范围，不能保证历史覆盖完整`);
   if(outcome.failed.length)warnings.push(...outcome.failed);
   add({title:`${list.name} 官方财报获取目录与覆盖范围`,url:list.listUrl||'https://www.cninfo.com.cn/new/index',date:dateCN(Date.now()),fetchedAt:now(),official:true,provider:security.market==='US'?'SEC EDGAR':'巨潮资讯',type:'filing-index',security:label,text:JSON.stringify({coverage:outcome,reports:list.reports,notice:'目录只证明找到披露，未解析成功的报告不可当作已读；即使全部读取，也不保证全部历史/附注覆盖。'},null,2)});
   emit('fetch',`${label} 财报完成：${outcome.read}/${outcome.listed}份读取成功`);
  }catch(e){signal?.throwIfAborted();coverage.push({security:label,listed:0,read:0,failed:[e.message]});warnings.push(`${label} 官方财报获取失败：${e.message}`);emit('fetch_error',warnings.at(-1));}
 }
 return {sources,snapshots,coverage,warnings,fetchedAt:now()};
}
