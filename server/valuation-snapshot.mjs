const s={type:'string'},n={type:['number','null']},ids={type:'array',items:s};
const flow={type:'object',properties:{start:s,end:s,value:n,sourceIds:ids},required:['start','end','value','sourceIds'],additionalProperties:false};
const stock={type:'object',properties:{date:s,value:n,sourceIds:ids},required:['date','value','sourceIds'],additionalProperties:false};
export const valuationSnapshotProperties={
 valuationBasis:{type:'string',enum:['single-class','all-common-at-quote','unknown']},equityBasis:{type:'string',enum:['parent','common','unknown']},otherEquity:{anyOf:[stock,{type:'null'}]},
 quote:{type:'object',properties:{sourceId:s,price:{type:'number'},currency:s,asOf:s},required:['sourceId','price','currency','asOf'],additionalProperties:false},
 shares:{type:'object',properties:{...stock.properties,changesReviewed:{type:'boolean'}},required:[...stock.required,'changesReviewed'],additionalProperties:false},
 annual:flow,current:{anyOf:[flow,{type:'null'}]},previous:{anyOf:[flow,{type:'null'}]},equity:{anyOf:[stock,{type:'null'}]},
 earningsFactors:{type:'array',minItems:1,maxItems:10,items:{type:'number'}},peMultiples:{type:'array',minItems:1,maxItems:10,items:{type:'number'}},
};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const fail=text=>{throw new Error(text);};
export function valuationSnapshot(args,{sources=[]}={}){
 const {quote,shares,annual,current,previous,equity,earningsFactors,peMultiples,basis}=args;
 const valuationBasis=args.valuationBasis??'unknown',equityBasis=args.equityBasis??'unknown',otherEquity=args.otherEquity??null;
 if(!['single-class','all-common-at-quote','unknown'].includes(valuationBasis)||!['parent','common','unknown'].includes(equityBasis))fail('须明确报价对应的股类/全体普通股权益，以及净资产口径');
 if(!quote||!positive(quote.price)||!Number.isFinite(Date.parse(quote.asOf))||quote.currency!==basis?.currency)fail('行情价格、时间或币种无效；不自动换汇');
 const candidates=sources.filter(s=>s.id===quote.sourceId&&s.type==='quote');
 if(candidates.length!==1||!basis.sourceIds.includes(quote.sourceId))fail('须关联本次唯一的实际行情来源');
 let observed;try{observed=JSON.parse(candidates[0].text);}catch{fail('行情来源缺少可核对的结构化快照');}
 if(observed.price!==quote.price||observed.currency!==quote.currency||Date.parse(observed.asOf)!==Date.parse(quote.asOf))fail('声明的行情与本次来源快照不一致');
 const financial=row=>{
  if(!row||row.value!==null&&(typeof row.value!=='number'||!Number.isFinite(row.value))||!Array.isArray(row.sourceIds)||row.value!==null&&!row.sourceIds.length||row.sourceIds.some(id=>!basis.sourceIds.includes(id)||!sources.some(s=>s.id===id&&!['quote','filing-index','data-check','search-result','search-summary'].includes(s.type))))fail('财务值须为统一币种的元/股数及实际财务来源；缺失值为null');
 };
 const flowCheck=row=>{financial(row);if(!date(row.start)||!date(row.end)||row.start>row.end)fail('利润流量期间无效');};
 flowCheck(annual);
 const annualDays=(Date.parse(annual.end)-Date.parse(annual.start))/86400000+1;
 if(annualDays<340||annualDays>380)fail('年度利润须覆盖一个完整会计年度');
 financial(shares);if(!date(shares.date)||Date.parse(shares.date)>Date.parse(quote.asOf)||shares.value!==null&&!positive(shares.value)||typeof shares.changesReviewed!=='boolean')fail('股本日期或股数无效，须明确期后变动是否核对');
 if(equity!==null){financial(equity);if(!date(equity.date)||Date.parse(equity.date)>Date.parse(quote.asOf))fail('净资产日期无效或晚于行情时点');}
 if(otherEquity!==null){financial(otherEquity);if(equityBasis!=='parent'||!equity||otherEquity.date!==equity.date||otherEquity.value!==null&&otherEquity.value<0)fail('其他权益工具只可从同日归母权益中扣除，不能从普通股权益重复扣除');}
 let ttm=annual.value,period={start:annual.start,end:annual.end},formula='最近完整年度归母利润；未提供匹配累计期，不推定更新的TTM';
 if((current===null)!==(previous===null))fail('TTM须同时提供本期与上年同期累计利润，不能把缺失期补零');
 if(current!==null){
  flowCheck(current);flowCheck(previous);
  if(previous.start!==annual.start||Date.parse(current.start)!==Date.parse(annual.end)+86400000||previous.end>annual.end||current.start.slice(4)!==previous.start.slice(4)||current.end.slice(4)!==previous.end.slice(4)||Number(current.end.slice(0,4))!==Number(previous.end.slice(0,4))+1||(Date.parse(current.end)-Date.parse(current.start))/86400000>334)fail('TTM仅接受与最近年度匹配的本年累计/上年同期累计，不能混用单季度');
  ttm=[annual.value,current.value,previous.value].some(v=>v===null)?null:annual.value-previous.value+current.value;
  period={start:new Date(Date.parse(previous.end)+86400000).toISOString().slice(0,10),end:current.end};formula='TTM归母利润 = 最近完整年度 − 上年同期累计 + 本期累计';
 }
 if(Date.parse(period.end)>Date.parse(quote.asOf))fail('财报期间晚于行情时点，不能构造该时点估值');
 for(const values of [earningsFactors,peMultiples])if(!Array.isArray(values)||!values.length||values.length>10||values.some(v=>!positive(v)||v>1000))fail('敏感性假设须为1至10个有限正数');
 const equityValueAtQuote=shares.value===null?null:quote.price*shares.value,marketCap=valuationBasis==='single-class'?equityValueAtQuote:null,epsProxy=shares.value===null||ttm===null?null:ttm/shares.value;
 const commonEquity=equityBasis==='common'?equity?.value??null:equityBasis==='parent'&&equity?.value!==null&&equity&&otherEquity?.value!=null?equity.value-otherEquity.value:null;
 const result={currency:quote.currency,amountUnit:'元；股本为股',quote,shares,annual,current,previous,equity,otherEquity,equityBasis,commonEquity,valuationBasis,equityValueAtQuote,
  valueLabel:valuationBasis==='single-class'?'同价普通股市值':valuationBasis==='all-common-at-quote'?'按本股类价格折算的全体普通股权益':'报价乘声明股数，股类口径待核对',actualCombinedMarketCap:marketCap,period,formula,ttmProfit:ttm,marketCap,epsProxy,
  peFY:equityValueAtQuote!==null&&annual.value>0?equityValueAtQuote/annual.value:null,peTTM:equityValueAtQuote!==null&&ttm>0?equityValueAtQuote/ttm:null,pb:equityValueAtQuote!==null&&equity?.value>0?equityValueAtQuote/equity.value:null,pbCommon:equityValueAtQuote!==null&&commonEquity>0?equityValueAtQuote/commonEquity:null,
  earningsYield:equityValueAtQuote>0&&ttm!==null?ttm/equityValueAtQuote:null,
  sensitivity:epsProxy>0?earningsFactors.map(factor=>({earningsFactor:factor,epsProxy:epsProxy*factor,prices:peMultiples.map(pe=>({pe,price:epsProxy*factor*pe}))})):[],
  status:ttm===null||shares.value===null?'incomplete':'calculated-needs-review',
  limitations:['单位固定为元与股，不进行隐式千/万/亿缩放；原始金额、股类和合并归母口径仍须核对。','A股价乘A+H总股数是权益等值，不是两地实际合计市值；未取得各股类价格和汇率时不计算后者。仅A股股数不可除以全公司归母利润。','普通股权益须排除其他权益工具；已是普通股权益时不重复扣除。口径未声明或金额缺失时不推定普通股PB。','当前股数计算的每股盈利是代理值，不是财报稀释加权平均EPS。','敏感性是显式假设下的价格刻度，不是内在价值、合理价格区间或买入建议。','亏损/零利润不计算PE；非正权益不计算PB；缺失值不补零。',...(valuationBasis==='unknown'?['股类口径未明确，倍数只作未核对代理，不能直接用于投资结论。']:[]),...(!shares.changesReviewed?['股本时点到行情时点的资本变动未完整核对，市值与倍数保留股本代理限制。']:[])]};
 const check=v=>{if(typeof v==='number'&&!Number.isFinite(v))fail('计算结果超出有限数值范围');if(v&&typeof v==='object')Object.values(v).forEach(check);};check(result);return result;
}
