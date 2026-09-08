import {calculationProgress} from './calculation-progress.mjs';

export const earningsUpdateCopy={
 example:'比亚迪最新财报分析：核对最新正式财报，重点查看单季盈利、海外业务、现金流与资本开支、库存及资本回报变化，并说明是否需要调整原有判断。',
 intro:'锁定最新正式财报，核对本期变化，再判断旧逻辑与估值假设是否需要调整。',
 stages:{task:'明确对照与更新重点',evidence:'核对最新财报与比较期',research:'查证变化与反证',calculation:'核算单季与参数变化',review:'复核更新判断'},
 boundaries:[
  '先确认最新已读正式财报的报告期、发布日期和来源；经营月报、业绩预告及媒体报道单列，未取得最新原文时明确时点限制。',
  '旧研究只作历史判断与假设对照，来源编号不属于本次证据；缺少旧研究时建立本期基线，仍可比较已读取的历史财报，不声称投资逻辑已增强或削弱。',
  '最新累计期、去年同期与可比单季分别列示。H1减Q1、前三季减H1只用于同口径流量；ROE、EPS、利润率与余额不能相减，单季利润率用单季利润除以单季收入。',
  '分别核对归母与扣非利润、经营现金流及资本开支；Quick FCF不等于可分配现金，同期比较不能用全年替代半年。',
  '业务或地区结构变化须查证盈利贡献，收入占比增加不能直接证明毛利改善的因果关系。存货、应收、合同负债和在建工程同时列事实、解释、反证与未解问题。',
  '周转天数须明确平均余额、成本或收入分母、期间天数与年化口径；缺失期初余额时保留缺口，不直接套用期末余额。',
  '估值分别记录旧假设、新假设、新证据及区间影响；区分基本面、模型参数和股价变动。单季回暖不自动提高正常化ROE，不编造情景概率、目标价或旧参数。',
  '多股类逐项核对价格日期、股本、同一经济权益及币种，汇率要有当前来源与日期；缺失汇率不跨币种比较折价或安全边际。',
  '升级、维持、降级、剔除表示研究动作；偏积极或偏谨慎写入判断理由，不新增交易指令。列下期指标、观察期间、升级条件和证伪条件。',
 ],
};
export const earningsUpdateRules=`MODE C 财报更新：聚焦本期新增信息，不重写完整公司介绍。先说明公开验证计划，再检索当前来源、调用工具核算、形成有条件的更新判断，不输出或模拟内部隐藏思维。${earningsUpdateCopy.boundaries.join(' ')} calculate_screen_metrics用于累计/单季、同口径同比、现金流及余额变化；存在单季冲突时保留两者并补查。只有假设发生有依据的变化且数据足够时，按适配性调用估值工具重新计算，不为走完流程强行调用所有模型。报告按对照范围、财务变化、关键变量与反证、逻辑变化、参数变更、研究动作与跟踪交付。researchSummary提供3至8项本次实际查证的证据判断，旧案例数字和声称的工具调用不能当作本次事实。`;

export function earningsUpdateProgress(job,hasReport=false){
 const baseline=Boolean(job.input?.baseline||job.input?.previousResearch?.trim());
 const calculation=calculationProgress(job);
 if(job.status==='completed'&&hasReport)return {
  title:['partial','failed'].includes(calculation.status)?'财报更新报告已生成，计算仍有缺口':baseline?'财报更新已完成':'本期财报基线已建立',
  text:['partial','failed'].includes(calculation.status)?'展开计算记录，核对未完成项目对参数与判断的影响。':baseline?'先看旧判断与新证据，再核对参数调整理由及下期验证条件。':'本次可比较财报期间变化；尚未对照旧投资判断，后续可沿用此报告更新。',
 };
 const fixed={queued:['财报更新已排队','等待读取最新正式财报和比较期资料，旧结论仅作对照。'],failed:['财报更新未完成','输入、已读资料和执行记录已保留，可重试并重新核对。'],cancelled:['财报更新已取消','本次尚未交付正式更新判断，可沿用输入继续研究。']};
 if(fixed[job.status]){const [title,text]=fixed[job.status];return {title,text};}
 if(job.status==='completed')return {title:'未找到财报更新报告',text:'可查看已有证据与执行记录，未保存的判断不会补写。'};
 const stage=job.liveReport?.phase==='audit'?'review':job.workflow?.stages?.find(s=>s.id==='calculation'&&s.status==='running')?.id||job.workflow?.stages?.find(s=>s.status==='running')?.id;
 const details={task:'确定旧判断、关注变量与本次比较范围。',evidence:'区分正式财报和经营公告，核对最新期、去年同期与单季资料。',research:'同时核对盈利、现金流和资产负债变化，查找支持证据与反证。',calculation:'核算同口径变化；单季改善是否足以调整长期参数仍需证据。',review:'复核新旧对照、参数变化、研究动作与尚未解决的缺口。'};
 return {title:earningsUpdateCopy.stages[stage]?'正在'+earningsUpdateCopy.stages[stage]:'财报更新正在进行',text:details[stage]||'进展会持续保存，可稍后回来查看。'};
}

function baselineSecurityKey(security){
 const symbol=String(security.symbol??'').trim().toUpperCase();
 return security.market+':'+(security.market==='HK'?symbol.padStart(5,'0'):symbol);
}
export function eligibleUpdateBaselines(jobs=[],securities=[]){
 return jobs.filter(job=>{
  if(job.status!=='completed'||!securities.length)return false;
  const previous=job.input?.securities??job.plan?.securities??job.securities??[];
  const keys=new Set(previous.map(baselineSecurityKey));
  return securities.every(s=>keys.has(baselineSecurityKey(s)));
 });
}

export function updateBaselineSelection(input={},securities=[],state={}){
 const selected=input.baselineJobId;
 if(!selected)return {status:input.previousResearch?.trim()?'external':'none',blocking:false};
 const job=state.jobs?.find(item=>item.id===selected);
 if(job&&securities.length){
  if(eligibleUpdateBaselines([job],securities).length)return {status:'ready',blocking:false};
  return {status:'mismatch',blocking:true,message:'所选对照研究未完成或未覆盖当前标的，请重新选择对照'};
 }
 if(!job&&state.jobsLoading)return {status:'checking',blocking:true,pending:true,message:'正在核对所选对照研究，请稍候'};
 if(!job&&state.jobsError)return {status:'error',blocking:true,message:'暂时无法核对所选对照，请刷新研究记录，或取消选择并填写外部旧结论'};
 if(!job&&Array.isArray(state.jobs))return {status:'missing',blocking:true,message:'所选对照研究已不在可用记录中，请重新选择或建立本期基线'};
 return {status:'unverified',blocking:false};
}
