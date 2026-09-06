// Executable projection of knowledge/CORE.md and knowledge/FULL.md.
// Source chapter bindings are checked at server startup; business rules live in those Skills.
export const frameworkVersion='4.1';
export const contractVersion=2;
export const knowledgeSources=[
 {id:'core',path:'knowledge/CORE.md',role:'核心执行规则'},
 {id:'full',path:'knowledge/FULL.md',role:'完整研究与计算协议'},
];
export const principles=[
 {id:'quality',title:'先理解公司，再讨论价格',description:'把业务、护城河和战略，放回财务与现金流中验证。',source:'CORE 3 / FULL 4–5'},
 {id:'evidence',title:'每个判断，都能回到证据',description:'保留资料时点、来源与缺口，区分事实、解释和假设。',source:'CORE 2 / FULL 3'},
 {id:'valuation',title:'看估值区间，也看假设',description:'按行业选择方法，比较情景与敏感性，不用一个价格代替分析。',source:'CORE 6 / FULL 7'},
 {id:'falsification',title:'知道何时需要改变判断',description:'每份正式研究给出置信度与至少三条证伪条件，更新时对照旧结论。',source:'CORE 8、11 / FULL 9、13–14'},
];
export const scoring=[
 {id:'quality',label:'公司质量',max:25},{id:'growth',label:'成长与战略',max:15},
 {id:'financial',label:'财务质量',max:25},{id:'valuation',label:'估值与安全边际',max:20},
 {id:'returns',label:'股东回报',max:5},{id:'risk',label:'风险',max:10},
];
export const portfolioFields=[
 {id:'holdings',label:'当前持仓',placeholder:'公司、市场及持有情况'},
 {id:'weights',label:'持仓权重',placeholder:'各标的权重与现金占比'},
 {id:'assetRange',label:'可投资资产范围',placeholder:'可投资金额或资产范围'},
 {id:'riskTolerance',label:'风险承受能力',placeholder:'可承受回撤与投资期限'},
 {id:'industryExposure',label:'行业集中情况',placeholder:'行业分布及集中度限制'},
 {id:'liquidityNeeds',label:'流动性需求',placeholder:'资金使用时间与现金需求'},
];
export const researchActions=['淘汰','观察','深度研究','建仓候选','持有候选','减仓候选','退出候选'];
export const confidenceLevels=['高','中高','中','中低','低'];
export const modes={
 A:{name:'快速初筛',description:'发现值得深入的公司',question:'这家公司值得继续研究吗？',goal:'先做质量与风险筛选，把研究时间留给值得验证的公司。',example:'快速筛选贵州茅台是否值得进一步研究',defaultDepth:'Quick',modules:['商业模式','财务快扫','估值快扫','审计'],coreChapters:[1,2,3,4,6,8,12,13],fullChapters:[1,3,4,5,7,9,15,16],actions:['淘汰','观察池','深度研究']},
 B:{name:'深度研究',description:'验证长期投资逻辑',question:'长期价值由什么支撑？',goal:'连接业务、财务、现金回报和估值，形成可证伪的长期判断。',example:'深度研究贵州茅台的长期价值，验证现金流与股东回报',defaultDepth:'Standard',modules:['基本面','财务质量','股东回报','估值交叉验证','决策','审计'],coreChapters:[1,2,3,4,5,6,7,8,9,12,13],fullChapters:[1,3,4,5,6,7,8,9,10,11,15,16],actions:researchActions},
 C:{name:'财报更新',description:'追踪新披露与变化',question:'新证据改变了哪些判断？',goal:'将新披露与旧结论对照，区分经营变化、参数变化与价格变化。',example:'更新贵州茅台的最新财报，检查原有现金流判断是否改变',defaultDepth:'Standard',modules:['新旧证据对照','参数变更','逻辑变化','审计'],coreChapters:[1,2,4,8,11,12,13],fullChapters:[1,3,5,9,13,14,15,16],actions:['升级','维持','降级','剔除']},
 D:{name:'标的对比',description:'用统一口径比较公司',question:'哪些公司更值得深入研究？',goal:'先统一期间、币种与估值口径，再比较质量、股东回报和风险。',example:'对比腾讯与苹果的现金回报、财务质量与估值',defaultDepth:'Standard',modules:['口径统一','同业比较','估值排序','审计'],coreChapters:[1,2,3,4,5,6,8,12,13],fullChapters:[1,3,4,5,6,7,9,15,16],actions:researchActions},
 E:{name:'组合分析',description:'审视配置与集中风险',question:'持仓背后的风险集中在哪里？',goal:'把组合视作一家虚拟集团，检视现金创造能力与集中风险。',example:'分析我的持仓组合，检查行业集中与现金回报',defaultDepth:'Standard',modules:['组合上下文','集中度','风险约束','审计'],coreChapters:[1,2,8,10,12,13],fullChapters:[1,3,9,12,15,16],actions:researchActions},
 F:{name:'股东回报',description:'关注分红与现金质量',question:'企业能持续把现金回报股东吗？',goal:'检视八年历史、三年滚动与资本配置，区分收益率锚和企业价值。',example:'研究贵州茅台近八年的分红与可持续股东回报',defaultDepth:'Standard',modules:['八年分红','三年滚动','可分配现金','收益率锚','主估值交叉验证','审计'],coreChapters:[1,2,4,5,6,7,8,12,13],fullChapters:[1,3,5,6,7,8,9,15,16],actions:researchActions},
};
export const researchStages=[
 {id:'task',label:'明确问题',engines:['Router'],description:'确定主任务、辅助模块与交付范围。'},
 {id:'evidence',label:'采集证据',engines:['Data Layer'],description:'建立官方披露、行情时点和资料缺口。'},
 {id:'research',label:'分析查证',engines:['Fundamental','Financial','Shareholder Return'],description:'按任务检视业务、财务与可持续现金回报。'},
 {id:'calculation',label:'工具计算',engines:['Valuation','Risk Pricing'],description:'按需选择行业模型，检查假设、情景与重复折价。'},
 {id:'review',label:'复核交付',engines:['Decision','Portfolio','Output','Audit'],description:'复核研究动作、置信度、证伪条件和模式输出。'},
];
const section=(id,title)=>({id,title});
const schemas={
 Quick:[section('business','一句话商业模式'),section('advantages','三个优势'),section('risks','三个风险'),section('financial','关键财务趋势'),section('valuation','估值快照与适用性')],
 Standard:[section('business','公司一句话、核心业务与行业'),section('moat','护城河与定价权'),section('financial','财务质量'),section('returns','股东回报'),section('valuation','估值区间与交叉验证'),section('risks','核心风险')],
 Deep:[section('business','公司一句话与业务产品'),section('industry','行业与竞争'),section('moat','护城河与定价权'),section('strategy','战略与管理层'),section('financial','财务质量'),section('redFlags','财务红旗'),section('returns','股东回报'),section('valuation','估值方法与三情景'),section('margin','安全边际与敏感性'),section('scores','100分研究仪表盘'),section('risks','风险与反证')],
 Update:[section('changes','本期变化与新旧指标'),section('thesis','投资逻辑变化'),section('parameters','旧假设 → 新假设 → 新证据 → 区间影响'),section('action','股票池动作与后续跟踪')],
 Comparison:[section('basis','统一口径与可比边界'),section('comparison','质量、财务、回报与风险对比'),section('valuation','估值适配与同组排序'),section('candidates','候选理由与反证')],
 Portfolio:[section('context','组合信息与分析范围'),section('business','虚拟集团的经营与现金回报'),section('concentration','行业、单股与风险因子集中'),section('constraints','风险约束与流动性'),section('actions','组合观察与条件动作')],
 Dividend:[section('snapshot','最新数据快照与口径'),section('history','八年盈利、分红与回购'),section('rolling','最新年度与三年滚动'),section('policy','分红承诺与资本配置'),section('coverage','现金覆盖、可持续性与专项评分'),section('yield','TTM股息率、可持续股息率与收益率锚'),section('sensitivity','现金回报敏感性'),section('valuation','主估值与市赚率适用性及交叉验证')],
};
export function resolveMode(input={}){
 if(input.mode&&input.mode!=='auto'&&modes[input.mode])return input.mode;
 const q=input.question||'';
 if(/我的持仓|持仓分析|分析.*持仓|组合|加仓|减仓/.test(q))return 'E';
 if(/财报更新|最新财报|更新.*判断|更新.*财报|与上次|对照.*上次/.test(q))return 'C';
 if(/初筛|快速|值不值得研究|股票池|成分股.*筛选/.test(q))return 'A';
 if(/对比|比较|选哪/.test(q))return 'D';
 if(/深度|详细分析|完整.*报告|长期.*价值|投资价值/.test(q))return 'B';
 if(/股息|分红|股东回报|收益率/.test(q))return 'F';
 return 'B';
}
export function portfolioReadiness(context={}){
 const missing=portfolioFields.filter(field=>typeof context?.[field.id]!=='string'||!context[field.id].trim()).map(field=>field.label);
 return {complete:!missing.length,missing};
}
export function outputContract(mode,depth){
 const schema=({A:'Quick',C:'Update',D:'Comparison',E:'Portfolio',F:'Dividend'})[mode]||(depth==='Deep'?'Deep':depth==='Quick'?'Quick':'Standard');
 return {schema,sections:schemas[schema].map(item=>({...item})),actions:[...(schema==='Quick'?modes.A.actions:modes[mode].actions)],minFalsifiers:3,confidenceLevels:[...confidenceLevels]};
}
export function createResearchPlan(input={},mode=resolveMode(input)){
 if(!modes[mode])throw new Error('研究模式无效');
 const profile=modes[mode],depth=mode==='A'?'Quick':input.depth||profile.defaultDepth;
 const portfolio=portfolioReadiness(input.portfolioContext);
 const baseline=Boolean(input.baselineJobId||input.previousResearch?.trim());
 const secondaryModules=[];
 if(['B','C','D'].includes(mode)&&/分红|股息|股东回报/.test(input.question||''))secondaryModules.push('股东回报必要模块');
 if(mode!=='E'&&portfolio.complete)secondaryModules.push('组合约束');
 return {version:frameworkVersion,contractVersion,mode,name:profile.name,goal:profile.goal,modules:[...profile.modules],secondaryModules,
 depth,historyYears:mode==='F'?8:input.historyYears??5,securities:input.securities??[],stages:researchStages,
 output:outputContract(mode,depth),portfolio,baseline:{provided:baseline,jobId:input.baselineJobId||null},
 requiredData:['行情与估值截止时点','官方披露与报告期','币种、股类与股本口径',...(mode==='F'?['八个完整年度与三年滚动现金回报']:[]),...(mode==='C'?['上次结论与估值假设']:[]),...(mode==='D'?['可比期间、币种与同组口径']:[])],
 deliverables:['研究报告','审计记录','证据来源','执行轨迹'],
 constraints:['只执行主任务与必要辅助模块','关键数据缺失须标记，降低置信度，不编造数值','任一标的缺少可读官方财报时停止研究','估值工具按需调用，市赚率与收益率锚不等于内在价值','正式交付必须有研究动作、置信度与至少三条证伪条件',
 ...(!portfolio.complete?['组合信息未齐：仅研究判断，不输出具体仓位']:[]),
 ...(mode==='C'&&!baseline?['尚未提供上次结论：仅建立本期基线，不编造变化或升级判断']:[]),
 ...(mode==='D'&&(input.securities?.length??0)<2?['当前不足两个标的，仅能说明比较框架与缺口']:[])],
 ruleBindings:{core:profile.coreChapters,full:profile.fullChapters}};
}
