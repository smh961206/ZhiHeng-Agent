import {remote} from './market-request.mjs';
import {createMarketCache} from './market-cache.mjs';
import {parseTableRows} from './filing-text.mjs';
import {chooseReports,reportPeriod,reportCoverage} from './report-periods.mjs';

const base='https://www1.hkexnews.hk';
const periodic=/annual report|interim report|half.year report|quarterly report|annual results|quarter.*results|results.*quarter|three months|six months|nine months|年度报告|年度報告|年报|年報|中期|半年度|季度|全年业绩|全年業績/i;
export function parseHKEXCompany(text,security){
 const match=text.trim().match(/^callback\(([\s\S]*)\);?$/);
 if(!match)throw new Error('港交所公司目录格式变化');
 const data=JSON.parse(match[1]);if(!Array.isArray(data.stockInfo))throw new Error('港交所公司目录字段缺失');
 const matches=data.stockInfo.filter(item=>item.code===security.symbol&&/^\d+$/.test(String(item.stockId))&&typeof item.name==='string');
 if(matches.length!==1)throw new Error('港交所公司身份未唯一匹配');return matches[0];
}
export function parseHKEXReports(html,security){
 if(!/title-search-result|stock-short-code/.test(html))throw new Error('港交所检索页面格式变化或未返回目录');
 const records=[];let rowCount=0;
 for(const row of parseTableRows(html)){
  const code=row.cells.find(cell=>cell.className.includes('stock-short-code'));
  if(!code)continue;rowCount++;
  if(!(code.text.match(/\b\d{5}\b/g)||[]).includes(security.symbol))throw new Error('港交所公告证券代码不匹配');
  const dateText=row.cells.find(cell=>cell.className.includes('release-time'))?.text||'';
  const match=dateText.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if(!match)throw new Error('港交所公告日期缺失');
  const date=`${match[3]}-${match[2]}-${match[1]}`;
  if(new Date(date).toISOString().slice(0,10)!==date)throw new Error('港交所公告日期无效');
  for(const link of row.links){
   const url=new URL(link.href,base);
   if(url.origin!==base||!/^\/listedco\/listconews\/sehk\/\d{4}\/\d{4}\/[\w.-]+\.pdf$/i.test(url.pathname))continue;
   const title=link.text.replace(/\s+/g,' ').trim();
   records.push({title,url:url.href,date,annual:/annual report|年度报告|年度報告|年报|年報/i.test(title)&&!/interim|半年度/i.test(title),periodic:periodic.test(title),provider:'港交所披露易',official:true,security:`HK:${security.symbol}`});
  }
 }
 return {reports:records,rowCount,limited:rowCount>=100};
}
export function createHKEXDisclosures({request=remote,clock=Date.now,maxRequests=24}={}){
 const cache=createMarketCache({clock,maxEntries:64});
 return async(security,{years=5,mode='B',signal,events=false}={})=>{
  if(security.market!=='HK'||!/^\d{5}$/.test(security.symbol))throw new Error('港交所证券代码无效');
  const company=await cache(`company:${security.symbol}`,async shared=>parseHKEXCompany((await request(`${base}/search/prefix.do?${new URLSearchParams({lang:'EN',type:'A',name:security.symbol,market:'SEHK',callback:'callback'})}`,{signal:shared})).toString('utf8'),security),{signal,ttlMs:86400000});
  const today=new Date(clock()).toISOString().slice(0,10).replaceAll('-',''),start=`${Number(today.slice(0,4))-years}0101`;
  const reports=[],warnings=[],unresolvedRanges=[];let count=0;
  // Official headline categories: financial reports, quarterly results; optional
  // cash distributions and share-repurchase explanatory statements.
  const categories=events?[['10000','13250'],['10000','13251'],['20000','26300'],['51500','-2'],['50000','-2']]:[['40000','-2'],['10000','13600']];
  for(const [t1code,t2code] of categories){
   const eventStart=t1code==='50000'?new Date(clock()-90*86400000).toISOString().slice(0,10).replaceAll('-',''):start;
   const ranges=[[eventStart,today]];
   while(ranges.length){
    signal?.throwIfAborted();
    if(count>=maxRequests){unresolvedRanges.push(...ranges.map(([from,to])=>({from,to,t2code})));break;}
    const [from,to]=ranges.shift();count++;
    const params=new URLSearchParams({lang:'EN',category:'0',market:'SEHK',stockId:String(company.stockId),from,to,searchType:'1',t1code,t2Gcode:'-2',t2code,title:''});
    try{
     const result=parseHKEXReports((await request(`${base}/search/titlesearch.xhtml?${params}`,{signal,timeoutMs:15000,totalTimeoutMs:35000,retries:1})).toString('utf8'),security);
     reports.push(...result.reports);
     if(result.limited){
      if(from===to){unresolvedRanges.push({from,to,t2code});continue;}
      const iso=value=>`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
      const first=Date.parse(iso(from)),last=Date.parse(iso(to)),mid=first+Math.floor((last-first)/86400000/2)*86400000;
      const day=value=>new Date(value).toISOString().slice(0,10).replaceAll('-','');
      ranges.push([from,day(mid)],[day(mid+86400000),to]);
     }
    }catch(error){signal?.throwIfAborted();warnings.push(`港交所 ${from}—${to} 查询失败：${error.message}`);unresolvedRanges.push({from,to,t2code},...ranges.map(([from,to])=>({from,to,t2code})));break;}
   }
  }
  const candidates=[...new Map(reports.filter(report=>events||report.periodic).map(report=>[report.url,report])).values()];
  const selected=events?candidates.sort((a,b)=>b.date.localeCompare(a.date)):chooseReports(candidates,years,mode);
  if(!selected.length)throw new Error(warnings.join('；')||'港交所未找到对应报告');
  return {name:company.name,listUrl:`${base}/search/titlesearch.xhtml?lang=EN&stockId=${company.stockId}`,reports:selected,listedCount:candidates.length,limited:unresolvedRanges.length>0,warnings,unresolvedRanges,
   periodCoverage:reportCoverage(selected,{years:mode==='A'?5:years,market:'HK',clock})};
 };
}
export const hkexDisclosures=createHKEXDisclosures();

export function mergeReportAlternatives(primary,secondary){
 return primary.map(report=>{
  const period=reportPeriod(report);
  const alternatives=period?secondary.filter(other=>other.url!==report.url&&reportPeriod(other)===period&&other.annual===report.annual):[];
  return {...report,...(alternatives.length?{alternatives}: {})};
 });
}
