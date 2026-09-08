import {calculationProgress} from './calculation-progress.mjs';
export const comparisonCopy={
 example:'比较比亚迪（002594）、长城汽车（601633）和赛力斯（601127）：统一财报期间与价格时点，比较公司质量、盈利与现金流、ROE稳定性、股东回报和估值适用性，分别说明研究优先级与风险。',
 intro:'用同一组问题比较 2–3 个标的，分别判断公司质量、当前价格与下一步研究重点。',
 stages:{task:'明确比较对象与维度',evidence:'逐家核对资料与口径',research:'比较优势、变化与反证',calculation:'核算可比指标与适用性',review:'复核逐家公司判断'},
 boundaries:[
  '先定义各公司的商业模式、生命周期和依赖风险，再决定哪些维度可比；不能因为同属一个行业就使用相同增长或估值假设。',
  '主体比较使用相同财报起止日、累计/单季分类、币种与单位；价格列明各自实际交易日。未统一项单列，不用某家全年与另一家半年直接比较。',
  '逐家公司取证与计算，来源编号不得串用。先用calculate_comparison检查可比性；缺失字段保留null，不适用保留原因，不填零或强行全量排名。',
  'ROE分别展示最新累计期和完整年度历史。均值、中位数、总体标准差注明共同窗口、有效样本数和缺失年度；三年与五年不能直接比较稳定性，历史均值不自动等于正常化ROE。',
  '当前增长与长期潜力、毛利率水平与趋势分开；现金流要查营运资本与资本开支，经营现金流高于利润不能单独证明质量好，亏损时现金利润比不作排名。',
  'PE-TTM包含历史盈利，近期亏损不能凭正PE判便宜。估值须逐家公司核对权益、可正常化盈利、同一财报窗口与模型适配组；仅对适用成员比较，不适用不记零。',
  '年度宣告DPS、TTM已付股息、可持续DPS与股类分开，股息率不代表可持续性；价格、DPS与EPS须同币种同股本调整口径。高研发投入不自动证明竞争优势。',
  '分别说明公司质量、财务稳健性、价格吸引力和研究优先级，允许不同答案，不强行选总冠军。评分如使用须按六维25/15/25/20/5/10逐项给依据，缺分不算总分。',
  '逐家公司交付研究动作、置信度、核心风险、待验证指标与证伪条件；综合动作只概括比较结果，不等于每家公司相同动作，也不产生等权组合或仓位建议。',
  '参考案例只指导待验证问题，数字、排名、评分和声称的工具记录必须重新取证；公开验证计划、实际工具返回和复核后判断分别保存。',
 ],
};
export const comparisonRules=`MODE D 多公司比较：${comparisonCopy.intro} ${comparisonCopy.boundaries.join(' ')} 报告按统一口径、业务与成长、同期间财务和现金流、ROE与资本回报、股东回报、估值适配、逐家公司结论交付。researchSummary提供3至8项公开证据判断，不披露或模拟内部隐藏思维。comparisonDecisions按每个已选证券分别输出action、confidence、summary、sourceIds、unresolved，不能遗漏公司或把参考结论预设为答案。复杂估值继续逐家公司调用原有工具，不混用证券资料。`;
export function comparisonReadiness(securities=[]){
 const count=new Set(securities.map(s=>s.market+':'+String(s.symbol).trim().toUpperCase()).filter(key=>!key.endsWith(':'))).size;
 return {count,ready:count>=2&&count<=3,message:count<2?'请至少核对 2 个不同标的后开始比较。':count>3?'一次最多比较 3 个标的，请精简。':`${count} 个标的已选择，将逐家核对资料并检查可比口径。`};
}
export function comparisonProgress(job,hasReport=false){
 const calculation=calculationProgress(job);
 if(job.status==='completed'&&hasReport)return {title:['partial','failed'].includes(calculation.status)?'比较报告已生成，计算仍有缺口':'多公司比较已完成',text:'分别阅读各公司的判断和可比边界；公司质量、价格吸引力与研究优先级可能不同。'};
 const fixed={queued:['多公司比较已排队','等待读取各公司原文，确认共同财报期与价格时点。'],failed:['多公司比较未完成','已保留输入和执行记录，核对各公司资料缺口后可重试。'],cancelled:['多公司比较已取消','本次尚未交付正式比较判断，已有执行记录可回看。'],completed:['未找到比较报告','请查看已有资料与执行记录，未保存的结论不会补写。']};
 if(fixed[job.status]){const [title,text]=fixed[job.status];return {title,text};}
 const stage=job.liveReport?.phase==='audit'?'review':job.workflow?.stages?.find(s=>s.id==='calculation'&&s.status==='running')?.id||job.workflow?.stages?.find(s=>s.status==='running')?.id;
 return {title:comparisonCopy.stages[stage]?'正在'+comparisonCopy.stages[stage]:'多公司比较正在进行',text:'逐家公司查证，保留错期、缺失和模型不适用项；实际调用可在执行轨迹中查看。'};
}
