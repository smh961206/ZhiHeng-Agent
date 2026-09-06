// Keep a historical snapshot with the new job. It remains stable if the old job is later removed.
export async function attachResearchBaseline(input,mode,loadJob){
 if(mode!=='C'||!input.baselineJobId)return input;
 const prior=await loadJob(input.baselineJobId);
 if(prior?.status!=='completed'||!prior.result?.report?.trim())throw new Error('对照研究不存在或尚未完成，请重新选择');
 const keys=items=>new Set((items??[]).map(item=>item.market+':'+String(item.symbol).toUpperCase()));
 const previous=keys(prior.input?.securities??prior.plan?.securities);
 if(!input.securities.every(item=>previous.has(item.market+':'+String(item.symbol).toUpperCase())))throw new Error('对照研究未覆盖当前标的，请选择相同标的的旧报告');
 return {...input,baseline:{jobId:prior.id,question:prior.input?.question||prior.question,createdAt:prior.createdAt,
  report:prior.result.report.slice(0,60000).replace(/\[(S\d+)\]/g,'[历史:$1]'),truncated:prior.result.report.length>60000,
  decision:JSON.parse(JSON.stringify(prior.result.decision??null).replace(/\[(S\d+)\]/g,'[历史:$1]')),frameworkVersion:prior.plan?.version??null,
  notice:'仅作历史结论和假设对照。旧报告的来源编号不属于本次来源目录，不能作为当前事实或当前行情。'}};
}
