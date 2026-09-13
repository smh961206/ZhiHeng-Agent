import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const path=fileURLToPath(new URL('../knowledge/modules.json',import.meta.url));
const catalog=JSON.parse(readFileSync(path,'utf8'));
const modes=['A','B','C','D','E','F'];
const definitions=[
 ['KNW-EVD-001','constitution','03-data','3.1 数据来源优先级','critical',['evidence'],['ONT-PERIOD-FY']],
 ['KNW-EVD-002','constitution','03-data','3.2 正式研究的数据快照','critical',['evidence'],['ONT-PERIOD-FY']],
 ['KNW-BAS-001','constitution','03-data','3.3 口径锁定','critical',['basis'],['ONT-CURRENCY-ISO','ONT-SHARE-DILUTED','ONT-SCOPE-CONSOLIDATED']],
 ['KNW-MIS-001','constitution','03-data','3.4 缺失数据处理','critical',['missing-data'],[]],
 ['KNW-VAL-001','constitution','07-valuation','7.1 先选模型，再算价格','critical',['valuation'],['ONT-VAL-EV','ONT-VAL-EQUITY']],
 ['KNW-RSK-001','constitution','08-risk-pricing','8.1 一项风险只设一个“主要定价位置”','high',['risk'],[]],
 ['KNW-RSK-002','constitution','08-risk-pricing','8.2 禁止重复保守','high',['risk'],[]],
 ['KNW-AUD-001','constitution','16-audit','16.1 Data Audit','critical',['audit'],[]],
 ['KNW-FIN-001','methodology','05-financial','5.1 核心原则','high',['financial'],[]],
 ['KNW-PER-001','methodology','05-financial','5.3 利润表与现金流','critical',['period'],['ONT-PERIOD-FY','ONT-PERIOD-TTM','ONT-PERIOD-YTD','ONT-PERIOD-INSTANT']],
 ['KNW-FCF-001','methodology','05-financial','5.7 FCF 口径分层','critical',['cash-flow'],['ONT-METRIC-FCFF','ONT-METRIC-FCFE']],
 ['KNW-FCF-002','methodology','05-financial','金融企业','critical',['cash-flow'],['ONT-SECURITY-EQUITY']],
 ['KNW-NRM-001','methodology','05-financial','5.8 正常化利润 / 正常化现金流','high',['normalization'],['ONT-PERIOD-FY']],
 ['KNW-VAL-002','methodology','07-valuation','7.2 至少两种方法','high',['valuation'],['ONT-VAL-EV','ONT-VAL-EQUITY']],
 ['KNW-DCF-001','methodology','07-valuation','Step 1：选择现金流口径','critical',['valuation'],['ONT-METRIC-FCFF','ONT-METRIC-FCFE']],
 ['KNW-DCF-002','methodology','07-valuation','Step 6：EV → Equity Bridge','critical',['valuation'],['ONT-VAL-EV','ONT-VAL-EQUITY']],
 ['KNW-DCF-003','methodology','07-valuation','Step 7：每股价值','critical',['valuation'],['ONT-SHARE-DILUTED','ONT-VAL-EQUITY']],
 ['KNW-AUD-002','contract','16-audit','16.3 Cash Flow Audit','critical',['audit'],['ONT-METRIC-FCFF','ONT-METRIC-FCFE']],
 ['KNW-AUD-003','contract','16-audit','16.5 Valuation Audit','critical',['audit'],['ONT-VAL-EV','ONT-VAL-EQUITY']],
 ['KNW-AUD-004','contract','16-audit','16.6 Risk Double-count Audit','high',['audit'],[]],
 ['KNW-DEC-001','methodology','09-decision','9.1 四层证据链','critical',['decision'],[]],
 ['KNW-DEC-002','methodology','09-decision','9.3 Research Action 与 Portfolio Action 分离','high',['decision'],[]],
 ['KNW-DEC-003','methodology','09-decision','9.5 证伪条件','high',['decision'],[]],
 ['KNW-SHR-001','methodology','06-shareholder-return','6.5 可分配现金优先原则','high',['shareholder-return'],[]],
 ['KNW-CUR-001','contract','16-audit','16.1 Data Audit','critical',['currency'],['ONT-CURRENCY-ISO']],
 ['KNW-SCP-001','contract','16-audit','16.1 Data Audit','critical',['scope'],['ONT-SCOPE-CONSOLIDATED']],
];
const regressionByClaim={evidence:'KRG-EVIDENCE',basis:'KRG-BASIS','missing-data':'KRG-MISSING',valuation:'KRG-VALUATION',risk:'KRG-RISK',financial:'KRG-FINANCIAL',period:'KRG-PERIOD','cash-flow':'KRG-FCF',normalization:'KRG-NORMALIZATION',audit:'KRG-AUDIT',decision:'KRG-DECISION','shareholder-return':'KRG-SHAREHOLDER',currency:'KRG-CURRENCY',scope:'KRG-SCOPE'};
catalog.schemaVersion=3;catalog.knowledgeVersion='K1.0.0';delete catalog.version;delete catalog.baseVersion;
catalog.governance={
 constitution:definitions.filter(row=>row[1]==='constitution').map(row=>row[0]),
 ontology:[
  {id:'ONT-PERIOD-FY',type:'period',label:'FY',aliases:['fiscal year','财年','年度']},{id:'ONT-PERIOD-TTM',type:'period',label:'TTM',aliases:['trailing twelve months','过去十二个月']},{id:'ONT-PERIOD-YTD',type:'period',label:'YTD',aliases:['year to date','年初至今']},{id:'ONT-PERIOD-INSTANT',type:'period',label:'Instant',aliases:['point in time','时点']},
  {id:'ONT-CURRENCY-ISO',type:'currency-class',label:'ISO 4217 currency',aliases:[]},{id:'ONT-CURRENCY-CNY',type:'currency',label:'CNY',aliases:['RMB','人民币',{value:'元',condition:'CNY'}]},{id:'ONT-CURRENCY-HKD',type:'currency',label:'HKD',aliases:['港元',{value:'元',condition:'HKD'}]},{id:'ONT-CURRENCY-USD',type:'currency',label:'USD',aliases:['美元',{value:'元',condition:'USD'}]},
  {id:'ONT-METRIC-FCFF',type:'metric',label:'FCFF',aliases:['free cash flow to firm']},{id:'ONT-METRIC-FCFE',type:'metric',label:'FCFE',aliases:['free cash flow to equity']},
  {id:'ONT-SECURITY-EQUITY',type:'security',label:'Equity security',aliases:['ordinary share','普通股']},
  {id:'ONT-SHARE-DILUTED',type:'share-basis',label:'Diluted weighted-average shares',aliases:['diluted shares','稀释加权平均股本']},
  {id:'ONT-SCOPE-CONSOLIDATED',type:'accounting-scope',label:'Consolidated attributable scope',aliases:[{value:'归母',condition:'parent-attributable'}]},
  {id:'ONT-VAL-EV',type:'valuation-basis',label:'Enterprise Value',aliases:['EV','企业价值']},{id:'ONT-VAL-EQUITY',type:'valuation-basis',label:'Equity Value',aliases:['股权价值']},
 ],
 regressions:Object.entries(regressionByClaim).map(([claim,id])=>({id,claim,positive:`${claim} rule applies in declared scope`,negative:`${claim} rule does not infer missing facts`,crossDomain:'bank and commodity boundaries remain explicit'})),
 rules:definitions.map(([id,layer,moduleId,section,severity,claims,ontologyRefs],index)=>{
  const domain=id==='KNW-FCF-002'?{archetypes:['bank'],claims:['cash-flow']}:id==='KNW-NRM-001'?{archetypes:['commodity','cyclical'],claims:['normalization']}:{archetypes:['*'],claims:['*',...claims]};
  return {id,type:'rule',layer,moduleId,section,severity,rationale:'结构化映射既有规则，不改变原规则含义。',scope:{modes,...domain,methods:['*']},tests:uniq(claims.map(claim=>regressionByClaim[claim])),enforcement:index<8?'hybrid':ontologyRefs.length?'validator':'prompt',ontologyRefs,dependsOn:index>=8?['KNW-EVD-001','KNW-MIS-001']:[],conflictsWith:[],effectiveFrom:'2026-09-13T00:00:00.000Z',effectiveTo:null,jurisdiction:['global'],lastValidatedAt:'2026-09-13T00:00:00.000Z',needsReview:false,impact:{modes,archetypes:domain.archetypes.includes('*')?['general','bank','commodity']:domain.archetypes,claims,benchmarks:['V53-KNOWLEDGE']}};
 }),
};
function uniq(values){return [...new Set(values)];}
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
console.log(`已写入 ${catalog.governance.rules.length} 条规则、${catalog.governance.ontology.length} 个术语和 ${catalog.governance.regressions.length} 个回归。`);
