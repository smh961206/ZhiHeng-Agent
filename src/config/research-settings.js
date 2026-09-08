import {researchDataCopy} from '../../shared/research-data-copy.mjs';

// The selected and automatically matched paths share the same presentation.
export const researchSettings = {
 A: {task:'快速筛选',fixedDepth:'快速筛选',history:5,depthHelp:'聚焦五年趋势与近期变化，判断是否值得继续研究。',historyHelp:'固定核对五年历史及最新报告期，缺失年度会列明。'},
 B: {task:'深度研究',depths:['简明研究','标准研究','完整展开'],depthHelp:'调整报告展开程度；完整展开包含三情景、敏感性分析与研究评分。',historyHelp:researchDataCopy.historyHelp},
 C: {task:'财报更新',depths:['关键变化','标准更新','详细展开'],depthHelp:'调整变化分析的详略，始终聚焦本期财报与对照判断。',historyHelp:'历史资料用于核对比较期，优先查看最新财报、去年同期与拆季所需报告。'},
 D: {task:'多公司比较',depths:['关键差异','标准比较','详细比较'],depthHelp:'按共同维度横向比较，展开程度不改变比较对象。',historyHelp:'历史用于核对同年度经营趋势；主体比较优先采用共同财报期。'},
 E: {task:'组合分析',depths:['关键风险','标准分析','详细分析'],depthHelp:'调整组合风险与条件动作的展开程度；具体判断取决于持仓和约束信息。',historyHelp:'用于核对已提供标的的经营与现金回报，不代表个人持仓期限。'},
 F: {task:'股东回报研究',depths:['回报摘要','标准研究','详细研究'],history:8,depthHelp:'调整分红、回购与现金来源的展开程度，保留必需核对流程。',historyHelp:'固定核对八个完整年度及三年滚动现金回报。'},
};
