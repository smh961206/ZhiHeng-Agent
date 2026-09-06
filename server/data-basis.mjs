import {requestedYears} from './shareholder-data.mjs';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
// These checks inventory returned evidence; they never assert that an API row
// has been reconciled to an original filing or that missing observations are zero.
export function checkDataBasis(security,{years=5,mode='B',financials={},shareholder={},valuations={},reportCoverage:reports,snapshot,sources=[],clock=Date.now}={}){
 const expected=requestedYears(years,clock),checks=[];
 const add=(id,status,detail)=>{
  if(mode==='A'&&['dividend-history','buyback-purpose','recent-eight-periods','valuation-history','broker-shareholder-history'].includes(id))return;
  checks.push({id,status,...detail});
 };
 if(security.market==='CN'){
  const required={income:['n_income_attr_p'],balancesheet:['total_hldr_eqy_exc_min_int'],cashflow:['n_cashflow_act','c_pay_acq_const_fiolta']};
  const contextFields={income:['revenue','total_revenue','n_income_attr_p','basic_eps','diluted_eps'],balancesheet:['total_assets','total_liab','total_hldr_eqy_exc_min_int','total_hldr_eqy_inc_min_int','money_cap','st_borr','lt_borr','bond_payable','minority_int','oth_eqt_tools'],cashflow:['n_cashflow_act','c_pay_acq_const_fiolta','c_pay_dist_dpcp_int_exp']};
  for(const [api,fields] of Object.entries(required)){
   const rows=financials.records?.[api]??[],missing=[],ambiguous=[];
   for(const year of expected){
    const annual=rows.filter(row=>row.end_date===`${year}1231`&&row.report_type==='1');
    if(!annual.some(row=>fields.every(field=>finite(row[field]))))missing.push(year);
    if(new Set(annual.map(row=>JSON.stringify(fields.map(field=>row[field])))).size>1)ambiguous.push(year);
   }
   const annualObservations=rows.filter(row=>expected.some(year=>row.end_date===`${year}1231`)&&row.report_type==='1').map(row=>({reportPeriod:row.end_date,announcedOn:row.f_ann_date||row.ann_date||null,reportType:row.report_type,
    values:Object.fromEntries(contextFields[api].map(field=>[field,finite(row[field])?row[field]:null]))}));
   add(api,missing.length?'missing':ambiguous.length?'needs-review':'observed',{expectedYears:expected,missingYears:missing,conflictingYears:ambiguous,fields,annualObservations,
    sourceIds:sources.filter(source=>source.api===api).map(source=>source.id),currency:null,amountUnit:null,
    notice:'仅检查该数据商合并年报的核心字段；不把修订前、母公司或单季表混入。已观察到字段不代表口径已经核验。c_pay_dist_dpcp_int_exp包含分配股利、利润或偿付利息的现金，不能直接当作普通股现金分红。'});
  }
  const opening=`${expected[0]-1}1231`,openingRows=financials.records?.balancesheet??[];
  add('opening-equity',openingRows.some(row=>row.end_date===opening&&row.report_type==='1'&&finite(row.total_hldr_eqy_exc_min_int))?'observed':'missing',
   {period:opening,notice:'计算首年平均权益ROE需有上年末权益；优先股、其他权益工具及归母普通股口径仍需核对。'});
  const rows=financials.records?.balancesheet??[];
  const conflicts=rows.filter(row=>[row.total_assets,row.total_liab,row.total_hldr_eqy_inc_min_int].every(finite)&&Math.abs(row.total_assets-row.total_liab-row.total_hldr_eqy_inc_min_int)>Math.max(1,Math.abs(row.total_assets)*.00001));
  const checkedRows=rows.filter(row=>[row.total_assets,row.total_liab,row.total_hldr_eqy_inc_min_int].every(finite)).length;
  add('balance-identity',!checkedRows?'missing':conflicts.length?'needs-review':'observed',{conflictingPeriods:[...new Set(conflicts.map(row=>row.end_date))],checkedRows,
   notice:'资产≈负债＋含少数股东权益只检查数值一致性；字段缺失时不作通过结论。'});
 }else add('annual-financials','needs-review',{notice:'港美股财政年度、单季/累计、币种及每股/ADR关系须按原文核对；不会用自然年直接拼接八年序列。'});
 const dividend=shareholder.coverage?.find(item=>item.api==='dividend');
 add('dividend-history',!dividend||dividend.status==='failed'||dividend.limited?'missing':dividend.years?.some(item=>item.status!=='observed')?'needs-review':'observed',
  {years:dividend?.years??expected.map(year=>({year,status:'missing'})),notice:'只检查分红记录覆盖，不把无记录当作不分红；已支付、所属盈利年度、特别分红与税前/税后口径分开。'});
 const buyback=shareholder.coverage?.find(item=>item.api==='repurchase');
 add('buyback-purpose','needs-review',{observedRecords:buyback?.rows??0,unresolvedRanges:buyback?.unresolvedRanges??[],notice:'回购计划、累计实施、注销与员工激励必须回到公告核对；未自动计算总回购现金。'});
 const shares=shareholder.coverage?.find(item=>item.api==='daily_basic');
 add('share-capital',shares?.limited?'needs-review':shares?.rows||snapshot?.shareCapital?.totalShares?'observed':'missing',{historyObservations:shares?.rows??0,latestHistoryDate:shares?.lastDate??null,
  latestBrokerSnapshot:snapshot?.shareCapital??null,notice:'万股已明确转换为股；总股本、流通股本与稀释加权平均股本不互换，股本快照变化不证明变动原因。'});
 add('currency-period-share-basis','needs-review',{quoteCurrency:snapshot?.currency??null,financialCurrency:null,
  notice:'财报币种、金额单位、期间、普通股权益、股类及ADR比例须引用官方披露核对；FY/TTM/正常化及税前/税后不可混用。'});
 const periods=reports?.readPeriodCoverage;
 if(mode==='A')add('recent-report-periods',periods?.recentPeriods?.length?'needs-review':'missing',{periods:periods?.recentPeriods??[],notice:'快速筛选检视最新累计期间、同口径比较期及可推导单季；八季度完整回报历史不是本模式前置门槛。目录有报告期不等于财务字段已读取。'});
 add('official-annual-text',!periods||!reports.fullTextRead?'missing':periods.missingAnnualYears.length?'missing':reports.stale?'needs-review':'observed',
  {fullTextRead:reports?.fullTextRead??0,coreFactsRead:reports?.coreFactsRead??0,missingYears:periods?.missingAnnualYears??expected,notice:'按已成功读取正文检查年报覆盖；XBRL可补财务事实，不能替代完整附注和经营叙述。'});
 add('recent-eight-periods',periods?.recentEightPeriodsObserved?'observed':'needs-review',{periods:periods?.recentPeriods??[],notice:'以报告期检查近期连续性；未披露季度保持不可得，不把八份跨多年年报当作八季度。'});
 add('valuation-history',!valuations.sources?.length?'missing':valuations.coverage?.some(item=>item.limited||item.stale)||valuations.windows?.some(item=>item.shortHistory)?'needs-review':'observed',
  {windows:valuations.windows??[],notice:'历史比率和分位必须使用同一截止日、同一字段口径；数据商历史修订与缺失交易日仍需核对。'});
 const stale=sources.filter(source=>source.stale);
 add('source-freshness',stale.length?'needs-review':'observed',{staleSources:stale.map(source=>({sourceId:source.id,fetchedAt:source.fetchedAt,date:source.date})),notice:'归档来源保留原抓取及披露日期；未声明过期不等于已经证明来源及时或享有SLA。'});
 if(shareholder.brokerCoverage?.length)add('broker-shareholder-history','needs-review',{tables:shareholder.brokerCoverage,notice:'长桥返回的分红、净回购和公司行动保留原始窗口；有记录不等于八年完整或分类正确，须对照官方公告辨别普通现金/特别或实物分派及实际注销。'});
 return {security:`${security.market}:${security.symbol}`,status:'requires-review',expectedYears:expected,checks,
  sourceIds:sources.filter(source=>!['filing-index','data-check'].includes(source.type)).map(source=>source.id),
  notice:'自动覆盖与一致性检查，不是财务审计或已核实声明；官方原文及政策、用途的核对仍须有证据。'};
}
