// Presentation copy for the current collectors. Provider availability and source
// provenance come from each request; these descriptions do not certify coverage.
export const researchDataCopy = {
 title: '行情与研究资料',
 introduction: '根据问题识别公司和市场，研究时按任务获取行情、财务数据与相关披露。',
 footnote: '行情与财务数据按权限接入长桥、Tushare 等来源，结合官方披露与按需网页正文；行情可能延迟，实际覆盖见研究记录。',
 overview: '结合多源行情、财务数据与披露资料开展研究；行情可能延迟，来源与缺口以本次记录为准。',
 historyHelp: '按所选范围读取可得财务数据与披露资料',
 coverage: '支持 A 股、港股和美股，结合多源行情、数据商财务、官方披露与按需网页正文；具体来源、时点及缺口以本次研究记录为准。',
 collection: '按任务采集行情快照、数据商财务、官方披露与按需网页正文，保留提供方、报告期和读取范围；缺失项与旧资料分别标记。',
 stage: '汇集行情、数据商财务与披露证据，按需补充网页并记录时点与缺口。',
 handbook: '研究结合行情与数据商接口、官方披露、按需读取的网页正文及用户补充资料。具体覆盖取决于任务、配置、权限及当次可用性；不同来源的核实要求不同。',
};

export const researchDataSources = [
 {id:'quotes',title:'行情与股本',description:'适用标的在配置并获授权后优先使用长桥行情；A 股、港股可由东方财富和腾讯补充，美股可由 Yahoo Finance 和腾讯补充。'},
 {id:'financials',title:'结构化财务',description:'Tushare 按账户权限提供三市场的利润表、资产负债表和现金流量表，保留报告期、原始字段及缺失项。'},
 {id:'returns',title:'股东回报与历史估值',description:'A 股通过 Tushare 补充分红、回购、股本和历史估值；港股、美股通过长桥基本面补充相关资料，实际年限和采样以返回记录为准。'},
 {id:'filings',title:'官方披露与公告',description:'A 股读取巨潮定期报告及相关公告；港股结合港交所与巨潮；美股读取 SEC 申报正文、结构化财务事实和选定披露附件。'},
 {id:'web',title:'按缺口补充的网页正文',description:'启用并配置搜索后，先查已有资料，再按缺口定位并读取网页正文；Tavily、Brave 用于查找原文，搜索摘要不作为研究证据。'},
 {id:'materials',title:'用户补充资料',description:'上传的报告、表格、截图与文字笔记作为补充线索。文件由平台统一读取；原页关联和读取范围可回查，内容仍须与原始证据核对。'},
];

export const researchDataBoundaries = [
 ['核对时点','行情是最新可得快照，可能延迟，休市保留最近交易数据；旧快照与留存资料会标记，并保留原始时间。'],
 ['区分来源','数据商资料不等于官方原件，数值仍需核对币种、单位和报告期；披露目录不代表正文已经读取。'],
 ['查看缺口','缺少年份、权限受限、访问或解析失败会记录；接入成功不代表资料齐全，当前不自动展开指数成分或全市场筛选。'],
 ['区分读取与核实','图像读取与原页复读有范围限制；识别文字不能单独支持财务计算，未纳入复核的页码或资料会保留说明。'],
];
