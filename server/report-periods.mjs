export function reportPeriod(report){
 if(report.reportDate&&/^\d{4}-\d{2}-\d{2}$/.test(report.reportDate))return report.reportDate;
 const year=report.title.match(/20\d{2}/)?.[0];if(!year)return null;
 const title=report.title;
 if(report.annual)return `${year}-12-31`;
 if(/第一季|一季|first quarter|1st quarter|Q1/i.test(title))return `${year}-03-31`;
 if(/半年度|中期|第二季|二季|interim|half.year|second quarter|Q2|six months/i.test(title))return `${year}-06-30`;
 if(/第三季|三季|third quarter|3rd quarter|Q3|nine months/i.test(title))return `${year}-09-30`;
 if(/three months/i.test(title)){
  if(/march/i.test(title))return `${year}-03-31`;
  if(/june/i.test(title))return `${year}-06-30`;
  if(/september/i.test(title))return `${year}-09-30`;
 }
 if(/第四季|全年|年度业绩|年度業績|fourth quarter|annual results|year ended|Q4/i.test(title))return `${year}-12-31`;
 return null;
}
export function reportCoverage(reports,{years=5,market,clock=Date.now,expectedAnnualYears}={}){
 const annuals=[...new Set(reports.filter(report=>report.annual).map(report=>Number(reportPeriod(report)?.slice(0,4))).filter(Number.isFinite))].sort((a,b)=>a-b);
 const anchor=market==='US'?annuals.at(-1):new Date(clock()).getUTCFullYear()-1;
 const expected=expectedAnnualYears??(Number.isFinite(anchor)?Array.from({length:years},(_,i)=>anchor-years+1+i):[]);
 const periods=[...new Set(reports.map(reportPeriod).filter(Boolean))].sort();
 const recent=periods.slice(-8),consecutive=recent.length===8&&recent.slice(1).every((date,i)=>(Date.parse(date)-Date.parse(recent[i]))/86400000<=130);
 return {expectedAnnualYears:expected,observedAnnualYears:annuals,missingAnnualYears:expected.filter(year=>!annuals.includes(year)),recentPeriods:recent,
  recentEightPeriodsObserved:consecutive,periodBasis:market==='US'?'SEC所披露财政报告期；最近已取得年报及以前年度':'标题报告期推定，港股非12月年结须回原件核对',
  notice:'目录覆盖不是正文阅读或数值完整性证明；未披露季度不能补造，八个报告期不自动等于八个连续自然季度'};
}
export function chooseReports(reports,years,mode){
 const sorted=[...new Map(reports.map(report=>[report.url,report])).values()].sort((a,b)=>b.date.localeCompare(a.date));
 const annuals=sorted.filter(report=>report.annual),chosen=[],seenYears=new Set(),periods=new Set();
 const anchor=Math.max(...annuals.map(report=>Number(reportPeriod(report)?.slice(0,4))).filter(Number.isFinite));
 for(const report of annuals){
  const year=Number(reportPeriod(report)?.slice(0,4));
  if(Number.isFinite(year)&&year>anchor-(mode==='A'?5:years)&&!seenYears.has(year)){chosen.push(report);seenYears.add(year);}
 }
 const newest=sorted.map(reportPeriod).filter(Boolean).sort().at(-1),recentCutoff=Date.parse(newest||'')-2*366*86400000;
 for(const report of sorted){
  const period=reportPeriod(report);if(!period||periods.has(period)||Date.parse(period)<recentCutoff)continue;
  chosen.push(report);periods.add(period);if(periods.size>=(mode==='A'?3:8))break;
 }
 // Unknown titles stay visible as the latest disclosure, without inventing a period.
 return [...new Map([...sorted.slice(0,mode==='A'?2:1),...chosen].map(report=>[report.url,report])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}
