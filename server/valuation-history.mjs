import {tushareClient} from './tushare-client.mjs';
import {isoDate,tushareSymbol} from './tushare-financials.mjs';

const metrics=['pe','pe_ttm','pb','ps','ps_ttm','dv_ratio','dv_ttm'];
const fields=['ts_code','trade_date','close',...metrics,'total_mv'];
const day=value=>new Date(value).toISOString().slice(0,10).replaceAll('-','');
const positive=(value,key)=>typeof value==='number'&&Number.isFinite(value)&&(key.startsWith('dv_')?value>=0:value>0);
export function parseValuationHistory(data,security,{start,end,filterWindow=false}){
 const table=data?.data;
 if(data?.code!==0||!Array.isArray(table?.fields)||!Array.isArray(table.items)||new Set(table.fields).size!==table.fields.length||!fields.every(key=>table.fields.includes(key)))throw new Error('历史估值字段缺失或格式变化');
 const dates=new Map();
 for(const item of table.items){
  if(!Array.isArray(item)||item.length!==table.fields.length)throw new Error('历史估值字段数量不一致');
  const row=Object.fromEntries(table.fields.map((key,i)=>[key,item[i]]));
  if(row.ts_code!==tushareSymbol(security))throw new Error('历史估值证券不匹配');
  isoDate(row.trade_date);
  if(row.trade_date<start||row.trade_date>end){if(filterWindow)continue;throw new Error('历史估值日期超出查询范围');}
  for(const key of ['close',...metrics,'total_mv'])if(row[key]!==null&&(typeof row[key]!=='number'||!Number.isFinite(row[key])))throw new Error('历史估值包含无效数值');
  if(dates.has(row.trade_date)&&JSON.stringify(dates.get(row.trade_date))!==JSON.stringify(row))throw new Error('同一交易日存在冲突估值');
  dates.set(row.trade_date,row);
 }
 return [...dates.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date));
}
export function valuationPercentiles(rows){
 const latest=rows.at(-1);if(!latest)return [];
 return [3,5].map(years=>{
  const from=new Date(isoDate(latest.trade_date));from.setUTCFullYear(from.getUTCFullYear()-years);
  const start=day(from),sample=rows.filter(row=>row.trade_date>=start);
  return {years,requestedStart:isoDate(start),asOf:isoDate(latest.trade_date),observedStart:sample[0]?isoDate(sample[0].trade_date):null,observations:sample.length,
   shortHistory:!sample.length||Date.parse(isoDate(sample[0].trade_date))-from.getTime()>10*86400000,
   metrics:Object.fromEntries(metrics.map(key=>{
    const values=sample.map(row=>row[key]).filter(value=>positive(value,key)),current=positive(latest[key],key)?latest[key]:null;
    return [key,{value:current,percentile:current===null||!values.length?null:100*values.filter(value=>value<=current).length/values.length,validObservations:values.length,excludedObservations:sample.length-values.length}];
   })),method:'经验分位=有效样本中小于等于该日数值的数量÷有效样本数×100；包含该日；空值和无效比率排除，不补零，不代表未来收益',
   notice:'数据商历史口径，未逐点复核修订/当时可得性，未使用交易日历证明完整；短历史不可称为完整三年/五年分位'};
 });
}
export function createValuationHistory({client=tushareClient,clock=Date.now}={}){
 return async(security,{signal}={})=>{
  signal?.throwIfAborted();
  const result={configured:client.configured(),supported:security.market==='CN',sources:[],coverage:[],warnings:[],records:[],windows:[]};
  if(!result.configured||!result.supported)return result;
  const today=new Date(clock()),from=new Date(today);from.setUTCFullYear(from.getUTCFullYear()-5);from.setUTCDate(from.getUTCDate()-14);
  const start=day(from),end=day(today);
  try{
   const response=await client('daily_basic',{ts_code:tushareSymbol(security),start_date:start,end_date:end},{fields:fields.join(','),signal,archiveScope:`valuation:${tushareSymbol(security)}:5y`,validate:data=>parseValuationHistory(data,security,{start,end})});
   const rows=parseValuationHistory(response.data,security,{start,end,filterWindow:response.stale===true});
   if(!rows.length)throw new Error('历史估值没有可用记录');
   result.records=rows;result.windows=valuationPercentiles(rows);
   const limited=response.data.data.has_more===true||response.data.data.items.length>=6000;
   const stale=response.stale===true||Date.parse(isoDate(end))-Date.parse(isoDate(rows.at(-1).trade_date))>7*86400000;
   result.coverage.push({api:'daily_basic',rows:rows.length,firstDate:rows[0].trade_date,lastDate:rows.at(-1).trade_date,limited,stale,windows:result.windows});
   if(limited)result.warnings.push('历史估值达到返回上限，分位样本可能不完整');
   if(stale)result.warnings.push('历史估值使用旧数据，不能表述为当前估值分位');
   if(response.warning)result.warnings.push(response.warning);
   result.sources.push({title:`${tushareSymbol(security)} 历史估值与三年/五年分位`,security:`CN:${security.symbol}`,type:'valuation-history',api:'daily_basic_valuation',official:false,provider:'Tushare Pro',url:'https://tushare.pro/document/2?doc_id=32',date:isoDate(rows.at(-1).trade_date),dateBasis:'last-observation',fetchedAt:response.fetchedAt,stale,limited,
    coverage:'历史比率由数据商提供；分位为本地确定性计算，引用时保留原始字段、样本和截止日期',
    text:`单位：PE/PB/PS为倍数，dv_ratio/dv_ttm为百分数；total_mv为万元，close为行情每股价格。币种及权益基数须与官方报告核对。pe与pe_ttm、ps与ps_ttm不可互换；数据商股息率不等于已核验的可持续普通股息率。\n分位结果：\n${JSON.stringify(result.windows,null,2)}\n原始历史观察值：\n${JSON.stringify(rows)}`});
  }catch(error){signal?.throwIfAborted();result.warnings.push(`历史估值获取失败：${error.message}`);result.coverage.push({api:'daily_basic',rows:0,status:'failed',error:error.message});}
  return result;
 };
}
export const fetchValuationHistory=createValuationHistory();
