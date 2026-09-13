import {researchDataCopy} from '../../shared/research-data-copy.mjs';

// The selected and automatically matched paths share the same presentation.
export const researchSettings = {
 A: {task:'快速筛选',fixedDepth:'快速筛选',history:5,depthHelp:'聚焦五年趋势与近期变化，判断是否值得继续研究。',historyHelp:'固定核对五年历史及最新报告期，缺失年度会列明。',processing:'只准备筛选所需的财务、变化与估值快照，先判断是否值得继续投入研究。',steps:['确认标的与五年范围','核对趋势、近期变化和红旗','形成淘汰、观察或深研判断']},
 B: {task:'深度研究',depths:['简明研究','标准研究','完整展开'],depthHelp:'调整报告展开程度；完整展开包含三情景、敏感性分析与研究评分。',historyHelp:researchDataCopy.historyHelp,processing:'围绕长期投资问题逐步补充证据与计算；资料整理、研究、写作和审计分别完成。',steps:['建立证据目录与待验证假设','按缺口查证并复算关键数字','独立整理报告并审计']},
 C: {task:'财报更新',depths:['关键变化','标准更新','详细展开'],depthHelp:'调整变化分析的详略，始终聚焦本期财报与对照判断。',historyHelp:'历史资料用于核对比较期，优先查看最新财报、去年同期与拆季所需报告。',processing:'以最新披露和旧报告为中心，只补读影响原判断的变化，保留旧结论与本次差异。',steps:['锁定旧报告与比较期','核对本期变化和异常','更新或保留原判断']},
 D: {task:'多公司比较',depths:['关键差异','标准比较','详细比较'],depthHelp:'按共同维度横向比较，展开程度不改变比较对象。',historyHelp:'历史用于核对同年度经营趋势；主体比较优先采用共同财报期。',processing:'先统一标的、期间和指标口径，再分别判断公司质量与估值，避免把不可比数据放进同一排名。',steps:['统一标的与报告期','逐家公司核对共同指标','说明差异、候选理由与限制']},
 E: {task:'组合分析',depths:['关键风险','标准分析','详细分析'],depthHelp:'调整组合风险与条件动作的展开程度；具体判断取决于持仓和约束信息。',historyHelp:'用于核对已提供标的的经营与现金回报，不代表个人持仓期限。',processing:'以持仓、权重和风险约束为前提，先识别集中与流动性风险，再讨论有条件的组合动作。',steps:['核对持仓与组合约束','识别集中、相关与流动性风险','区分公司判断和组合动作']},
 F: {task:'股东回报研究',depths:['回报摘要','标准研究','详细研究'],history:8,depthHelp:'调整分红、回购与现金来源的展开程度，保留必需核对流程。',historyHelp:'固定核对八个完整年度及三年滚动现金回报。',processing:'按实施事件核对分红与回购，再检查现金来源、再投资和可持续性，不把高股息直接当作结论。',steps:['整理八年分红与回购事件','复算支付率与现金来源','判断回报质量和可持续条件']},
};
