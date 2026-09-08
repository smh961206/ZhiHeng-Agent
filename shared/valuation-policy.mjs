// Product and execution projection of CORE 6 / FULL 7. Historical reports are
// displayed as recorded; these checks apply only when producing a new report.
export const researchMethodology=[
 {id:'quality',title:'看懂公司',description:'从业务与竞争优势出发，用财务、现金流和股东回报验证。'},
 {id:'valuation',title:'核对价值',description:'按行业选主估值，说明情景、敏感性与方法分歧。'},
 {id:'research',title:'形成研究判断',description:'给出置信度、证据缺口，以及需要重审判断的条件。'},
 {id:'portfolio',title:'按约束讨论执行',description:'结合完整持仓与风险约束，再讨论组合动作和交易复盘。'},
];
export const valuationGuidance={
 A:'先核对估值快照与适用性，筛选结果决定是否继续研究。',
 B:'按业务选择主估值，完整展开时交叉验证情景与敏感性。',
 C:'区分经营变化、参数调整与股价变化；无旧结论时建立基线。',
 D:'统一期间与口径，分别说明各公司的估值适配和研究判断。',
 E:'先审视组合风险，研究状态与加减仓等执行动作分别判断。',
 F:'核对八年现金回报，收益率锚需与主估值交叉验证。',
};
export const valuationConstraints=[
 '按行业与数据选择主估值；缺少可靠依据时标记受限或不适用并说明原因',
 '同类倍数变式、同一现金流模型的不同口径或情景不算独立交叉验证',
 '股息收益率锚只解释现金回报条件，不能单独确立内在价值',
];
const normalized=value=>String(value).normalize('NFKC').toLowerCase().replace(/[\s_－–—]/g,'');
export function retiredValuationMethod(value){
 return /市赚率|p2|行业龙头锚|价格锚|阶段股票池|阶段筛选|专用修正系数|修正系数n|n修正系数/.test(normalized(value));
}
export function valuationFamily(value){
 const method=normalized(value);
 if(/收益率锚|股息率锚|yieldanchor/.test(method))return 'yield-anchor';
 if(/dcf|fcff|fcfe|现金流折现|自由现金流贴现|自由现金流折现/.test(method))return 'cash-flow';
 if(/ddm|股利折现|股利贴现|股息折现|股息贴现/.test(method))return 'dividend-discount';
 if(/市盈率|市净率|市销率|倍数|正常化盈利|正常化roe|normalizedearnings|\b(?:pe|pb|ps)\b|p\/?[ebs](?:\(|（|ttm|估值|法|$)|ev\/?ebitda/.test(method))return 'multiples';
 if(/nav|净资产价值|重置成本|资产净值/.test(method))return 'assets';
 return method;
}
export function valuationIssues(valuation,{mode,depth}={}){
 const methods=valuation.methods??[],issues=[];
 if(methods.some(retiredValuationMethod))issues.push('当前研究版本已移除市赚率、修正系数与龙头价格锚方法，请使用适配的主估值并重新核验结论');
 if(valuation.status!=='supported')return issues;
 const families=new Set(methods.map(valuationFamily));families.delete('yield-anchor');
 if(methods.length&&!families.size)issues.push('收益率锚不等于内在价值；缺少主估值时标记limited并说明限制');
 if(mode==='B'&&depth==='Deep'&&families.size<2)issues.push('深度研究须独立方法交叉验证；仅一法时标记limited并解释例外，同类倍数变式、现金流口径和情景不算独立方法');
 return issues;
}
