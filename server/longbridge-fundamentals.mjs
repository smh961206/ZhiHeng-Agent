import {createHash} from 'node:crypto';
import {createLongbridgeFetcher,longbridgeSymbol} from './longbridge-quotes.mjs';
import {providerStatus,providerConfig} from './data-provider-config.mjs';
import {createMarketCache} from './market-cache.mjs';
import {dataArchive} from './data-archive.mjs';

const numeric=value=>typeof value==='string'&&/^-?\d+(?:\.\d+)?$/.test(value.trim())&&Number.isFinite(Number(value))?Number(value):null;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export const fetchLongbridgeFundamental=createLongbridgeFetcher({workerUrl:new URL('./longbridge-fundamental-worker.mjs',import.meta.url),timeoutMs:30000,parseValue:(value,security,options)=>{
 if(value.symbol!==longbridgeSymbol(security)||value.method!==options.method||!value.data||typeof value.data!=='object')throw new Error('长桥基本面响应与请求不匹配');return value;
}});
export function brokerValuationWindows(data){
 const metrics=data?.history?.metrics;if(!metrics||typeof metrics!=='object')throw new Error('长桥历史估值格式变化');
 const normalized={};
 for(const key of ['pe','pb','ps']){
  const list=metrics[key]?.list;if(!list)continue;if(!Array.isArray(list))throw new Error('历史估值列表格式变化');
  const dates=new Map();
  for(const point of list){
   if(!Number.isSafeInteger(point.timestamp)||point.timestamp<946684800)throw new Error('历史估值时间戳无效');
   const value=numeric(point.value);
   if(dates.has(point.timestamp)&&dates.get(point.timestamp)!==value)throw new Error('历史估值时间点冲突');dates.set(point.timestamp,value);
  }
  normalized[key]=[...dates.entries()].sort((a,b)=>a[0]-b[0]).map(([timestamp,value])=>({timestamp,value}));
 }
 if(!Object.values(normalized).some(list=>list.length))throw new Error('长桥未返回历史估值观察值');
 return [3,5].map(years=>({years,missingMetrics:['pe','pb','ps'].filter(key=>!normalized[key]?.length),metrics:Object.fromEntries(Object.entries(normalized).map(([key,list])=>{
  const latest=list.at(-1);if(!latest)return [key,{value:null,percentile:null,validObservations:0,shortHistory:true}];
  const start=new Date(latest.timestamp*1000);start.setUTCFullYear(start.getUTCFullYear()-years);
  const sample=list.filter(point=>point.timestamp*1000>=start.getTime()),values=sample.map(point=>point.value).filter(value=>value!==null&&value>0),current=latest.value!==null&&latest.value>0?latest.value:null;
  const gaps=list.slice(1).map((point,i)=>(point.timestamp-list[i].timestamp)/86400).sort((a,b)=>a-b),spacing=gaps[Math.floor(gaps.length/2)]||1;
  return [key,{value:current,percentile:current===null||!values.length?null:100*values.filter(value=>value<=current).length/values.length,validObservations:values.length,excludedObservations:sample.length-values.length,
   asOf:new Date(latest.timestamp*1000).toISOString(),firstObservation:sample.length?new Date(sample[0].timestamp*1000).toISOString():null,medianSpacingDays:spacing,shortHistory:!sample.length||(sample[0].timestamp*1000-start.getTime())/86400000>spacing*1.5+3}];
 })),method:'来源采样点中的经验分位（小于等于该值的有效样本占比），独立保留来源时间戳；不与A股每日样本静默比较',
 notice:'PE的FY/TTM盈利口径未由接口明确，须核实后再用于估值与跨公司比较；以实际返回范围为准，缺少PB/PS或五年历史时不补造'}));
}
export function validateBrokerFundamental(method,data,security){
 const symbol=longbridgeSymbol(security);
 if(method==='valuationHistory'){brokerValuationWindows(data);return;}
 if(method==='dividendDetail'){
  if(!Array.isArray(data.list))throw new Error('长桥分红列表格式变化');
  for(const row of data.list){
   if(row.symbol&&row.symbol!==symbol)throw new Error('分红证券不匹配');if(typeof row.desc!=='string')throw new Error('分红说明缺失');
   for(const field of ['recordDate','exDate','paymentDate'])if(row[field]&&!validDate(row[field]))throw new Error('分红日期无效');
  }
 }else if(method==='buyback'){
  if(!Array.isArray(data.buybackHistory))throw new Error('回购历史格式变化');
  for(const row of data.buybackHistory)if(typeof row.fiscalYear!=='string'||row.netBuyback!==''&&numeric(row.netBuyback)===null)throw new Error('回购年份或数值无效');
 }else if(method==='corpAction'){
  if(!Array.isArray(data.items))throw new Error('公司行动列表格式变化');
  for(const row of data.items)if(typeof row.id!=='string'||typeof row.actDesc!=='string'||row.date&&(!/^\d{8}$/.test(row.date)||!validDate(`${row.date.slice(0,4)}-${row.date.slice(4,6)}-${row.date.slice(6,8)}`)))throw new Error('公司行动字段无效');
 }else throw new Error('不支持的基本面方法');
}
export function createBrokerFundamentals({fetcher=fetchLongbridgeFundamental,configured=()=>providerStatus().longbridge.configured,clock=Date.now,archive,scope=()=> 'test'}={}){
 const cache=createMarketCache({clock,maxEntries:64});
 return async(security,{years=8,signal}={})=>{
  const result={configured:configured(),supported:['HK','US'].includes(security.market),sources:[],coverage:[],warnings:[],windows:[]};
  if(!result.configured||!result.supported)return result;
  for(const method of ['valuationHistory','dividendDetail','buyback','corpAction']){
   const key=`longbridge-fundamental:v1:${scope()}:${longbridgeSymbol(security)}:${method}`;
   try{
    const response=await cache(key,async shared=>{
     let value;
     try{value=await fetcher(security,shared,{method});validateBrokerFundamental(method,value.data,security);}
     catch(error){
      shared.throwIfAborted();
      if(!/permission|权限|HTTP (401|403)|不匹配|格式|无效/i.test(error.message)){
       const previous=await archive?.get(key,{maxAgeMs:(method==='valuationHistory'?2:30)*86400000}).catch(()=>null);
       if(previous)return {...previous,stale:true,fromCache:true};
      }
      throw error;
     }
     try{await archive?.put(key,value);}catch{value.cacheWarning='长桥基本面归档失败，后续故障时可能无法回用。';}return value;
    },{signal,ttlMs:300000,shouldCache:value=>!value.stale});
    signal?.throwIfAborted();validateBrokerFundamental(method,response.data,security);
    const data=response.data,isValuation=method==='valuationHistory';
    let rows=0,dates=[],detail={};
    if(isValuation){result.windows=brokerValuationWindows(data);rows=Math.max(...Object.values(data.history.metrics).map(item=>item.list?.length||0));dates=Object.values(data.history.metrics).flatMap(item=>(item.list||[]).map(point=>new Date(point.timestamp*1000).toISOString()));detail={windows:result.windows};}
    else if(method==='dividendDetail'){rows=data.list.length;dates=data.list.flatMap(row=>[row.exDate,row.paymentDate]).filter(Boolean);detail={observedPaymentYears:[...new Set(data.list.map(row=>row.paymentDate?.slice(0,4)).filter(Boolean))].sort()};}
    else if(method==='buyback'){rows=data.buybackHistory.length;detail={fiscalYears:data.buybackHistory.map(row=>row.fiscalYear),purposeVerified:false,cancellationVerified:false};}
    else{rows=data.items.length;dates=data.items.map(row=>row.date).filter(Boolean).map(date=>`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`);}
    dates.sort();const pastDates=dates.filter(date=>Date.parse(date)<=clock());
    const coverage={api:`longbridge_${method}`,rows,firstDate:pastDates[0]||null,lastDate:pastDates.at(-1)||null,stale:response.stale===true,limited:true,status:rows?'needs-review':'empty',...detail};
    result.coverage.push(coverage);
    if(response.cacheWarning)result.warnings.push(response.cacheWarning);
    if(response.stale)result.warnings.push(`长桥 ${method} 使用 ${response.fetchedAt} 留存数据，未确认最新披露。`);
    if(!rows)continue;
    const title={valuationHistory:'历史估值采样与分位',dividendDetail:'分红日期与描述',buyback:'回购历史参考',corpAction:'公司行动与分派公告线索'}[method];
    const path={valuationHistory:'valuation-history',dividendDetail:'dividend-detail',buyback:'buyback',corpAction:'corp-action'}[method];
    const notice=isValuation?'只使用实际返回的历史采样点；接口可只返回PE，采样可能为周或月，缺少五年时不能称完整五年分位。数据商描述中的“便宜/合理”不是本模型判断。':
     '数据商整理，尚未与官方公告逐事件核验。分红描述可能涉及实物分派或折算价值，不能仅凭Cash Dividend标签认定普通现金股息；股本/回购金额不能作为实际注销证明。空证券字段按SDK请求绑定身份，已有非空代码会校验。事件不同日期分别保留，不重复汇总。';
    result.sources.push({title:`${longbridgeSymbol(security)} ${title} · 长桥`,security:`${security.market}:${security.symbol}`,type:isValuation?'valuation-history':'shareholder-data',api:`longbridge_${method}`,provider:'长桥基本面 API',official:false,url:`https://open.longbridge.com/docs/fundamental/fundamental/${path}`,fetchedAt:response.fetchedAt,date:coverage.lastDate,dateBasis:'latest-returned-observation',stale:response.stale===true,fromCache:response.fromCache===true,limited:true,
     coverage:`${rows}条来源记录；目标${years}年不代表接口实际返回完整${years}年`,text:`${notice}\n覆盖检查：${JSON.stringify(coverage)}\n原始数据：\n${JSON.stringify(data,null,2)}`});
   }catch(error){signal?.throwIfAborted();result.coverage.push({api:`longbridge_${method}`,rows:0,status:'failed',error:error.message});result.warnings.push(`长桥 ${method} 读取失败：${error.message}`);}
  }
  return result;
 };
}
export const fetchBrokerFundamentals=createBrokerFundamentals({archive:dataArchive,scope:()=>createHash('sha256').update(providerConfig().longbridge.accessToken).digest('hex')});
