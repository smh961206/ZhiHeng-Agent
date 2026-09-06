import {createTushareClient,tushareClient} from './tushare-client.mjs';

const profiles={
 CN:[['income','利润表',33],['balancesheet','资产负债表',36],['cashflow','现金流量表',44]],
 HK:[['hk_income','利润表',389],['hk_balancesheet','资产负债表',390],['hk_cashflow','现金流量表',391]],
 US:[['us_income','利润表',394],['us_balancesheet','资产负债表',395],['us_cashflow','现金流量表',396]],
};
export function tushareSymbol(security){
 if(security.market==='CN'&&/^[036489]\d{5}$/.test(security.symbol))return `${security.symbol}.${security.symbol.startsWith('6')?'SH':/^[489]/.test(security.symbol)?'BJ':'SZ'}`;
 if(security.market==='HK'&&/^\d{5}$/.test(security.symbol))return `${security.symbol}.HK`;
 if(security.market==='US'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(security.symbol))return security.symbol;
 throw new Error('Tushare证券代码无效');
}
export const isoDate=value=>{
 if(typeof value!=='string'||!/^\d{8}$/.test(value))throw new Error('财务报告期格式无效');
 const date=`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
 if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('财务报告期日期无效');
 return date;
};
export function parseTushareTable(data,security){
 if(data?.code!==0)throw new Error(`Tushare返回错误（${data?.code??'无状态码'}）`);
 const {fields,items}=data.data??{};
 if(!Array.isArray(fields)||!fields.length||!Array.isArray(items)||fields.some(field=>typeof field!=='string')||new Set(fields).size!==fields.length||!fields.includes('ts_code')||!fields.includes('end_date'))throw new Error('Tushare财务数据格式变化');
 if(security.market!=='CN'&&!['ind_name','ind_value'].every(field=>fields.includes(field)))throw new Error('Tushare财务科目字段缺失');
 const symbol=tushareSymbol(security),equivalent=value=>String(value).replaceAll('-','.');
 const rows=items.map(item=>{
  if(!Array.isArray(item)||item.length!==fields.length)throw new Error('Tushare财务字段与数值数量不一致');
  const row=Object.fromEntries(fields.map((field,index)=>[field,item[index]]));
  if(equivalent(row.ts_code)!==equivalent(symbol))throw new Error('Tushare财务数据证券代码不匹配');
  isoDate(row.end_date);
  for(const key of ['ann_date','f_ann_date'])if(row[key])isoDate(row[key]);
  if(security.market!=='CN'&&(typeof row.ind_name!=='string'||!row.ind_name||row.ind_value!==null&&(typeof row.ind_value!=='number'||!Number.isFinite(row.ind_value))))throw new Error('Tushare财务科目或数值无效');
  return row;
 });
 return {fields,rows,limited:data.data.has_more===true||items.length>=10000};
}

export function createTushareFinancials({request,token,clock=Date.now,wait,client=createTushareClient({request,token,clock,wait})}={}){
 return async function fetchFinancials(security,{years=5,signal}={}){
  signal?.throwIfAborted();
  if(!client.configured())return {configured:false,sources:[],warnings:[],coverage:[],records:{}};
  const symbol=tushareSymbol(security);
  const today=new Date(clock()).toISOString().slice(0,10).replaceAll('-',''),start=`${Number(today.slice(0,4))-years}-0101`.replaceAll('-','');
  const sources=[],warnings=[],coverage=[],records={};
  for(const [api,title,doc] of profiles[security.market]){
   signal?.throwIfAborted();
   try{
    const response=await client(api,{ts_code:symbol,start_date:start,end_date:today},{signal,archiveScope:`financials:${symbol}:${years}`,validate:data=>parseTushareTable(data,security)});
    const table={...parseTushareTable(response.data,security),fetchedAt:response.fetchedAt};
    if(response.warning)warnings.push(response.warning);
    const rows=table.rows.filter(row=>row.end_date>=start&&row.end_date<=today&&(!row.ann_date||row.ann_date<=today)&&(!row.f_ann_date||row.f_ann_date<=today));
    if(!rows.length)throw new Error('该时间范围没有可用数据');
    if(!rows.some(row=>security.market==='CN'?Object.entries(row).some(([field,value])=>!['report_type','comp_type','end_type','update_flag'].includes(field)&&typeof value==='number'&&Number.isFinite(value)):row.ind_value!==null))throw new Error('返回财务数值均缺失');
    const periods=[...new Set(rows.map(row=>row.end_date))].sort();
    const notice='数据商整理的结构化财务数据，不是官方财报原文。原字段、空值、报告类型和修订标记均保留；不自动拼接TTM，不合并单季、累计或母公司与合并报表。接口未提供的币种、单位及披露日标为未知，使用金额或比率前须用官方原文核对；市场币种不能代替财报币种。';
    records[api]=rows;
    sources.push({title:`${symbol} ${title} · Tushare`,url:`https://tushare.pro/document/2?doc_id=${doc}`,provider:'Tushare Pro',official:false,type:'vendor-financials',api,security:`${security.market}:${security.symbol}`,
     date:isoDate(periods.at(-1)),dateBasis:'latest-report-period',fetchedAt:table.fetchedAt,currency:null,unit:null,limited:table.limited,stale:response.stale===true,fromCache:response.fromCache===true,
     coverage:`${rows.length}条原始记录，${periods.length}个报告期；币种和单位待官方原文核对`,
     text:`${notice}\n查询接口：${api}；证券：${symbol}；范围：${start}至${today}；日期筛选口径：${security.market==='CN'?'公告日，另按报告期筛选':'报告期'}\n${JSON.stringify({currency:null,unit:null,fields:table.fields,rows},null,2)}`,
    });
    coverage.push({api,rows:rows.length,periods:periods.length,limited:table.limited,stale:response.stale===true});
    if(table.limited)warnings.push(`${symbol} ${title}达到接口返回范围，历史覆盖可能不完整`);
   }catch(error){signal?.throwIfAborted();warnings.push(`${symbol} ${title}获取失败：${error.message}`);coverage.push({api,rows:0,error:error.message});}
  }
  return {configured:true,sources,warnings,coverage,records};
 };
}
export const fetchTushareFinancials=createTushareFinancials({client:tushareClient});
