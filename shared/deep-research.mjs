import {calculationProgress} from './calculation-progress.mjs';
// Public product copy and execution requirements; never company facts.
export const deepResearchCopy = {
 example: '比亚迪A股深度投资研究：验证海外增长能否抵消国内压力、再投资能否创造持续资本回报，并核对普通股权益、估值假设与安全边际。',
 intro: '核对五年与八个季度，拆解利润和现金，复算分红与估值情景，再形成有条件的判断。',
 stages: {task:'明确问题与假设',evidence:'读取披露与数据',research:'验证逻辑与反证',calculation:'估值与敏感性计算',review:'复核判断与交付'},
 boundaries: [
  '历史完整年度、最新累计期与可比单季分别呈现；同口径累计流量才可相减推导单季，ROE、毛利率和EPS不能相减。',
  '历史ROE统计不自动等于正常化ROE；解释周期、资本结构与再投资回报，ROIC口径不足时保留缺口。',
  'Quick FCF不等于股东可分配现金；维护性与成长性资本开支无法拆分时，只做有明确假设的现金流敏感性。',
  '红旗同时列事实、解释、反证与未解问题；合同负债增加不能直接证明订单质量，全年与半年现金流不能直接比较改善。',
  '按行业选择主估值，解释正常化盈利与现金流模型的差异；结合再投资回报与资本约束评价成长企业分红政策，不取最有利模型或重复折价。',
  'A/H股按同一经济权益核对价格、股本、币种与时点；汇率必须有来源和日期，缺失时不换算，不直接跨币种比较安全边际。',
  '参考报告只提供待验证问题，数字、判断与工具日志须重新取证；公开计划、实际执行与复核后判断分别记录。',
  '分红按实施事件与修订版本去重，TTM按派息日、支付率按利润归属年；官方汇总与逐笔重算不一致时保留差额，不静默择优。',
  '分红规划有适用期限，期后沿用须标为假设；财务公司同业资金、存款负债与法定准备金不能直接当作可分配超额现金。',
 ],
};

export const deepResearchRules = `MODE B 深度研究执行要求：先用公开研究计划说明核心问题、竞争假设、需要的证据与模型选择理由，不披露或模拟内部隐藏思维。先读取当前资料，再按缺口补充，计算保留输入、公式、来源、期间、币种和单位。${deepResearchCopy.boundaries.join(' ')} 使用 calculate_screen_metrics 核对历史统计、单季及现金流；研发资本化或再投资变化对结论重要时，用 calculate_reinvestment 核算同期研发总投入、费用化、资本化、OCF与现金Capex，缺失填null，敏感性不是利润虚增证据，不重复扣除已在Capex内的研发。期后产销、资本变动或股东回报缺口可调用 read_official_disclosures 定向补读，公告日期和实施状态须核对。正常化ROE×权益×PE适用时使用 calculate_normalized_earnings，对悲观、基准、乐观假设分别计算，不把假设当作事实。采用多个盈利或现金流模型时，先保留每个实际计算调用，再用 review_valuation_models 按调用编号对照，声明主模型、交叉核对或压力测试及其限制；不手填另一个模型结果，不把条件式现金压力测试当独立合理价值。完整展开报告须解释三情景、敏感性和模型冲突，数据不足时说明哪些估值无法可靠完成。researchSummary只总结本次已读证据、公开判断依据和未解问题，不复制计划冒充已验证结论，不编造调用。最终区分公司质量、当前价格与研究动作，并列后续验证指标、观察期间、升级及证伪条件。`;

export const deepCalculationRules='适用时调用calculate_shareholder_return，逐笔提交已读实施公告及修订，稳定eventId标识同一分红方案；原始金额先用verify_financial_inputs并核对表头。缺失的早年公告或总现金留null，不能用DPS乘当前股数冒充历史派息总额。官方近三年汇总与逐年重算冲突时通过reportedAggregate保留差额，并解释累计利润与一年平均利润的分母区别。实际calculate_dcf返回后使用calculate_dcf_sensitivity计算增长与折现率二维敏感性，不手写网格，不用网格代替悲观基准乐观三次完整模型。使用calculate_dividend_scenarios引用实际正常化盈利，声明支付率、规划截止及期后假设。所有返回均须判读，数据不足可保留未完成项，不能因工具存在就宣称已执行。';

export function requiresResearchSummary(plan) {
 return (plan.mode==='A' && plan.contractVersion>=3) || (plan.mode==='B' && plan.contractVersion>=4) || (plan.mode==='C' && plan.contractVersion>=5) || (plan.mode==='D' && plan.contractVersion>=6);
}

export function deepResearchProgress(job,hasReport=false) {
 const calculation=calculationProgress(job);
 if(job.status==='completed'&&hasReport&&['partial','failed'].includes(calculation.status))return {
  title:calculation.status==='partial'?'深度研究报告已生成，计算部分完成':'深度研究报告已生成，计算未完成',
  text:'报告生成不代表所有计算通过。请展开下方计算记录，结合报告中的数据缺口与适用条件阅读。',
 };
 const fixed={
  queued:['深度研究已排队','已保存研究问题与设置，等待读取资料。验证计划可在下方展开。'],
  failed:['深度研究未完成','尚未形成正式研究判断。已保留输入和执行记录，可重试并重新取证。'],
  cancelled:['深度研究已取消','本次未交付正式判断，已保存的资料与实际调用仍可回看。'],
  completed:hasReport?['深度研究已完成','先看核心判断，再核对估值假设、模型分歧与证伪条件。导出包含验证计划、实际工具记录和完整报告。']:['未找到深度研究报告','此记录未保存正式正文，可查看已有来源与执行记录。'],
 };
 if(fixed[job.status]){const [title,text]=fixed[job.status];return {title,text};}
 const stages=job.workflow?.stages||[];
 const stage=job.liveReport?.phase==='audit'?'review':stages.find(item=>item.id==='calculation'&&item.status==='running')?.id||stages.find(item=>item.status==='running')?.id;
 const detail={task:'明确核心矛盾、待验证假设及适用的估值方法。',evidence:'读取当前行情、官方披露和财务数据，记录期间、口径与缺口。',research:'核对增长、盈利质量与再投资回报，寻找支持证据和反证。',calculation:'按已核对的口径计算情景、价值区间和安全边际，解释模型分歧。',review:'复核来源、假设、模型适配与研究动作，通过后提供正式报告。'};
 return {title:deepResearchCopy.stages[stage]?'正在'+deepResearchCopy.stages[stage]:'深度研究正在进行',text:detail[stage]||'进展与实际调用会持续保存，可离开页面，稍后回来查看。'};
}
