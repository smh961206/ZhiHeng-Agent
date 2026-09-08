const text={type:'string'},number={type:['number','null']},ids={type:'array',minItems:1,maxItems:8,items:text};
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
export const shareholderReturnProperties={asOf:text,latestFiscalYear:{type:'integer'},price:number,
 events:{type:'array',maxItems:100,items:object({eventId:text,revisionDate:text,fiscalYear:{type:'integer'},kind:{type:'string',enum:['ordinary','interim','special','unknown']},status:{type:'string',enum:['proposal','approved','implemented','cancelled']},paymentDate:{type:['string','null']},dps:number,totalCash:number,sourceIds:ids})},
 profits:{type:'array',maxItems:8,items:object({year:{type:'integer'},profit:number,ocf:number,capex:number,sourceIds:ids})},
 reportedAggregate:{anyOf:[{type:'null'},object({startYear:{type:'integer'},endYear:{type:'integer'},cash:number,averageProfit:number,sourceIds:ids})]}};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const amount=(v,negative=false)=>v===null||typeof v==='number'&&Number.isFinite(v)&&(negative||v>=0);
const sum=(rows,key)=>rows.length&&rows.every(r=>r[key]!==null)?rows.reduce((n,r)=>n+r[key],0):null;
const ratio=(a,b)=>a!==null&&b!==null&&b>0?a/b:null;
export function shareholderReturn(args,{sources=[]}={}){
 const {asOf,latestFiscalYear,events,profits,reportedAggregate=null}=args;
 if(!validDate(asOf)||!Number.isInteger(latestFiscalYear)||latestFiscalYear<1900||latestFiscalYear>=Number(asOf.slice(0,4)))throw new Error('须声明有效截止日与已结束的自然财年；本工具不适用于非自然财年');
 if(!Array.isArray(events)||events.length>100||!Array.isArray(profits)||profits.length>8||!amount(args.price)||args.price!==null&&args.price<=0)throw new Error('分红、利润输入或价格无效');
 const cite=references=>{
  if(!Array.isArray(references)||!references.length||references.length>8||references.some(id=>!args.basis?.sourceIds?.includes(id)||sources.filter(s=>s.id===id).length!==1||!sources.some(s=>s.id===id&&s.official&&['official-report','official-xbrl'].includes(s.type))))throw new Error('分红和利润行须关联basis内唯一的已读取官方披露，供应商或目录不能单独作依据');
 };
 const year=y=>Number.isInteger(y)&&y>=latestFiscalYear-7&&y<=Number(asOf.slice(0,4));
 const groups=new Map();
 for(const input of events){
  const event=Object.fromEntries(['eventId','revisionDate','fiscalYear','kind','status','paymentDate','dps','totalCash','sourceIds'].map(key=>[key,input?.[key]]));
  if(typeof event.eventId!=='string'||!event.eventId.trim()||event.eventId.length>160||!validDate(event.revisionDate)||event.revisionDate>asOf||!year(event.fiscalYear)||!['ordinary','interim','special','unknown'].includes(event.kind)||!['proposal','approved','implemented','cancelled'].includes(event.status)||event.paymentDate!==null&&!validDate(event.paymentDate)||!amount(event.dps)||!amount(event.totalCash))throw new Error('分红事件的标识、版本日期、金额或分类无效');
  cite(event.sourceIds);const list=groups.get(event.eventId)||[];list.push(event);groups.set(event.eventId,list);
 }
 const revisions=[],conflicts=[];
 const ledger=[...groups.entries()].map(([eventId,list])=>{
  if(new Set(list.map(e=>e.fiscalYear)).size!==1)throw new Error('同一分红事件的利润归属年度不一致，须先核对事件身份');
  const latestDate=list.map(e=>e.revisionDate).sort().at(-1),latest=list.filter(e=>e.revisionDate===latestDate),e=latest[0];
  const versions=new Set(latest.map(({sourceIds,...row})=>JSON.stringify(row)));
  revisions.push({eventId,selectedRevision:latestDate,olderVersions:list.length-latest.length,duplicateCopies:latest.length-versions.size});
  if(versions.size>1){conflicts.push({eventId,reason:'同一事件最新版本金额或状态冲突',sourceIds:[...new Set(latest.flatMap(e=>e.sourceIds))]});return {...e,status:'conflict',dps:null,totalCash:null};}
  return {...e,sourceIds:[...new Set(latest.flatMap(r=>r.sourceIds))],paymentState:e.status==='implemented'&&e.paymentDate&&e.paymentDate<=asOf?'payment-date-observed':'not-observed'};
 });
 const seenYears=new Set();
 const identities=new Map();
 for(const e of ledger.filter(e=>e.status==='implemented'&&e.paymentDate)){
  const key=[e.fiscalYear,e.kind,e.paymentDate].join(':'),rows=identities.get(key)||[];rows.push(e);identities.set(key,rows);
 }
 for(const rows of identities.values())if(rows.length>1){
  conflicts.push({eventIds:rows.map(e=>e.eventId),reason:'相同归属年度、类型和派息日使用多个事件标识，无法排除重复计入',sourceIds:[...new Set(rows.flatMap(e=>e.sourceIds))]});
  for(const e of rows){e.status='conflict';e.dps=null;e.totalCash=null;delete e.paymentState;}
 }
 for(const p of profits){
  if(!year(p.year)||p.year>latestFiscalYear||seenYears.has(p.year)||!amount(p.profit,true)||!amount(p.ocf,true)||!amount(p.capex))throw new Error('利润记录须为不重复的完整年度，保留缺值null');
  seenYears.add(p.year);cite(p.sourceIds);
 }
 const annual=Array.from({length:8},(_,i)=>latestFiscalYear-7+i).map(year=>{
  const observed=ledger.filter(e=>e.fiscalYear===year&&e.paymentState==='payment-date-observed'),p=profits.find(p=>p.year===year);
  const blocked=ledger.some(e=>e.fiscalYear===year&&(e.status==='conflict'||e.status==='implemented'&&e.paymentState!=='payment-date-observed'));
  const dps=blocked?null:sum(observed,'dps'),cash=blocked?null:sum(observed,'totalCash'),profit=p?.profit??null,quickFcf=p&&p.ocf!==null&&p.capex!==null?p.ocf-p.capex:null;
  return {year,dps,cash,profit,quickFcf,payout:ratio(cash,profit),quickFcfCoverage:ratio(quickFcf,cash),specialDps:sum(observed.filter(e=>e.kind==='special'),'dps'),eventIds:observed.map(e=>e.eventId),sourceIds:[...new Set([...observed.flatMap(e=>e.sourceIds),...(p?.sourceIds??[])])],status:blocked||dps===null||cash===null||profit===null?'incomplete':'observed-needs-review'};
 });
 // Calendar-year lookback, clamped for February 29; no fixed 365-day shortcut.
 const cut=new Date(asOf);const month=cut.getUTCMonth();cut.setUTCFullYear(cut.getUTCFullYear()-1);if(cut.getUTCMonth()!==month)cut.setUTCDate(0);const start=cut.toISOString().slice(0,10);
 const paid=ledger.filter(e=>e.paymentState==='payment-date-observed'&&e.paymentDate>start);
 const ttmBlocked=ledger.some(e=>(e.status==='conflict'||e.status==='implemented'&&!e.paymentDate)&&(!e.paymentDate||e.paymentDate>start&&e.paymentDate<=asOf));
 const ttmDps=ttmBlocked?null:sum(paid,'dps'),three=annual.slice(-3),cash=sum(three,'cash'),profit=sum(three,'profit'),quick=sum(three,'quickFcf'),dps=sum(three,'dps');
 let aggregateCheck=null;
 if(reportedAggregate!==null){
  const a=reportedAggregate;cite(a.sourceIds);
  if(a.startYear!==latestFiscalYear-2||a.endYear!==latestFiscalYear||!amount(a.cash)||!amount(a.averageProfit,true))throw new Error('官方汇总比较须与最近三个完整财年一致');
  const cashDifference=cash!==null&&a.cash!==null?cash-a.cash:null,profitDifference=profit!==null&&a.averageProfit!==null?profit/3-a.averageProfit:null;
  aggregateCheck={reported:a,recomputed:{cash,averageProfit:profit===null?null:profit/3},cashDifference,profitDifference,status:cashDifference===null||profitDifference===null?'incomplete':Math.abs(cashDifference)>.01||Math.abs(profitDifference)>.01?'mismatch':'matched',notice:'逐笔/逐年重算与公告汇总的口径差异保留，不自动判断哪份公告错误。'};
 }
 const result={status:conflicts.length||annual.some(r=>r.status==='incomplete')||aggregateCheck&&aggregateCheck.status!=='matched'?'incomplete':'calculated-needs-review',asOf,annual,ledger,revisions,conflicts,
  ttm:{startExclusive:start,endInclusive:asOf,dps:ttmDps,yield:ratio(ttmDps,args.price),eventIds:paid.map(e=>e.eventId)},
  rollingThreeYears:{startYear:latestFiscalYear-2,endYear:latestFiscalYear,cash,profit,payout:ratio(cash,profit),averageDps:dps===null?null:dps/3,quickFcfCoverage:ratio(quick,cash)},aggregateCheck,
  notice:'按稳定eventId选择最新修订，保留重复及冲突。派息日已到不独立证明实际付款；股息按付款日、支付率按盈利归属年度。只汇总输入事件，不证明八年公告完整；未观测年份不是零分红。金额元、股息元/股；QuickFCF不是FCFE，特别分红不外推，历史股数变化可能限制DPS可比性。'};
 const finite=value=>{if(typeof value==='number'&&!Number.isFinite(value))throw new Error('分红核算超出有限数值范围');if(value&&typeof value==='object')Object.values(value).forEach(finite);};finite(result);return result;
}
