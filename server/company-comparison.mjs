import {quickScreenMetrics,screenToolProperties} from './quick-screen.mjs';
import {calculationBasis} from './calculations.mjs';
const s={type:'string'},n={type:['number','null']};
export const comparisonToolProperties={
 period:{type:'object',properties:{start:s,end:s,kind:{type:'string',enum:['annual','quarter','cumulative']}},required:['start','end','kind'],additionalProperties:false},
 companies:{type:'array',minItems:2,maxItems:3,items:{type:'object',properties:{security:s,group:s,...screenToolProperties,
  quote:{type:'object',properties:{asOf:s,currency:s,price:n,sourceIds:{type:'array',items:s}},required:['asOf','currency','price','sourceIds'],additionalProperties:false}},required:['security','group','sector','amountUnit','roeBasis','periods','balances'],additionalProperties:false}},
};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const keyOf=s=>s.market+':'+String(s.symbol).toUpperCase();
export function compareCompanies({period,companies},{sources=[],securities=[]}={}){
 if(!period||!validDate(period.start)||!validDate(period.end)||period.start>period.end||!['annual','quarter','cumulative'].includes(period.kind))throw new Error('比较期间须明确有效起止日和累计/单季分类');
 if(!Array.isArray(companies)||companies.length<2||companies.length>3)throw new Error('比较工具须提供2至3家公司');
 const keys=companies.map(row=>row?.security);
 if(keys.some(key=>typeof key!=='string'||! /^(CN|HK|US):[A-Z0-9.-]+$/.test(key))||new Set(keys).size!==keys.length)throw new Error('比较标的编号无效或重复');
 if(securities.length&&(securities.length!==keys.length||securities.some(s=>!keys.includes(keyOf(s)))))throw new Error('比较工具必须覆盖本次选择的全部证券');
 const results=companies.map(company=>{
  if(typeof company.group!=='string'||!company.group.trim())throw new Error('须为每家公司明确业务适配组');
  const basis=calculationBasis(company.basis,sources),evidence=sources.filter(source=>basis.sourceIds.includes(source.id));
  if(evidence.some(source=>source.security!==company.security))throw new Error('公司计算依据必须属于对应证券，不能串用或使用未标明证券的资料');
  const calculated=quickScreenMetrics({...company,basis},{sources});
  const current=calculated.financial.find(row=>row.start===period.start&&row.end===period.end&&row.kind===period.kind)??null;
  let quote=null;
  if(company.quote){
   const q=company.quote;
   if(!validDate(q.asOf)||typeof q.currency!=='string'||!q.currency.trim()||!finite(q.price)||q.price<=0||!Array.isArray(q.sourceIds)||!q.sourceIds.length)throw new Error('行情须记录有效交易日、币种、正价格与来源');
   if(q.sourceIds.some(id=>!basis.sourceIds.includes(id)||!sources.some(source=>source.id===id&&source.security===company.security&&source.type==='quote')))throw new Error('行情必须引用该证券在计算依据中的实际行情来源');
   if(q.currency!==basis.currency)throw new Error('比较工具不自动换汇，请统一该公司行情与财报币种或省略行情并说明缺口');
   for(const id of q.sourceIds){const actual=sources.find(source=>source.id===id);
    if(actual.currency&&actual.currency!==q.currency||actual.asOf&&String(actual.asOf).slice(0,10)!==q.asOf)throw new Error('行情声明的币种或时点与来源记录不一致');
   }
   quote={...q};
  }
  const roePeriods=calculated.trend.observedAnnualPeriods.filter(row=>company.periods.some(p=>p.start===row.start&&p.end===row.end&&finite(p.roe)));
  return {security:company.security,group:company.group,sector:company.sector,amountUnit:company.amountUnit,roeBasis:company.roeBasis,basis,quote,current,
   roe:{...calculated.trend.roe,periods:roePeriods},limitations:calculated.limitations};
 });
 const equal=fn=>new Set(results.map(fn)).size===1;
 const aligned=results.every(r=>r.current),group=equal(r=>r.group)&&equal(r=>r.sector),currency=equal(r=>r.basis.currency),unit=equal(r=>r.amountUnit);
 const checks=[
  {id:'period',comparable:aligned,reason:aligned?'每家公司都有指定起止日及分类的记录':'有公司缺少指定比较期，保留null，不以最近一期替代'},
  {id:'amounts',comparable:aligned&&group&&currency&&unit,reason:aligned&&group&&currency&&unit?'期间、适配组、币种及金额单位一致':'期间、适配组、币种或金额单位未统一，不直接比较金额大小'},
  {id:'ratios',comparable:aligned&&group,reason:aligned&&group?'同期间同适配组的比率可并列核对；仍需核查定义':'期间或适配组不同，比率不直接排名'},
  {id:'prices',comparable:results.every(r=>r.quote)&&equal(r=>r.quote?.asOf)&&equal(r=>r.quote?.currency),reason:'只检查行情时点与币种一致性；不同公司每股价格高低不代表估值贵便宜'},
  {id:'roeHistory',comparable:group&&equal(r=>r.roeBasis)&&results.every(r=>r.roe.count>=3)&&equal(r=>JSON.stringify(r.roe.periods.map(p=>[p.start,p.end]))),reason:'ROE稳定性比较至少需要三个相同完整年度、相同定义和适配组；历史统计不构成正常化ROE'},
 ];
 const metrics=['revenue','netIncome','adjustedNetIncome','ocf','quickFcf','grossMargin','netMargin','roe'];
 const matrix=metrics.map(metric=>({metric,values:results.map(r=>({security:r.security,value:r.current?.[metric]??null,sourceIds:r.current?.sourceIds??[],reason:r.current?.[metric]==null?'字段或比较期缺失':null})),
  comparable:checks.find(c=>c.id===(['grossMargin','netMargin','roe'].includes(metric)?'ratios':'amounts')).comparable&&results.every(r=>finite(r.current?.[metric]))&& (metric!=='roe'||equal(r=>r.roeBasis))}));
 return {period,companies:results,checks,matrix,
  basis:{sourceIds:[...new Set(results.flatMap(r=>r.basis.sourceIds))],evidenceBlocks:results.flatMap(r=>r.basis.evidenceBlocks??[])},
  notice:'逐家公司校验来源与运算，比较检查通过只表示输入口径一致，不证明财报数字、业务分组或投资价值已核实。缺值不填零，模型不适用项不参与排名；本工具不自动输出公司质量、估值或综合名次。'};
}
