// Deterministic arithmetic on explicitly supplied, comparable observations.
// Provenance is checked by calculationBasis; this does not verify input figures.
const numbers=['revenue','netIncome','adjustedNetIncome','grossProfit','costOfRevenue','overseasRevenue','ocf','capex','roe'];
const stockNumbers=['cash','unrestrictedCash','shortDebt','receivables','inventory','construction','contractLiabilities','assets','liabilities','currentAssets','currentLiabilities'];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const day=86400000;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const days=(start,end)=>(Date.parse(end)-Date.parse(start))/day+1;
const fail=message=>{throw new Error(message);};
const change=(current,previous)=>({change:finite(current)&&finite(previous)?current-previous:null,
 growth:finite(current)&&finite(previous)&&previous>0?(current-previous)/previous:null,
 ...(!finite(current)||!finite(previous)?{reason:'字段缺失'}:previous<=0?{reason:'基数非正，不计算增长率'}:{})});
const finiteResults=value=>{
 if(typeof value==='number'&&!Number.isFinite(value))fail('计算结果超出有限数值范围');
 if(value&&typeof value==='object')Object.values(value).forEach(finiteResults);
};
const fieldDescriptions={adjustedNetIncome:'扣非归母净利润，金额；不与归母混用',grossProfit:'毛利金额，不是毛利率',costOfRevenue:'与收入对应的营业成本金额，用于存货周转',overseasRevenue:'同一披露定义下的海外收入金额，定义变化先统一口径',roe:'ROE小数，不是百分数或金额'};
export const screenToolProperties={
 sector:{type:'string',enum:['non-financial','bank','insurance','other-financial'],description:'银行、保险等金融企业不套用工业企业OCF-Capex或短债现金覆盖'},
 amountUnit:{type:'string',description:'所有金额统一单位，例如人民币元或人民币亿元；禁止跨币种或单位混算'},
 roeBasis:{type:'string',description:'所有ROE统一定义，例如加权平均归母ROE；ROE用小数。无ROE时写未提供'},
 periods:{type:'array',maxItems:40,items:{type:'object',properties:{start:{type:'string'},end:{type:'string'},kind:{type:'string',enum:['annual','quarter','cumulative']},sourceIds:{type:'array',items:{type:'string'}},...Object.fromEntries(numbers.map(key=>[key,{type:['number','null'],...(fieldDescriptions[key]?{description:fieldDescriptions[key]}:{})}]))},required:['start','end','kind','sourceIds'],additionalProperties:false}},
 balances:{type:'array',maxItems:20,items:{type:'object',properties:{date:{type:'string'},sourceIds:{type:'array',items:{type:'string'}},...Object.fromEntries(stockNumbers.map(key=>[key,{type:['number','null']}]))},required:['date','sourceIds'],additionalProperties:false}},
};
export function quickScreenMetrics(args,{sources}={}){
 const {periods=[],balances=[],basis,amountUnit,roeBasis,sector}=args;
 if(typeof amountUnit!=='string'||!amountUnit.trim()||typeof roeBasis!=='string'||!roeBasis.trim())fail('须明确金额单位及ROE定义');
 if(!['non-financial','bank','insurance','other-financial'].includes(sector))fail('须明确金融或非金融行业口径');
 const industrial=sector==='non-financial';
 if(!Array.isArray(periods)||periods.length>40||!Array.isArray(balances)||balances.length>20||!periods.length&&!balances.length)fail('财务计算须提供有限数量的财务记录');
 const allowed=new Set(basis?.sourceIds??[]);
 const validate=(row,fields)=>{
  if(!row||!Array.isArray(row.sourceIds)||!row.sourceIds.length||row.sourceIds.some(id=>!allowed.has(id)))fail('每条记录须关联basis中的实际来源ID');
  if(sources&&row.sourceIds.some(id=>!sources.some(source=>source.id===id&&!['quote','filing-index','data-check','search-result','search-summary'].includes(source.type))))fail('财务记录不能以行情、目录或覆盖检查作为数值来源');
  for(const key of fields)if(row[key]!=null&&!finite(row[key]))fail('财务字段须为有限数字或null：'+key);
 };
 const seen=new Map();
 for(const row of periods){
  validate(row,numbers);
  if(!date(row.start)||!date(row.end)||row.start>row.end)fail('财务期间无效');
  // First-quarter year-to-date figures are a valid cumulative period too.
  const length=days(row.start,row.end),range={annual:[340,380],quarter:[70,110],cumulative:[70,335]}[row.kind];
  if(!range||length<range[0]||length>range[1])fail('期间长度与年度、单季或累计分类不符');
  if(finite(row.capex)&&row.capex<0)fail('capex须为购建长期资产支付现金的正数，不能自动取绝对值');
  const key=[row.start,row.end,row.kind].join('/');
  if(seen.has(key))fail('存在重复期间，须先解决修订、口径或重复记录');
  seen.set(key,row);
 }
 const sorted=[...periods].sort((a,b)=>a.end.localeCompare(b.end)||a.start.localeCompare(b.start));
 const ratios=row=>({quickFcf:industrial&&finite(row.ocf)&&finite(row.capex)?row.ocf-row.capex:null,
  netMargin:finite(row.netIncome)&&row.revenue>0?row.netIncome/row.revenue:null,
  adjustedNetMargin:finite(row.adjustedNetIncome)&&row.revenue>0?row.adjustedNetIncome/row.revenue:null,
  grossMargin:finite(row.grossProfit)&&row.revenue>0?row.grossProfit/row.revenue:null,
  overseasShare:finite(row.overseasRevenue)&&row.revenue>0?row.overseasRevenue/row.revenue:null});
 const compare=(current,previous)=>({start:previous.start,end:previous.end,sourceIds:previous.sourceIds,
  metrics:Object.fromEntries([...numbers.filter(key=>key!=='roe'),'quickFcf'].map(key=>[key,change(current[key],previous[key])])),
  // Ratios use percentage-point changes, not subtraction as a derived quarter.
  percentagePoints:Object.fromEntries(['netMargin','adjustedNetMargin','grossMargin','overseasShare','roe'].map(key=>[key,finite(current[key])&&finite(previous[key])?(current[key]-previous[key])*100:null]))});
 const financial=sorted.map(row=>{
  const previous=sorted.find(p=>p.kind===row.kind&&Math.abs(days(p.start,p.end)-days(row.start,row.end))<=8&&days(p.end,row.end)>=351&&days(p.end,row.end)<=381);
  return {...row,...ratios(row),
   ocfToNetIncome:industrial&&finite(row.ocf)&&row.netIncome>0?row.ocf/row.netIncome:null,
   comparison:previous?compare({...row,...ratios(row)},{...previous,...ratios(previous)}):null};
 });
 const derivedQuarters=[],conflicts=[];
 for(const row of sorted.filter(p=>['cumulative','annual'].includes(p.kind))){
  const prior=sorted.filter(p=>p.start===row.start&&p.end<row.end).sort((a,b)=>b.end.localeCompare(a.end))[0];
  if(!prior)continue;
  const start=new Date(Date.parse(prior.end)+day).toISOString().slice(0,10),length=days(start,row.end);
  if(length<70||length>110)continue;
  const values=Object.fromEntries(numbers.filter(key=>key!=='roe').map(key=>[key,finite(row[key])&&finite(prior[key])?row[key]-prior[key]:null]));
  const direct=sorted.find(p=>p.kind==='quarter'&&p.start===start&&p.end===row.end);
  const conflictingFields=direct?Object.keys(values).filter(key=>finite(values[key])&&finite(direct[key])&&Math.abs(values[key]-direct[key])>Math.max(1e-8,Math.abs(values[key])*1e-9)):[];
  if(conflictingFields.length)conflicts.push({start,end:row.end,fields:conflictingFields,notice:'单季原值与累计相减不一致，保留两者；须核查修订与口径，不能选择性取值。',sourceIds:[...new Set([...direct.sourceIds,...row.sourceIds,...prior.sourceIds])]});
  derivedQuarters.push({start,end:row.end,kind:'quarter',...values,...ratios(values),
   sourceIds:[...new Set([...row.sourceIds,...prior.sourceIds])],status:conflictingFields.length?'conflict':'derived-needs-review',formula:`${row.start}至${row.end}累计流量 − ${prior.start}至${prior.end}累计流量`,notice:'仅推导可相减的流量；不相减ROE、利润率、EPS或资产负债表余额。负资本开支差值须核查修订。'});
 }
 const quarterGroups=new Map();
 for(const row of [...financial.filter(row=>row.kind==='quarter'||row.kind==='cumulative'&&days(row.start,row.end)<=110),...derivedQuarters]){
  const key=row.start+'/'+row.end;if(!quarterGroups.has(key))quarterGroups.set(key,[]);quarterGroups.get(key).push(row);
 }
 const quarters=[...quarterGroups.values()].map(rows=>{
  const ambiguous=rows.some(row=>row.status==='conflict')||numbers.filter(key=>key!=='roe').some(key=>{
   const values=rows.map(row=>row[key]).filter(finite);return values.some(value=>Math.abs(value-values[0])>Math.max(1e-8,Math.abs(value)*1e-9));
  });
  return {...rows[0],sourceIds:[...new Set(rows.flatMap(row=>row.sourceIds))],comparisonBlocked:ambiguous};
 });
 const quarterlyComparisons=quarters.map(row=>{
  const yoy=quarters.filter(p=>p.end<row.end&&Math.abs(days(p.start,p.end)-days(row.start,row.end))<=8&&days(p.end,row.end)>=351&&days(p.end,row.end)<=381);
  const qoq=quarters.filter(p=>Date.parse(p.end)+day===Date.parse(row.start));
  const comparison=matches=>!row.comparisonBlocked&&matches.length===1&&!matches[0].comparisonBlocked?compare(row,matches[0]):null;
  return {...row,yoy:comparison(yoy),qoq:comparison(qoq),notice:'仅比较可比季度；重复或冲突期间、缺少比较期时不计算变化。单季利润率按该季利润和收入重新计算。'};
 });
 const annuals=sorted.filter(row=>row.kind==='annual').slice(-5),roes=annuals.filter(row=>finite(row.roe)),values=roes.map(row=>row.roe).sort((a,b)=>a-b),mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 if(annuals.some((row,index)=>index>0&&row.start<=annuals[index-1].end))fail('年度期间重叠，须先核对财政年度变更与修订');
 const first=annuals[0],last=annuals.at(-1),years=first&&last?(Date.parse(last.end)-Date.parse(first.end))/day/365.2425:0;
 const fiscalYears=annuals.map(row=>Number(row.end.slice(0,4))),missingYears=[];
 if(last)for(let year=Number(last.end.slice(0,4))-4;year<=Number(last.end.slice(0,4));year++)if(!fiscalYears.includes(year))missingYears.push(year);
 const trend={observedAnnualPeriods:annuals.map(row=>({start:row.start,end:row.end,sourceIds:row.sourceIds})),missingFiscalEndYears:missingYears,
  cagr:Object.fromEntries(['revenue','netIncome','ocf'].map(key=>[key,{value:years>0&&first[key]>0&&last[key]>0?(last[key]/first[key])**(1/years)-1:null,years,notice:'按实际起止年度年化；基数或终值非正、单一年份时不计算。'}])),
  roe:{basis:roeBasis,count:values.length,mean,median:values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:null,
   populationStdDev:values.length?Math.sqrt(values.reduce((sum,value)=>sum+(value-mean)**2,0)/values.length):null,sourceIds:[...new Set(roes.flatMap(row=>row.sourceIds))],
   notice:'最近五份年度中的可用ROE历史统计；缺失不补零，不构成正常化ROE。敏感性仍须按市赚率工具的质量与口径门槛单独计算。'}};
 const stockDates=new Set();
 for(const row of balances){validate(row,stockNumbers);if(!date(row.date)||stockDates.has(row.date))fail('余额日期无效或重复，须先解决口径和修订');stockDates.add(row.date);}
 const stock=[...balances].sort((a,b)=>a.date.localeCompare(b.date)).map((row,index,rows)=>{
  const previous=rows[index-1],yoy=previous&&Number(row.date.slice(0,4))===Number(previous.date.slice(0,4))+1&&row.date.slice(4)===previous.date.slice(4);
  return {...row,liabilitiesToAssets:row.assets>0&&finite(row.liabilities)?row.liabilities/row.assets:null,currentRatio:industrial&&row.currentLiabilities>0&&finite(row.currentAssets)?row.currentAssets/row.currentLiabilities:null,
   unrestrictedCashToShortDebt:industrial&&row.shortDebt>0&&finite(row.unrestrictedCash)?row.unrestrictedCash/row.shortDebt:null,
   comparison:previous?{date:previous.date,label:yoy?'同比':`较${previous.date}`,sourceIds:previous.sourceIds,metrics:Object.fromEntries(stockNumbers.map(key=>[key,change(row[key],previous[key])]))}:null};
 });
 const workingCapital=financial.map(row=>{
  const openingDate=new Date(Date.parse(row.start)-day).toISOString().slice(0,10),opening=stock.find(item=>item.date===openingDate),closing=stock.find(item=>item.date===row.end);
  const average=field=>industrial&&finite(opening?.[field])&&opening[field]>=0&&finite(closing?.[field])&&closing[field]>=0?(opening[field]+closing[field])/2:null;
  const averageInventory=average('inventory'),averageReceivables=average('receivables'),periodDays=days(row.start,row.end);
  return {start:row.start,end:row.end,openingDate,periodDays,averageInventory,averageReceivables,
   inventoryDays:finite(averageInventory)&&row.costOfRevenue>0?averageInventory/row.costOfRevenue*periodDays:null,
   receivablesDays:finite(averageReceivables)&&row.revenue>0?averageReceivables/row.revenue*periodDays:null,
   sourceIds:[...new Set([...row.sourceIds,...(opening?.sourceIds??[]),...(closing?.sourceIds??[])])],
   formula:'存货天数=(期初存货+期末存货)/2÷本期营业成本×本期实际天数；应收天数=(期初应收+期末应收)/2÷本期收入×本期实际天数。',
   notice:industrial?'期初须为期间首日前一日，期末须为报告期末；缺少匹配余额或正分母时保留null。使用实际天数，不再年化；应收范围、成本范围须统一，与公司披露口径不同需解释。':'金融企业不适用此工业企业营运资金周转公式。'};
 });
 const result={sector,amountUnit,currency:basis?.currency,shareBasis:basis?.shareBasis,financial,derivedQuarters,quarterlyComparisons,conflicts,trend,balances:stock,workingCapital,
  cashFlowApplicability:industrial?'仅作为非金融企业现金流代理，待核对':'金融企业不适用工业企业OCF-Capex、现金利润比、流动比率及短债现金覆盖；相应结果保留null，需资本、承保或信贷质量证据。',
  limitations:['计算仅验证运算与输入格式，财务数字和统一口径仍须逐项回到原文核实。','Quick FCF = 经营现金流 − 购建长期资产支出，只是现金流代理，不等于FCFF、FCFE或可分配现金。','年度与半年流量不可直接比较改善幅度；余额较年末变化与收入同比不可冒充同口径趋势。','合同负债上升、资本开支或存货变动只构成待验证线索，不能直接推断订单质量、扩张用途或因果关系。']};
 finiteResults(result);return result;
}
