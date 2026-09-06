import {createTushareClient,tushareClient} from './tushare-client.mjs';
import {isoDate,tushareSymbol} from './tushare-financials.mjs';
import {dividendLedger} from './capital-evidence.mjs';

const definitions={
 dividend:{title:'分红与送转记录',doc:103,required:['ts_code','end_date','div_proc','cash_div_tax','pay_date'],dates:['end_date','ann_date','record_date','ex_date','pay_date','div_listdate','imp_ann_date','base_date'],numbers:['stk_div','stk_bo_rate','stk_co_rate','cash_div','cash_div_tax','base_share'],
  fields:'ts_code,end_date,ann_date,div_proc,stk_div,stk_bo_rate,stk_co_rate,cash_div,cash_div_tax,record_date,ex_date,pay_date,div_listdate,imp_ann_date,base_date,base_share',
  units:{cash_div:'每股税后金额；币种待核对',cash_div_tax:'每股税前金额；币种待核对',base_share:'万股',stk_div:'每股送转比例'},
  notice:'保留预案、决案、实施状态和各次修订。所属盈利年度、实施日与派息日分别记录；实施但尚未到派息日不计为已支付。不得将同一方案的多次公告重复相加。特别分红与常规分红仍需原文辨别；缺少记录不等于零分红。'},
 repurchase:{title:'回购公告与进度',doc:124,required:['ts_code','ann_date','proc','vol','amount'],dates:['ann_date','end_date','exp_date'],numbers:['vol','amount','high_limit','low_limit'],fields:'',units:{vol:'接口未明确单位，待原文核对',amount:'接口未明确币种与单位，待原文核对'},
  notice:'按公告日期范围查询全市场后匹配证券；达到返回上限会拆分日期重取。每行是公告或进度快照，可能包含计划上限和累计执行数，不可跨行求和。接口缺少可靠的方案ID、回购用途及实际注销证明，不自动归类为注销式回购，也不自动计入股东现金回报。'},
 daily_basic:{title:'历史股本与变动快照',doc:32,required:['ts_code','trade_date','total_share','float_share'],dates:['trade_date'],numbers:['total_share','float_share','free_share'],fields:'ts_code,trade_date,total_share,float_share,free_share',units:{total_share:'万股',float_share:'万股',free_share:'万股',normalizedShares:'股（原值×10000）'},
  notice:'原始股本单位为万股，标准化股数明确乘10000。变动日期为交易日快照首次观测日，不是法律生效日；停牌与缺失交易日无法观察。股本减少不等于注销回购，增加不等于融资；拆并股、送转、增发、回购及激励原因均需公告核对。总股本不是稀释加权平均股本，A/H及ADR比例须另核对。'},
};
export function parseActionTable(data,api,security,{marketWide=false}={}){
 const spec=definitions[api],{fields,items}=data?.data??{};
 if(!spec||data?.code!==0||!Array.isArray(fields)||!Array.isArray(items)||fields.some(x=>typeof x!=='string')||new Set(fields).size!==fields.length||!spec.required.every(field=>fields.includes(field)))throw new Error(`${api}数据字段缺失或格式变化`);
 return items.map(item=>{
  if(!Array.isArray(item)||item.length!==fields.length)throw new Error(`${api}字段与数值数量不一致`);
  const row=Object.fromEntries(fields.map((field,i)=>[field,item[i]]));
  if(typeof row.ts_code!=='string'||!row.ts_code||(marketWide?!/^[A-Za-z0-9.-]{1,24}$/.test(row.ts_code):row.ts_code!==tushareSymbol(security)))throw new Error(`${api}证券代码不匹配`);
  // Full-market pages may contain other share classes and bad values unrelated to
  // the requested company. Only their date matters for checking the query window.
  if(marketWide&&row.ts_code!==tushareSymbol(security)){if(!row.ann_date)throw new Error('回购公告日期缺失');isoDate(row.ann_date);return row;}
  for(const field of spec.dates)if(row[field]!=null&&row[field]!=='')isoDate(row[field]);
  for(const field of spec.numbers)if(row[field]!=null&&(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<0))throw new Error(`${api}的${field}不是有效数值`);
  if(api==='daily_basic'&&(!row.trade_date||!(row.total_share>0)))throw new Error('股本快照缺少交易日或有效总股本');
  if(api==='daily_basic'&&spec.numbers.some(field=>row[field]!=null&&!Number.isSafeInteger(Math.round(row[field]*10000))))throw new Error('股本换算超出安全数值范围');
  if(api==='repurchase'&&!row.ann_date||api==='dividend'&&!row.end_date)throw new Error(`${api}缺少归属日期`);
  return row;
 });
}
const unique=rows=>[...new Map(rows.map(row=>[JSON.stringify(row),row])).values()];
const compactDate=date=>date.toISOString().slice(0,10).replaceAll('-','');
export function requestedYears(years=8,clock=Date.now){
 const current=new Date(clock()).getUTCFullYear();
 return Array.from({length:years},(_,i)=>current-years+i);
}
export function dividendCoverage(rows,years,today){
 return years.map(year=>{
  const records=rows.filter(row=>row.end_date?.startsWith(String(year))),implemented=records.filter(row=>row.div_proc==='实施');
  const identities=new Map();let ambiguous=0;
  for(const row of implemented){
   if(!row.record_date||!row.ex_date||!row.pay_date){ambiguous++;continue;}
   const key=[row.end_date,row.record_date,row.ex_date,row.pay_date].join(':');
   if(!identities.has(key))identities.set(key,new Set());
   identities.get(key).add(JSON.stringify([row.cash_div_tax,row.base_share,row.stk_div]));
  }
  ambiguous+=[...identities.values()].filter(values=>values.size>1).length;
  return {year,records:records.length,implementedRecords:implemented.length,observedPaidRecords:implemented.filter(row=>row.pay_date&&row.pay_date<=today).length,
   ambiguousEvents:ambiguous,status:!records.length?'missing':ambiguous?'ambiguous':'observed',regularVsSpecialVerified:false,
   notice:!records.length?'未找到记录，不能记为零分红':'仅表示已观察记录，不证明年度方案齐全或支付总额已核验'};
 });
}
export function shareTimeline(rows){
 const ordered=unique(rows).sort((a,b)=>a.trade_date.localeCompare(b.trade_date)),dates=new Set();let previous;
 const changes=[];
 for(const row of ordered){
  if(dates.has(row.trade_date))throw new Error('同一交易日存在冲突股本快照');dates.add(row.trade_date);
  const changed=!previous||['total_share','float_share','free_share'].some(field=>row[field]!==previous[field]);
  if(changed)changes.push({observedOn:isoDate(row.trade_date),totalShares:Math.round(row.total_share*10000),floatShares:row.float_share==null?null:Math.round(row.float_share*10000),freeShares:row.free_share==null?null:Math.round(row.free_share*10000),unit:'股',changeCause:null});
  previous=row;
 }
 return {observations:ordered.length,firstDate:ordered[0]?.trade_date??null,lastDate:ordered.at(-1)?.trade_date??null,changes,
  annualSnapshots:[...new Set(ordered.map(row=>row.trade_date.slice(0,4)))].map(year=>{const row=ordered.filter(row=>row.trade_date.startsWith(year)).at(-1);return {year:Number(year),observedOn:isoDate(row.trade_date),totalShares:Math.round(row.total_share*10000),unit:'股'};})};
}

