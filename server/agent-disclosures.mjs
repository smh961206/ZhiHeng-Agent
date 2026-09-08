import {securityCatalog,remote} from './market-data.mjs';
import {readOfficialReport} from './official-reports.mjs';
const topics={sales:'产销',capital:'证券变动月报表',dividend:'利润分配',buyback:'回购',policy:'股东回报'};
export const disclosureProperties={security:{type:'string'},topic:{type:'string',enum:Object.keys(topics)},from:{type:'string'},to:{type:'string'},maxReports:{type:'integer',minimum:1,maximum:3}};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const cnDate=v=>new Date(v).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
// Only verified task symbols and fixed public topics leave the process. No
// private question, free-form model query or arbitrary URL is sent upstream.
export function createDisclosureReader({catalog=securityCatalog,request=remote,readReport=readOfficialReport,clock=Date.now,maxCalls=6}={}){
 return async(args,{job,records=[],signal}={})=>{
  const {security,topic,from,to,maxReports=2}=args;
  const symbol=/^CN:(\d{6})$/.exec(security??'')?.[1];
  if(!symbol||!job.input.securities?.some(s=>s.market==='CN'&&s.symbol===symbol))throw new Error('专项官方公告只支持本次已确认的A股标的；其他市场请使用已有资料和公开补证工具');
  if(!Object.hasOwn(topics,topic)||!date(from)||!date(to)||from>to||to>cnDate(clock())||!Number.isInteger(maxReports)||maxReports<1||maxReports>3)throw new Error('公告主题、起止日期或份数无效；截止日不能晚于今天，每次最多3份');
  if(records.filter(r=>r.toolName==='read_official_disclosures').length>=maxCalls)throw new Error('专项公告补读预算已用完；保留未解决的覆盖缺口');
  signal?.throwIfAborted();
  const companies=(await catalog('CN',signal)).filter(s=>s.code===symbol);
  if(companies.length!==1||!companies[0].orgId)throw new Error('官方目录无法唯一确认证券身份');
  const body=new URLSearchParams({pageNum:'1',pageSize:'30',column:symbol.startsWith('6')?'sse':/^[489]/.test(symbol)?'bse':'szse',tabName:'fulltext',stock:`${symbol},${companies[0].orgId}`,seDate:`${from}~${to}`,searchkey:topics[topic],category:'',sortName:'time',sortType:'desc',isHLtitle:'false'});
  const bytes=await request('https://www.cninfo.com.cn/new/hisAnnouncement/query',{signal,method:'POST',body:body.toString()});
  const response=JSON.parse(bytes.toString('utf8'));
  const directoryFetchedAt=new Date(clock()).toISOString();
  if(!response||!Array.isArray(response.announcements)&&response.totalAnnouncement!==0&&response.totalAnnouncement!=='0')throw new Error('官方公告目录返回格式无效，不将请求失败视为没有公告');
  const found=new Map();
  for(const item of response.announcements??[]){
   if(!item||item.secCode!==symbol||typeof item.adjunctUrl!=='string'||!Number.isFinite(new Date(Number(item.announcementTime)).getTime()))continue;
   let url;try{url=new URL(item.adjunctUrl,'https://static.cninfo.com.cn/').href;}catch{continue;}
   const day=cnDate(Number(item.announcementTime));
   if(!/^https:\/\/static\.cninfo\.com\.cn\/finalpage\/[\w/.-]+\.pdf$/i.test(url)||day<from||day>to)continue;
   found.set(url,{title:String(item.announcementTitle??'').replace(/<[^>]*>/g,'').trim(),url,date:day,security,official:true,provider:'巨潮资讯官方披露平台',purpose:'targeted-disclosure'});
  }
  const ordered=[...found.values()].sort((a,b)=>b.date.localeCompare(a.date)),selected=ordered.slice(0,maxReports),read=[],failures=[];
  for(const report of selected){
   signal?.throwIfAborted();
   const existing=job.input.sources.find(s=>s.url===report.url&&s.security===security&&s.type==='official-report'&&s.text?.trim());
   if(existing){read.push({sourceId:existing.id,title:existing.title,url:existing.url,reused:true,fetchedAt:existing.fetchedAt,stale:!!existing.stale});continue;}
   try{
    const parsed=await readReport(report,signal);signal?.throwIfAborted();
    if(parsed.type!=='official-report'||!parsed.text?.trim()||parsed.url!==report.url||parsed.security!==security)throw new Error('公告正文缺失或来源身份不匹配');
    const ids=new Set(job.input.sources.map(s=>s.id));let index=1;while(ids.has('S'+index))index++;
    const source={...parsed,id:'S'+index,disclosureTopic:topic};job.input.sources.push(source);
    read.push({sourceId:source.id,title:source.title,url:source.url,publishedAt:report.date,fetchedAt:source.fetchedAt,sha256:source.sha256,pages:source.pages,truncated:!!source.truncated,stale:!!source.stale,reused:!!source.fromCache});
   }catch(error){signal?.throwIfAborted();failures.push({title:report.title,url:report.url,error:error.message});}
  }
  const limited=response.hasMore===true||response.hasMore==='true'||ordered.length>maxReports;
  return {status:failures.length?(read.length?'partial':'failed'):read.length?'located':'not-found',security,topic,query:topics[topic],from,to,directoryFetchedAt,listed:ordered.length,selected:selected.length,limited,read,sourceIds:read.map(r=>r.sourceId),failures,
   notice:'只查询指定主题的首30条目录并按预算读取；不保证公告齐全。找到和程序读取不等于事实已核实。请用search_evidence或read_source_pages读取新来源，再核对日期、单位、实施状态；无结果不代表没有该类事项。'};
 };
}
