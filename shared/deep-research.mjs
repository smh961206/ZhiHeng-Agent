// Public product copy and execution requirements; never company facts.
export const deepResearchCopy = {
 example: '比亚迪深度投资研究：验证海外增长能否抵消国内压力、再投资能否创造持续资本回报，并比较 A/H 股的估值区间与安全边际。',
 intro: '先明确核心矛盾，再查证与计算，最后形成有条件的投资判断。',
 stages: {task:'明确问题与假设',evidence:'读取披露与数据',research:'验证逻辑与反证',calculation:'估值与敏感性计算',review:'复核判断与交付'},
 boundaries: [
  '历史完整年度、最新累计期与可比单季分别呈现；同口径累计流量才可相减推导单季，ROE、毛利率和EPS不能相减。',
  '历史ROE统计不自动等于正常化ROE；解释周期、资本结构与再投资回报，ROIC口径不足时保留缺口。',
  'Quick FCF不等于股东可分配现金；维护性与成长性资本开支无法拆分时，只做有明确假设的现金流敏感性。',
  '红旗同时列事实、解释、反证与未解问题；合同负债增加不能直接证明订单质量，全年与半年现金流不能直接比较改善。',
  '按行业选择主估值，解释正常化盈利与现金流模型的差异；市赚率仅作辅助，不机械惩罚成长企业低分红，不取最有利模型或重复折价。',
  'A/H股按同一经济权益核对价格、股本、币种与时点；汇率必须有来源和日期，缺失时不换算，不直接跨币种比较安全边际。',
  '参考报告只提供待验证问题，数字、判断与工具日志须重新取证；公开计划、实际执行与复核后判断分别记录。',
 ],
};

export const deepResearchRules = `MODE B 深度研究执行要求：先用公开研究计划说明核心问题、竞争假设、需要的证据与模型选择理由，不披露或模拟内部隐藏思维。先读取当前资料，再按缺口补充，计算保留输入、公式、来源、期间、币种和单位。${deepResearchCopy.boundaries.join(' ')} 使用 calculate_screen_metrics 核对历史统计、单季及现金流；正常化ROE×权益×PE适用时使用 calculate_normalized_earnings，对悲观、基准、乐观假设分别计算，不把假设当作事实。完整展开报告须解释三情景、敏感性和模型冲突，数据不足时说明哪些估值无法可靠完成。researchSummary只总结本次已读证据、公开判断依据和未解问题，不复制计划冒充已验证结论，不编造调用。最终区分公司质量、当前价格与研究动作，并列后续验证指标、观察期间、升级及证伪条件。`;

export function requiresResearchSummary(plan) {
 return (plan.mode==='A' && plan.contractVersion>=3) || (plan.mode==='B' && plan.contractVersion>=4);
}

export function deepResearchProgress(job,hasReport=false) {
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
