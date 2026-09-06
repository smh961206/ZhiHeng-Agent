const paragraph=value=>String(value??'').trim();
const oneLine=value=>paragraph(value).replace(/[\r\n]+/g,' ');
const safeUrl=value=>/^https?:\/\/[^\s<>]+$/i.test(value??'')?value:null;
export function researchApproachMarkdown(job,{includeRules=true}={}){
 const plan=job.plan?.researchApproach;
 const completed=job.status==='completed';
 const summary=completed?job.result?.researchSummary:null;
 const decision=completed&&(job.plan?.mode||job.mode)==='A'?job.result?.decision:null;
 const nextSteps=decision?job.result?.sections?.find(section=>section.id==='nextSteps')?.text:null;
 const rules=job.result?.framework?.knowledge??job.plan?.knowledge;
 const emptySummary={
  queued:'研究尚未开始查证。完成并通过复核后，将展示证据支持的判断与待核实事项。',
  running:'查证与复核仍在进行，尚未形成正式判断摘要。实际调用、返回和失败可在执行轨迹中查看。',
  failed:'研究未完成，尚未形成通过复核的判断摘要。请在执行轨迹中查看实际完成、失败及未完成的事项。',
  cancelled:'研究已取消，尚未形成通过复核的判断摘要。已保存的执行记录可在执行轨迹中查看。',
 }[job.status]||'这条记录没有保存证据判断摘要；请结合正式报告、审计与实际工具记录阅读。';
 return [
  ...(includeRules&&rules?.length?['## 本次使用的研究规则',rules.map(rule=>`- ${rule.path} · ${rule.version}\n  文件指纹：${rule.sha256}`).join('\n')]:[]),
  '## 研究计划',plan?[
   '以下展示本次任务保存的查证计划；实际执行情况见执行轨迹。',plan.objective,
   ...(plan.scope?[`**资料范围：** ${plan.scope.period}`,plan.scope.comparison]:[]),
   '### 本次查证问题',...(plan.steps||[]).map((step,index)=>`${index+1}. **${step.title}**：${step.question}`),
   ...(plan.boundaries?.length?['### 研究边界',plan.boundaries.map(value=>'- '+value).join('\n')]:[]),
   ...(plan.expectedResult?['### 预期交付',plan.expectedResult]:[]),plan.notice,
  ].filter(Boolean).join('\n\n'):'这条记录没有保存公开研究计划。',
  '## 证据与判断摘要',summary?.checks?.length?[
   '以下为本次完成并通过复核后保存的证据判断。每项结论均可回查来源与待核实事项。',
   ...summary.checks.map(item=>`### ${item.topic}\n\n**证据判断：** ${item.assessment}\n\n${item.sourceIds?.length?'**依据来源：** '+item.sourceIds.map(id=>'['+id+']').join(' '):'**依据来源：** 数据不足，未关联证据。'}\n\n**待核实事项：** ${item.unresolved||'未记录'}`),summary.notice,
  ].filter(Boolean).join('\n\n'):emptySummary,
  ...(decision?['## 筛选判断与后续验证',
   `**本次判断：** ${decision.action} · **置信度：** ${decision.confidence}`,decision.summary,
   ...(nextSteps?['### 下一步验证重点',nextSteps]:[]),
   '### 什么会推翻判断',decision.falsifiers?.length?decision.falsifiers.map((text,index)=>`${index+1}. ${text}`).join('\n'):'此记录未保存证伪条件。',
   '### 数据缺口与影响',decision.missingData?.length?decision.missingData.map(text=>'- '+text).join('\n'):'此记录未列出数据缺口。',
  ]:[]),
 ].join('\n\n');
}
function jsonBlock(value){
 const text=JSON.stringify(value,null,2)??'未记录';
 // A source or query may itself contain Markdown fences.
 const fence='`'.repeat(Math.max(3,...[...text.matchAll(/`+/g)].map(match=>match[0].length+1)));
 return fence+'json\n'+text+'\n'+fence;
}
export function exportResearchMarkdown(job,{includeResearchProcess=true}={}){
 if(!job.result?.report?.trim())throw new Error('正式报告尚未完成，不能导出');
 const trace=(job.events??[]).filter(event=>['research_plan','tool','tool_result','fetch','fetch_error','audit_validation'].includes(event.type));
 const tools=trace.map((event,index)=>{
  const details=Object.fromEntries(['toolName','toolCallId','arguments','result','reason'].filter(key=>event[key]!==undefined).map(key=>[key,event[key]]));
  return `### ${index+1}. ${oneLine(event.message)}\n\n时间：${oneLine(event.time)||'未记录'} · 记录类型：${oneLine(event.type)}${Object.keys(details).length?'\n\n'+jsonBlock(details):''}`;
 });
 const sources=(job.input?.sources??[]).map(source=>{
  const url=safeUrl(source.url);
  return [`### [${oneLine(source.id)}] ${oneLine(source.title)}`,
   url?`原始来源：<${url}>`:'原始链接未记录或格式无效。',
   `提供方：${oneLine(source.provider)||'未记录'}；资料类型：${oneLine(source.type)||'未记录'}`,
   `发布日期：${oneLine(source.publishedAt||(['publication-date','filing-date'].includes(source.dateBasis)?source.date:''))||'未明确'}；资料日期：${oneLine(source.date)||'未记录'}；日期含义：${oneLine(source.dateBasis)||'见原件'}`,
   `资料期间：${oneLine(source.reportPeriod||source.reportDate)||'见原件'}；抓取时间：${oneLine(source.fetchedAt)||'未记录'}`,
   `内容指纹：${oneLine(source.contentHash)||'未记录'}；覆盖：${oneLine(source.coverage)||'未记录'}${source.stale?'；归档资料已标记过期':''}${source.truncated?'；正文读取有截断':''}`,
  ].join('\n\n');
 });
 if(!includeResearchProcess)return [
  `# ${oneLine(job.input?.question)||'研究报告'}`,
  ...(job.result.warnings??[]).map(value=>'> '+value),
  job.result.report,
  '## 审计记录',job.result.audit||'未记录',
  '## 来源目录',sources.length?sources.join('\n\n'):'未记录',
 ].join('\n\n')+'\n';
 return [`# ${oneLine(job.input?.question)||'研究报告'}`,
  `MODE ${oneLine(job.mode)} · ${oneLine(job.plan?.name)} · 任务 ${oneLine(job.id)}`,
  ...(job.result.warnings??[]).map(value=>'> '+value),
  '# 一、研究计划与证据判断',researchApproachMarkdown(job),
  '# 二、实际工具调用与资料获取',
  '以下按任务保存顺序列出实际记录。仅有记录的步骤才列入；没有保存的步骤不补写。参数及返回内容用于追溯，不代表已独立核实。',
  tools.length?tools.join('\n\n'):'这条记录未保存工具调用。',
  '# 三、完整研究结果',job.result.report,
  '## 审计记录',job.result.audit||'未记录',
  '## 来源目录',sources.length?sources.join('\n\n'):'未记录',
 ].join('\n\n')+'\n';
}
