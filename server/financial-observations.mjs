import {validFactDate} from './inline-xbrl.mjs';
const wanted=new Set(['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','Revenues','Revenue','SalesRevenueNet','OperatingIncomeLoss','GrossProfit','Assets','Liabilities','Equity','NetIncomeLoss','ProfitLoss','StockholdersEquity','EquityAttributableToOwnersOfParent','CashAndCashEquivalentsAtCarryingValue','NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities','PaymentsToAcquirePropertyPlantAndEquipment','PurchaseOfPropertyPlantAndEquipment','WeightedAverageNumberOfDilutedSharesOutstanding','WeightedAverageNumberOfSharesOutstandingBasic','WeightedAverageNumberOfOrdinarySharesOutstandingDiluted','CommonStockSharesOutstanding','EntityCommonStockSharesOutstanding','PaymentsOfDividends','DividendsPaid','PaymentsForRepurchaseOfCommonStock','ShareBasedCompensation','LongTermDebtCurrent','LongTermDebtNoncurrent','LongTermDebt','ShortTermBorrowings','PreferredStockValue','PreferredStockSharesOutstanding']);
export const coreFactGroups={revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','RevenueFromContractWithCustomerIncludingAssessedTax','Revenues','Revenue','SalesRevenueNet'],profit:['NetIncomeLoss','ProfitLoss'],equity:['StockholdersEquity','EquityAttributableToOwnersOfParent','Equity'],operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities','CashFlowsFromUsedInOperatingActivities'],capex:['PaymentsToAcquirePropertyPlantAndEquipment','PurchaseOfPropertyPlantAndEquipment'],dilutedShares:['WeightedAverageNumberOfDilutedSharesOutstanding','WeightedAverageNumberOfOrdinarySharesOutstandingDiluted']};
export function factCoverage(facts){
 const accepted=facts.filter(f=>f.standardConcept!==false&&!(f.dimensions?.length)&&Number.isFinite(f.value));
 const tags=new Set(accepted.map(f=>f.tag.split(':').at(-1)));
 return Object.fromEntries(Object.entries(coreFactGroups).map(([key,aliases])=>[key,aliases.some(tag=>tags.has(tag))?'observed':'missing-standard-tag']));
}
export function xbrlObservations(sources){
 const rows=[],errors=[];
 for(const source of sources.filter(item=>item.type==='official-xbrl'||item.type==='official-report'&&item.official&&item.financialFacts?.length)){
  try{
   const start=source.text?.indexOf('\n[')??-1;if(!source.financialFacts&&start<0)continue;
   const facts=source.financialFacts||JSON.parse(source.text.slice(start+1));
   for(const fact of facts){
    if(fact.standardConcept===false||!wanted.has(fact.tag?.split(':').at(-1))||typeof fact.value!=='number'||!Number.isFinite(fact.value))continue;
    if(!validFactDate(fact.end)||fact.start&&(!validFactDate(fact.start)||fact.start>fact.end)){errors.push({sourceId:source.id,tag:fact.tag,reason:'实际起止期间无效'});continue;}
    const duration=fact.start?(Date.parse(fact.end)-Date.parse(fact.start))/86400000+1:null;
    rows.push({...fact,sourceId:source.id,security:source.security,filingUrl:fact.filingUrl||source.filingUrl||source.url,filed:fact.filed||source.date,
     scope:fact.dimensions?.length?'dimensioned':'entity-wide',periodType:duration===null?'instant':duration>=330&&duration<=380?'annual':duration>=70&&duration<=110?'quarter':'cumulative-or-other',durationDays:duration,
     currency:/^[A-Z]{3}$/.test(fact.unit)?fact.unit:null,unitMultiplier:1,unitBasis:'XBRL API实际值或已按inline scale转换一次的实际值，不再次乘展示倍数'});
   }
  }catch{errors.push({sourceId:source.id,reason:'XBRL事实结构未能解析'});}
 }
 // Keep amendments and comparisons, expose conflicts, and never add YTD and QTD.
 const groups=new Map();
 for(const row of rows){const key=JSON.stringify([row.security||row.entity||row.sourceId,row.tag,row.unit,row.start||'',row.end,row.dimensions||[]]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const observations=[...groups.values()].map(items=>{
  const latest=[...items].sort((a,b)=>(b.filed||'').localeCompare(a.filed||''))[0];
  const sameDate=items.filter(item=>item.filed===latest.filed),conflict=new Set(sameDate.map(item=>item.value)).size>1;
  return {...latest,...(conflict?{value:null,needsReview:true}:{}),sourceIds:[...new Set(items.map(item=>item.sourceId))],revisedValues:[...new Set(items.map(item=>item.value))],hasRevision:new Set(items.map(item=>item.value)).size>1,hasConflict:conflict};
 });
 return {observations,errors,coverage:factCoverage(observations),notice:'保留标准标签、实体、维度、币种、实际单位与起止日；同一实际期间保留修订，同日冲突不择一；缺少标准标签不代表没有披露。覆盖只代表观察到字段，未核验普通股/ADR或正常化，不自动计算ROE、TTM或内在价值。'};
}