export function createShareholderFetcher({request,token,clock=Date.now,wait,client=createTushareClient({request,token,clock,wait}),maxRepurchaseRequests=128,repurchaseBudgetMs=120000}={}){
 return async(security,{years=8,signal,emit=()=>{}}={})=>{
  signal?.throwIfAborted();const annualYears=requestedYears(years,clock),today=compactDate(new Date(clock())),start=`${annualYears[0]}0101`;
  const result={configured:client.configured(),supported:security.market==='CN',sources:[],coverage:[],warnings:[],records:{}};
  if(!result.configured||!result.supported)return result;
  const symbol=tushareSymbol(security);
  for(const [api,spec] of Object.entries(definitions)){
   emit('fetch',`${symbol} 获取${spec.title}`);
   signal?.throwIfAborted();let rows=[],limited=false,unresolvedRanges=[],fetchedAt,requests=0,stale=false;
   try{
    if(api==='repurchase'){
     // This documented endpoint accepts dates, not a ticker. Never assume that an
     // ignored ticker filter limits the response or that a full page is complete.
     const ranges=[[start,today]],deadline=clock()+repurchaseBudgetMs;
     while(ranges.length){
      signal?.throwIfAborted();
      if(requests>=maxRepurchaseRequests||clock()>=deadline){unresolvedRanges.push(...ranges);break;}
      const [from,to]=ranges.shift();let response;
      try{const budgetSignal=AbortSignal.timeout(Math.max(1,deadline-clock()));response=await client(api,{start_date:from,end_date:to},{signal:signal?AbortSignal.any([signal,budgetSignal]):budgetSignal});requests++;}
      catch(error){signal?.throwIfAborted();if(!requests)throw error;unresolvedRanges.push([from,to],...ranges);result.warnings.push(`${symbol} 回购部分范围失败：${error.message}`);break;}
      fetchedAt=response.fetchedAt;
      stale=stale||response.stale===true;if(response.warning)result.warnings.push(response.warning);
      const batch=parseActionTable(response.data,api,security,{marketWide:true});
      if(batch.some(row=>row.ann_date<from||row.ann_date>to))throw new Error('回购接口返回公告日期超出请求范围');
      rows.push(...batch.filter(row=>row.ts_code===symbol));
      if(requests%16===0)emit('fetch',`${symbol} 回购历史已找到${unique(rows).length}条记录，继续检查剩余公告`);
      if(batch.length>=2000||response.data.data.has_more===true){
       if(from===to){unresolvedRanges.push([from,to]);continue;}
       const first=Date.parse(isoDate(from)),last=Date.parse(isoDate(to)),middle=first+Math.floor((last-first)/86400000/2)*86400000;
       ranges.push([from,compactDate(new Date(middle))],[compactDate(new Date(middle+86400000)),to]);
      }
     }
     limited=unresolvedRanges.length>0;
    }else{
     const params=api==='dividend'?{ts_code:symbol}:{ts_code:symbol,start_date:start,end_date:today};
     const response=await client(api,params,{fields:spec.fields,signal,archiveScope:`shareholder:${api}:${symbol}:${years}`});requests++;fetchedAt=response.fetchedAt;
     stale=response.stale===true;if(response.warning)result.warnings.push(response.warning);
     const batch=parseActionTable(response.data,api,security);limited=response.data.data.has_more===true||batch.length>=(api==='dividend'?2000:6000);
     rows=batch.filter(row=>{
      const date=api==='dividend'?row.end_date:row.trade_date;
      return date>=start&&date<=today&&(!row.ann_date||row.ann_date<=today)&&(!row.imp_ann_date||row.imp_ann_date<=today);
     });
    }
    rows=unique(rows);result.records[api]=rows;
    const detail=api==='dividend'?{years:dividendCoverage(rows,annualYears,today),ledger:dividendLedger(rows,today)}:api==='daily_basic'?shareTimeline(rows):{unresolvedRanges,purposeVerified:false,cancellationVerified:false,totalBuybackCash:null};
    result.coverage.push({api,rows:rows.length,status:limited||stale?'partial':rows.length?'observed':'empty',limited,stale,requests,...detail});
    if(limited)result.warnings.push(`${symbol} ${spec.title}历史覆盖不完整，不能视为完整${years}年数据`);
    if(!rows.length){result.warnings.push(`${symbol} ${spec.title}未找到记录，不能据此判定没有分红、回购或股本变动`);continue;}
    const dates=rows.map(row=>api==='daily_basic'?row.trade_date:row.ann_date||row.end_date).filter(Boolean).sort();
    result.sources.push({title:`${symbol} ${spec.title} · Tushare`,provider:'Tushare Pro',url:`https://tushare.pro/document/2?doc_id=${spec.doc}`,security:`CN:${security.symbol}`,type:'shareholder-data',api,official:false,
     date:dates.length?isoDate(dates.at(-1)):null,dateBasis:api==='daily_basic'?'latest-observation':'latest-event',fetchedAt,currency:null,units:spec.units,limited,stale,
     coverage:`${rows.length}条记录；${start}至${today}；${limited?'历史范围存在缺口':'已完成本次查询，业务完整性待官方原文核对'}`,
     text:`数据商整理的股东回报资料，不是官方原文。${spec.notice}\n原始单位：${JSON.stringify(spec.units)}\n覆盖检查：${JSON.stringify(detail)}\n原始记录（保留状态与日期）：\n${JSON.stringify(rows,null,2)}`});
   }catch(error){signal?.throwIfAborted();delete result.records[api];result.coverage.push({api,rows:0,status:'failed',error:error.message});result.warnings.push(`${symbol} ${spec.title}获取失败：${error.message}`);}
  }
  return result;
 };
}
export const fetchShareholderData=createShareholderFetcher({client:tushareClient});
