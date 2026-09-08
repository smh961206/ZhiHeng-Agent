import {reportSecurityHeadings} from './report-security-headings.mjs';
import {deduplicateReportHeadings} from './report-headings.mjs';
import {auditCoverage,auditCoverageNotice} from './audit-coverage.mjs';
import {ruleUsage} from './research-knowledge.mjs';
import {researchRecordSummary,recordBoundary,publicExecutionPlan} from './research-record.mjs';
import {researchExecutionChecks} from './research-execution-checks.mjs';
import {recordedFinancialCoverage,coverageFieldLabels} from './financial-coverage.mjs';
import {researchAnalysisReceipts} from './research-analysis-receipts.mjs';
const paragraph=value=>String(value??'').trim();
const oneLine=value=>paragraph(value).replace(/[\r\n]+/g,' ');
const safeUrl=value=>/^https?:\/\/[^\s<>]+$/i.test(value??'')?value:null;
export function knowledgeProvenanceMarkdown(job){
 const usage=ruleUsage(job);
 return ['## 本次规则依据',usage.version?'记录版本：V'+oneLine(usage.version):'研究规则版本未记录。',
  usage.snapshot?'固定快照：'+oneLine(usage.snapshot.id):'此记录未保存固定规则快照。',
  usage.recorded?'以下仅列实际进入研究上下文的规则；完整目录不代表已经使用。':'此记录未保存实际读取明细，不根据当前目录补写历史使用情况。',
  ...usage.records.map(row=>`- ${oneLine(row.heading)} · ${oneLine(row.reason)}\n  文件：${oneLine(row.path)} · 第 ${row.line}–${row.endLine} 行${row.truncated?' · 部分内容':''}\n  文件指纹：${oneLine(row.sha256)}\n  本次内容校验：${oneLine(row.contentSha256)}`),
 ].join('\n\n');
}
export function researchApproachMarkdown(job,{includeRules=true}={}){
 const plan=job.plan?.researchApproach;
 const execution=publicExecutionPlan(job);
 const completed=job.status==='completed';
 const summary=completed?job.result?.researchSummary:null;
 const decision=completed&&(job.plan?.mode||job.mode)==='A'?job.result?.decision:null;
 const nextSteps=decision?job.result?.sections?.find(section=>section.id==='nextSteps')?.text:null;
 const emptySummary={
  queued:'研究尚未开始查证。完成并通过复核后，将展示证据支持的判断与待核实事项。',
  running:'查证与复核仍在进行，尚未形成正式判断摘要。实际调用、返回和失败可在执行轨迹中查看。',
  failed:'研究未完成，尚未形成通过复核的判断摘要。请在执行轨迹中查看实际完成、失败及未完成的事项。',
  cancelled:'研究已取消，尚未形成通过复核的判断摘要。已保存的执行记录可在执行轨迹中查看。',
 }[job.status]||'这条记录没有保存证据判断摘要；请结合正式报告、审计与实际工具记录阅读。';
 return [
  ...(includeRules?[knowledgeProvenanceMarkdown(job)]:[]),
  '## 研究计划',plan?[
   '以下展示本次任务保存的查证计划；实际执行情况见执行轨迹。',plan.objective,
   ...(plan.scope?[`**资料范围：** ${plan.scope.period}`,plan.scope.comparison]:[]),
   '### 本次查证问题',...(plan.steps||[]).map((step,index)=>`${index+1}. **${step.title}**：${step.question}`),
   ...(plan.boundaries?.length?['### 研究边界',plan.boundaries.map(value=>'- '+value).join('\n')]:[]),
   ...(plan.expectedResult?['### 预期交付',plan.expectedResult]:[]),plan.notice,
  ].filter(Boolean).join('\n\n'):'这条记录没有保存公开研究计划。',
  ...(execution?['### 最新公开执行计划',`第 ${execution.revision} 次更新 · ${oneLine(execution.updatedAt)||'时间未记录'}`,execution.objective,
   ...(execution.hypotheses?.length?['待验证解释：'+execution.hypotheses.map(oneLine).join('；')]:[]),
   ...execution.steps.map(step=>`- ${oneLine(step.question)} · ${{pending:'待处理',in_progress:'正在核对',completed:'已完成此步',blocked:'保留缺口'}[step.status]||oneLine(step.status)}\n  ${oneLine(step.note)}\n  来源：${step.evidenceIds?.map(oneLine).join('、')||'未关联'}；调用：${step.toolCallIds?.map(oneLine).join('、')||'未关联'}`),execution.notice]:[]),
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
export function executionChecksMarkdown(job){
 return ['## 本次查证记录','以下来自实际调用，返回不等于事实已核实；未记录不推定不适用或已完成。历史失败可能在后续修复，请对照完整记录。',
  ...researchExecutionChecks(job).map(c=>`- ${c.title}：${c.label} · ${c.attempts} 次记录${c.attempts?' · '+c.records.map(r=>oneLine(r.toolCallId)||'编号未记录').join('、'):''}\n  ${c.notice}`),financialCoverageMarkdown(job),analysisReceiptsMarkdown(job)].join('\n\n');
}
export function analysisReceiptsMarkdown(job){
 const calls=researchAnalysisReceipts(job);
 if(!calls.length&&!['B','F'].includes(job.mode||job.plan?.mode))return '';
 return ['### 分红与敏感性核对','仅来自本次实际计算返回，不由报告文字反推已执行；历史缺值、冲突和错误保留。',...(calls.length?calls.map(c=>`- ${oneLine(c.label)} · ${oneLine(c.toolCallId)||'编号未记录'} · ${!c.hasReturn?'返回未齐':c.result?.error?'失败':c.result?.status==='incomplete'?'返回有缺口':'已返回，待判读'}${c.result?.baseToolCallId?'；基于 '+oneLine(c.result.baseToolCallId):''}${c.result?.aggregateCheck?.status==='mismatch'?'；官方汇总与逐年重算不一致':''}`):['本次尚无专用工具记录，不补造历史核算。'])].join('\n\n');
}
export function financialCoverageMarkdown(job){
 const receipts=recordedFinancialCoverage(researchRecordSummary(job).calls);
 return ['### 财务数值覆盖',...(receipts.length?receipts.flatMap(({toolCallId,coverage:c})=>[
  `#### ${oneLine(toolCallId)||'编号未记录'} · 年度 ${c.annual.complete}/5 · 季度 ${c.quarters.complete}/8 输入齐全`,c.notice,
  `年度截至 ${c.anchor.annualEnd||'未记录'}；最晚输入期间 ${c.anchor.latestPeriodEnd||'未记录'}。`,
  ...[...c.annual.periods,...c.quarters.periods].map(r=>`- ${r.period}：${r.conflict?'存在冲突':r.missingFields.length?'缺少 '+r.missingFields.map(f=>coverageFieldLabels[f]||f).join('、'):'输入齐全 · 待核对'}${r.derived?' · 含推导单季':''}；来源 ${r.sourceIds.map(oneLine).join('、')||'未记录'}`),
  ...(c.balanceMissing??[]).map(r=>`- 余额缺项：${r.date} ${coverageFieldLabels[r.field]||r.field}`),
 ]):['尚无数值覆盖返回，不根据已读财报份数推定齐全。'])].join('\n\n');
}
export function exportExecutionMarkdown(job){
 if(!job?.id)throw new Error('任务记录尚未保存');
 const record=researchRecordSummary(job);
 return [`# ${oneLine(job.input?.question)||'研究任务'} · 已保存执行记录`,
  `任务 ${oneLine(job.id)} · 状态 ${oneLine(job.status)} · 生成时间 ${new Date().toISOString()}`,
  '这是当前已取得的执行记录快照，不是正式研究报告；进行中或中断的步骤可能尚未保存返回。结果保存失败时不将暂存报告冒充正式交付。',recordBoundary,
  researchApproachMarkdown({...job,status:job.delivery?.status==='failed'||job.delivery?.status==='saving'?'failed':job.status}),executionChecksMarkdown(job),
  '## 实际工具输入与返回',...record.calls.map((c,index)=>[`### ${index+1}. ${oneLine(c.label)}`,
   `工具：${oneLine(c.toolName)} · 编号：${oneLine(c.toolCallId)||'未记录'} · 状态：${oneLine(c.status)} · 开始：${oneLine(c.startedAt)||'未记录'} · 返回：${oneLine(c.returnedAt)||'未记录'}`,
   '输入：',c.hasInput?jsonBlock(c.arguments):'未保存输入。','返回：',c.hasReturn?jsonBlock(c.result):'未保存返回。'].join('\n\n')),
  ...(record.calls.length?[]:['没有保存工具调用；不补写执行链。']),
  '## 运行提示',...(job.events??[]).filter(e=>['warning','error','fetch_error'].includes(e.type)).map(e=>`${oneLine(e.time)} · ${oneLine(e.message)}`),
  '## 来源目录',...(job.input?.sources??[]).map(s=>jsonBlock(Object.fromEntries(['id','title','security','url','type','provider','date','publishedAt','reportPeriod','fetchedAt','sha256','contentHash','pages','readPages','truncated','stale'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]])))),
 ].join('\n\n')+'\n';
}
export function exportResearchMarkdown(job,{includeResearchProcess=true,usExchanges={}}={}){
 if(['saving','failed'].includes(job.delivery?.status))throw new Error('结果尚未保存，暂不能导出正式报告');
 if(!job.result?.report?.trim())throw new Error('正式报告尚未完成，不能导出');
 const report=deduplicateReportHeadings(reportSecurityHeadings(job.result.report,job,usExchanges));
 const coverage=auditCoverage(job.result.validation);
 const auditScope=coverage.length?[...coverage.map(item=>[item.summary,...item.limitations].join(' ')),auditCoverageNotice].join('\n\n'):'';
 const visualScope=job.visualAudit?['### 原页审阅范围',job.visualAudit.notice,jsonBlock(job.visualAudit)].join('\n\n'):'';
 const trace=(job.events??[]).filter(event=>['research_input','research_plan','tool','tool_result','fetch','fetch_error','audit_validation','audit_context','web_search','evidence_followup','knowledge_read','warning','error','route','research','research_context'].includes(event.type));
 const tools=trace.map((event,index)=>{
  const details=Object.fromEntries(['toolName','toolCallId','arguments','result','reason','issues','stopReason','contextWindow','gap','check','followup','ruleRead'].filter(key=>event[key]!==undefined).map(key=>[key,event[key]]));
  return `### ${index+1}. ${oneLine(event.message)}\n\n时间：${oneLine(event.time)||'未记录'} · 记录类型：${oneLine(event.type)}${Object.keys(details).length?'\n\n'+jsonBlock(details):''}`;
 });
 const sources=(job.input?.sources??[]).map(source=>{
  const url=safeUrl(source.url);
  return [`### [${oneLine(source.id)}] ${oneLine(source.title)}`,
   url?`原始来源：<${url}>`:'原始链接未记录或格式无效。',
   `提供方：${oneLine(source.provider)||'未记录'}；资料类型：${oneLine(source.type)||'未记录'}`,
   `发布日期：${oneLine(source.publishedAt||(['publication-date','filing-date'].includes(source.dateBasis)?source.date:''))||'未明确'}；资料日期：${oneLine(source.date)||'未记录'}；日期含义：${oneLine(source.dateBasis)||'见原件'}`,
   `资料期间：${oneLine(source.reportPeriod||source.reportDate)||'见原件'}；抓取时间：${oneLine(source.fetchedAt)||'未记录'}`,
   `内容指纹：${oneLine(source.contentHash||source.sha256)||'未记录'}；覆盖：${oneLine(source.coverage)||'未记录'}${source.stale?'；归档资料已标记过期':''}${source.truncated?'；正文读取有截断':''}`,
   ...(source.pages?[`原件页数：${source.pages}；已读取页数：${source.readPages??'未记录'}；解析版本：${oneLine(source.parserVersion)||'未记录'}`]:[]),
   ...(source.visualReading?[`模型原页读取：${oneLine(source.visualReading.notice)}`]:[]),
  ].join('\n\n');
 });
 if(!includeResearchProcess)return [
  `# ${oneLine(job.input?.question)||'研究报告'}`,
  ...(job.result.warnings??[]).map(value=>'> '+value),
  report,
  knowledgeProvenanceMarkdown(job),
  '## 审计记录',auditScope,visualScope,job.result.audit||'未记录',
  '## 来源目录',sources.length?sources.join('\n\n'):'未记录',
 ].join('\n\n')+'\n';
 const record=researchRecordSummary(job);
 const ledger=['## 工具调用概览',recordBoundary,
  `${record.attempts} 次已记录调用/返回 · ${record.returned} 次返回非错误结果 · ${record.failed} 次返回错误 · ${record.pending} 次未保存返回。成功返回不代表事实已核实。`,
  ...record.calls.map((call,index)=>`${index+1}. ${oneLine(call.label)} · ${oneLine(call.toolCallId)||'调用编号未记录'} · ${{returned:'已返回',failed:'返回错误',pending:'等待返回',unrecorded:'未记录返回'}[call.status]}${!call.hasInput?' · 输入未记录':''}${call.durationMs!==null?' · '+call.durationMs+'毫秒':''}`),
 ].join('\n\n');
 return [`# ${oneLine(job.input?.question)||'研究报告'}`,
  `MODE ${oneLine(job.mode)} · ${oneLine(job.plan?.name)} · 任务 ${oneLine(job.id)}`,
  ...(job.result.warnings??[]).map(value=>'> '+value),
  '# 一、研究计划与证据判断',researchApproachMarkdown(job),
  '# 二、实际工具调用与资料获取',
  ledger,
  executionChecksMarkdown(job),
  '以下按任务保存顺序列出实际记录。仅有记录的步骤才列入；没有保存的步骤不补写。参数及返回内容用于追溯，不代表已独立核实。',
  tools.length?tools.join('\n\n'):'这条记录未保存工具调用。',
  '# 三、完整研究结果',report,
  '## 审计记录',auditScope,visualScope,job.result.audit||'未记录',
  '## 来源目录',sources.length?sources.join('\n\n'):'未记录',
 ].join('\n\n')+'\n';
}
