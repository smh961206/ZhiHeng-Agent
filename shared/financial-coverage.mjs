// Calculation input coverage is separate from filing inventory and verification.
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const fields=['revenue','netIncome','ocf','capex'];
export function financialCoverage({financial=[],quarterlyComparisons=[],balances=[],sector}={}){
 const annuals=financial.filter(r=>r.kind==='annual').sort((a,b)=>a.end.localeCompare(b.end));
 const latestAnnual=annuals.at(-1),latestPeriod=[...financial].sort((a,b)=>a.end.localeCompare(b.end)).at(-1);
 const annualFields=sector==='non-financial'?[...fields,'roe']:['revenue','netIncome','roe'];
 const quarterFields=sector==='non-financial'?['revenue','netIncome','ocf']:['revenue','netIncome'];
 const describe=(label,rows,required)=>({period:label,sourceIds:[...new Set(rows.flatMap(r=>r.sourceIds??[]))],
  missingFields:required.filter(f=>rows.length!==1||!finite(rows[0][f])),conflict:rows.length>1||rows.some(r=>r.comparisonBlocked),
  derived:rows.some(r=>r.status==='derived-needs-review'||r.status==='conflict')});
 const annual=[];
 if(latestAnnual)for(let year=Number(latestAnnual.end.slice(0,4))-4;year<=Number(latestAnnual.end.slice(0,4));year++)annual.push(describe(String(year),annuals.filter(r=>Number(r.end.slice(0,4))===year),annualFields));
 const quarters=[];
 if(latestPeriod){
  const d=new Date(latestPeriod.end+'T00:00:00Z');
  let end=Date.UTC(d.getUTCFullYear(),Math.ceil((d.getUTCMonth()+1)/3)*3,0);
  if(end>Date.parse(latestPeriod.end))end=Date.UTC(d.getUTCFullYear(),Math.floor(d.getUTCMonth()/3)*3,0);
  for(let i=0;i<8;i++){
   const current=new Date(end),start=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()-2,1)).toISOString().slice(0,10),finish=current.toISOString().slice(0,10);
   quarters.unshift(describe(`${finish.slice(0,4)} Q${Math.ceil(Number(finish.slice(5,7))/3)}`,quarterlyComparisons.filter(r=>r.start===start&&r.end===finish),quarterFields));
   end=Date.parse(start)-86400000;
  }
 }
 const group=(rows,target,required)=>({target,observed:rows.filter(r=>r.sourceIds.length).length,complete:rows.filter(r=>!r.conflict&&!r.missingFields.length).length,requiredFields:required,periods:rows});
 const annualCoverage=group(annual,5,annualFields),quarterCoverage=group(quarters,8,quarterFields);
 return {status:annualCoverage.complete===5&&quarterCoverage.complete===8?'inputs-covered-needs-review':'partial',
  anchor:{annualEnd:latestAnnual?.end??null,latestPeriodEnd:latestPeriod?.end??null},annual:annualCoverage,quarters:quarterCoverage,
  balanceMissing:balances.flatMap(row=>['inventory','receivables','cash','shortDebt'].filter(f=>!finite(row[f])).map(field=>({date:row.date,field}))),
  notice:'仅统计本次计算输入，以最晚输入期间为锚；不证明最新披露已齐全或数字已核实。非金融年度核心为收入、归母利润、经营现金流、资本开支及ROE，季度核心为收入、归母利润及经营现金流；单季资本开支缺失时不能计算该季Quick FCF。季度按自然季度核对，非自然财政季度须另行说明。财报文件数不等于数值覆盖；同日期余额缺失不能由累计流量比较列补齐。'};
}
export function recordedFinancialCoverage(records=[]){
 return records.filter(r=>r.toolName==='calculate_screen_metrics'&&!r.result?.error&&r.result?.coverage).map(r=>({toolCallId:r.toolCallId,coverage:r.result.coverage}));
}
export const coverageFieldLabels={revenue:'收入',netIncome:'归母利润',ocf:'经营现金流',capex:'资本开支',roe:'ROE',inventory:'存货',receivables:'应收',cash:'现金',shortDebt:'短债'};
