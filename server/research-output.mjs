import {valuationIssues} from '../shared/valuation-policy.mjs';
import {requiresResearchSummary} from '../shared/deep-research.mjs';
import {reportSectionBody} from '../shared/report-headings.mjs';
import {scoring,confidenceLevels,portfolioReadiness} from '../shared/research-framework.mjs';
import {referenceContract,normalizeReviewReferences,normalizeSourceReferences,sourceReferenceIds,validateReportReferences,isResearchEvidence} from './research-references.mjs';

const text=value=>typeof value==='string'&&Boolean(value.trim());
const needsCompanyDecisions=plan=>plan.mode==='D'&&plan.contractVersion>=6&&(plan.securities?.length??0)>=2;
const fail=message=>{throw new Error(message);};
const list=(value,label,min=0)=>{
 if(!Array.isArray(value)||value.length<min||value.length>80||value.some(item=>!text(item)))fail(label+'格式无效');
 return value.map(item=>item.trim());
};
export function reviewContract(plan,sources=[]){
 return {
  instruction:'只返回JSON。每个section使用指定id，text只写章节正文Markdown，不重复章节标题；章节标题由系统统一添加，正文可保留有实际内容的下级小标题。缺失不能填造，写明数据不足及原因。researchAction表示研究状态，不代表交易指令。',
  sections:plan.output.sections,
  fieldRules:{action:{allowed:plan.output.actions,instruction:'只选一个完整枚举值，不填写多个动作或同义词'},confidence:{allowed:confidenceLevels},dataAsOf:{format:'YYYY-MM-DD',instruction:'仅填写合法日期，时点说明放在正文'},scores:{instruction:'分值为number或null，不写分数字符串；不得为补齐字段伪造评分'}},
  references:referenceContract(sources),
  schema:{sections:[{id:'按上方section id',text:'章节Markdown；事实或数字旁写[S1]，表格逐行在来源列写[S1]；无依据写数据不足'}],audit:'复核过程、限制和未核实事项',
   ...(plan.execution?{executionAudit:plan.execution.checks.map(item=>({id:item.id,status:'passed / limited / not_applicable / failed',reason:item.requirement+' 逐项说明证据与限制，引用本次来源；不适用须说明原因，资料不足用limited并降低结论强度，failed须修正报告后再评价。'}))}:{}),
   ...(needsCompanyDecisions(plan)?{comparisonDecisions:plan.securities.map(company=>({security:company.market+':'+company.symbol,action:plan.output.actions.join(' / '),confidence:confidenceLevels.join(' / '),summary:'这家公司的有条件判断，区分公司质量与当前价格',sourceIds:['该证券本次真实证据ID；不足可为空'],unresolved:'该公司未解问题；没有额外问题写无',falsifiers:['至少1条这家公司可检验的证伪条件']}))}:{}),
   ...(requiresResearchSummary(plan)?{researchSummary:{checks:[{topic:'关键研究问题（3至8项）',assessment:'用简短证据判断说明结论或数据不足，不描述内部思维链',sourceIds:['实际来源ID，例如S1；不足时可为空'],unresolved:'仍待核实的部分；已无额外疑问可写无'}]}}:{}),
   decision:{action:plan.output.actions.join(' / '),summary:'有条件的核心判断',confidence:confidenceLevels.join(' / '),dataAsOf:'YYYY-MM-DD：本次研究截止日期，不冒充行情日期',
    falsifiers:['至少3条具体可检验的证伪条件'],missingData:['缺失信息与影响；无缺失可用空数组'],
    gates:['data','quality','valuation','risk'].map(id=>({id,status:'passed / limited / not_applicable / failed',reason:'资料不足但已披露影响并收敛结论时用limited；failed表示报告仍有实质错误，须修正相关正文、结论及依据后重新评价，不能只改状态'})),
    valuation:{status:'supported / limited / not_applicable',methods:['实际使用的适配主估值；倍数变式、现金流口径与情景不是独立方法；收益率锚仅作辅助'],explanation:'模型适配、三情景和敏感性，或不能可靠估值的原因'},
    portfolio:{status:'reviewed / insufficient / not_applicable',summary:'组合分析边界与结论；信息不全不得给具体仓位'},
    ...(plan.output.schema==='Deep'?{scores:scoring.map(item=>({id:item.id,score:'0至'+item.max+'；资料不足为null',reason:'评分依据或无法评分的原因'}))}:{})}},
  constraints:plan.constraints,
 };
}
export function validateReview(value,{input,plan,sources}){
 const issues=[];
 const check=(path,fn)=>{try{return fn();}catch(error){if(error.validationIssues)issues.push(...error.validationIssues);else issues.push({code:'invalid_review_field',path,message:error.message});}};
 const reject=()=>{if(issues.length)throw Object.assign(new Error([...new Set(issues.map(issue=>issue.message))].join('；')),{code:'review_validation',validationIssues:issues});};
 if(!value||typeof value!=='object'||Array.isArray(value)){check('response',()=>fail('审计结果须为对象'));reject();}
 check('audit',()=>{if(!text(value.audit))fail('审计结果缺少检查记录');});
 let executionAudit;
 const auditNarrative=typeof value.audit==='string'?normalizeSourceReferences(value.audit):'';
 if(plan.execution){
  const rows=check('executionAudit',()=>{
   if(!Array.isArray(value.executionAudit)||value.executionAudit.length!==plan.execution.checks.length)fail('执行审计须完整记录10项检查');
   return plan.execution.checks.map(expected=>{
    const matches=value.executionAudit.filter(item=>item?.id===expected.id),item=matches[0];
    if(matches.length!==1||!['passed','limited','not_applicable','failed'].includes(item.status)||!text(item.reason)||item.reason.length>4000)fail('执行审计项目缺失、重复或没有有效依据：'+expected.title);
    if(item.status==='failed')fail('执行审计未通过：'+expected.title+'；'+item.reason);
    if(expected.id==='action-separation'&&item.status==='not_applicable')fail('执行任务必须区分研究状态与组合动作');
    const reason=normalizeSourceReferences(item.reason.trim());
    return {id:expected.id,title:expected.title,status:item.status,reason,sourceIds:sourceReferenceIds(reason)};
   });
  });
  if(rows&&text(value.audit)){executionAudit=rows;value={...value,audit:value.audit+'\n\n## 执行纪律复核\n\n'+rows.map(row=>'### '+row.title+'\n\n'+({passed:'已检查',limited:'存在限制',not_applicable:'不适用'})[row.status]+'：'+row.reason).join('\n\n')};}
 }
 const normalized=normalizeReviewReferences(value);value=normalized.value;
 let researchSummary;
 if(requiresResearchSummary(plan)){
  researchSummary=check('researchSummary',()=>{
  const checks=value.researchSummary?.checks;
  if(!Array.isArray(checks)||checks.length<3||checks.length>8)fail('研究须提供3至8项公开证据与判断摘要');
  return {checks:checks.map(item=>{
   if(!item||!text(item.topic)||!text(item.assessment)||!text(item.unresolved)||[item.topic,item.assessment,item.unresolved].some(value=>value.length>2500))fail('研究摘要缺少问题、判断或待核实事项');
   const sourceIds=list(item.sourceIds,'研究摘要来源');
   if(!sourceIds.length&&!/不足|缺失|未取得|未读取|待核实|未核实/.test(item.assessment))fail('没有来源的研究摘要须明确数据不足');
   return {topic:item.topic.trim(),assessment:item.assessment.trim(),sourceIds:[...new Set(sourceIds)],unresolved:item.unresolved.trim()};
  }),notice:'公开的证据判断摘要，由模型复核生成；来源编号校验不等于事实独立核实。'};
  });
 }
 check('sections',()=>{if(!Array.isArray(value.sections)||value.sections.length!==plan.output.sections.length)fail('报告章节不符合本次'+plan.output.schema+'交付要求');});
 const sections=plan.output.sections.map(expected=>check('sections.'+expected.id,()=>{
  const matches=(Array.isArray(value.sections)?value.sections:[]).filter(item=>item?.id===expected.id);
  if(matches.length!==1||!text(matches[0].text))fail('报告缺少或重复章节：'+expected.title);
  const body=reportSectionBody(expected.title,matches[0].text);
  if(!text(body))fail('报告章节缺少正文：'+expected.title);
  return {...expected,text:body};
 })).filter(Boolean);
 const d=value.decision??{};
 let comparisonDecisions;
 if(needsCompanyDecisions(plan))comparisonDecisions=check('comparisonDecisions',()=>{
  const rows=value.comparisonDecisions;
  if(!Array.isArray(rows)||rows.length!==plan.securities.length)fail('比较报告必须为每个已选证券分别提供判断');
  return plan.securities.map(company=>{
   const security=company.market+':'+company.symbol,matches=rows.filter(row=>row?.security===security),row=matches[0];
   if(matches.length!==1||!plan.output.actions.includes(row.action)||!confidenceLevels.includes(row.confidence)||!text(row.summary)||!text(row.unresolved))fail('缺少或重复公司判断，或动作/置信度无效：'+security);
   const sourceIds=list(row.sourceIds,'公司判断来源'),falsifiers=list(row.falsifiers,'公司证伪条件',1);
   if(sourceIds.some(id=>{const matches=sources.filter(source=>source.id===id);return matches.length!==1||matches[0].security!==security||!isResearchEvidence(matches[0]);}))fail('公司判断来源不存在、串用其他证券或仅为目录：'+security);
   if(!sourceIds.length&&(!/不足|缺失|未取得|未读取|待核实/.test(row.summary)||row.action!=='观察'||!['低','中低'].includes(row.confidence)))fail('公司依据缺失时须明确数据不足、降低置信度并保留观察：'+security);
   return {security,action:row.action,confidence:row.confidence,summary:row.summary.trim(),sourceIds:[...new Set(sourceIds)],unresolved:row.unresolved.trim(),falsifiers};
  });
 });
 check('decision.action',()=>{if(!plan.output.actions.includes(d.action))fail('研究动作不符合当前模式');});
 check('decision.confidence',()=>{if(!confidenceLevels.includes(d.confidence)||!text(d.summary))fail('研究结论缺少置信度或判断依据');});
 check('decision.dataAsOf',()=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d.dataAsOf||'')||!Number.isFinite(Date.parse(d.dataAsOf))||new Date(d.dataAsOf).toISOString().slice(0,10)!==d.dataAsOf)fail('数据截止日期无效');});
 const falsifiers=check('decision.falsifiers',()=>{const items=list(d.falsifiers,'证伪条件',3);if(new Set(items).size!==items.length)fail('证伪条件不能重复凑数');return items;});
 const missingData=check('decision.missingData',()=>list(d.missingData,'信息缺口'));
 const gates=['data','quality','valuation','risk'].map(id=>check('decision.gates.'+id,()=>{
  const matches=Array.isArray(d.gates)?d.gates.filter(gate=>gate?.id===id):[];
  if(matches.length!==1||!['passed','limited','not_applicable','failed'].includes(matches[0].status)||!text(matches[0].reason))fail('缺少有效审计项目：'+id);
  if(matches[0].status==='failed')fail('审计项目未通过：'+id+'；'+matches[0].reason);
  if(['data','quality'].includes(id)&&matches[0].status==='not_applicable')fail('数据与公司质量必须检查或标记不足');
  return {id,status:matches[0].status,reason:matches[0].reason.trim()};
 })).filter(Boolean);
 if(gates.some(gate=>['data','quality'].includes(gate.id)&&gate.status==='limited')){
  check('decision.confidence',()=>{if(['高','中高'].includes(d.confidence)||['建仓候选','持有候选','升级'].includes(d.action))fail('关键数据或质量受限时，须降低置信度与研究动作强度');});
  check('decision.missingData',()=>{if(missingData&&!missingData.length)fail('受限结论必须列出信息缺口');});
 }
 const valuation=d.valuation;
 const methods=check('decision.valuation',()=>{
 if(!valuation||!['supported','limited','not_applicable'].includes(valuation.status)||!text(valuation.explanation))fail('须说明估值适配、交叉验证或无法估值的原因');
 const methods=list(valuation.methods,'估值方法');
 const policyIssues=valuationIssues({...valuation,methods},plan);
 if(policyIssues.length)fail(policyIssues.join('；'));
 if(valuation.status==='supported'&&!methods.length)fail('估值已有依据时须列出实际方法');

 return methods;
 });
 check('decision.portfolio',()=>{
 if(!d.portfolio||!['reviewed','insufficient','not_applicable'].includes(d.portfolio.status)||!text(d.portfolio.summary))fail('须说明组合动作的适用边界');
 if(!portfolioReadiness(input.portfolioContext).complete&&d.portfolio.status==='reviewed')fail('组合信息未齐，不能交付具体仓位或再平衡结论');
 if(plan.mode==='E'&&!plan.portfolio.complete&&d.portfolio.status!=='insufficient')fail('组合分析须明确尚缺哪些组合信息');
 });
 check('decision.action',()=>{if(plan.mode==='C'&&!input.baseline&&!input.previousResearch?.trim()&&d.action!==(plan.contractVersion>=5?'建立基线':'维持'))fail('缺少旧结论时只能建立本期基线，不能编造升级、降级或剔除变化');});
 let scores;
 if(plan.output.schema==='Deep'){
  scores=check('decision.scores',()=>{
  if(!Array.isArray(d.scores)||d.scores.length!==scoring.length)fail('深度研究须采用Skill规定的六维100分体系');
  return scoring.map(dimension=>{
   const matches=d.scores.filter(score=>score?.id===dimension.id),score=matches[0];
   if(matches.length!==1||!text(score.reason)||(score.score!==null&&(typeof score.score!=='number'||!Number.isFinite(score.score)||score.score<0||score.score>dimension.max)))fail('评分维度或分值无效：'+dimension.label);
   return {...dimension,score:score.score,reason:score.reason};
  });
  });
  const scoreSection=sections.find(section=>section.id==='scores');
  if(scores&&scoreSection){
  const scored=scores.every(item=>item.score!==null);
  scoreSection.text=scores.map(item=>`- **${item.label}：${item.score??'待核实'}${item.score!==null?' / '+item.max:''}**。${item.reason}`).join('\n')+'\n\n'+(scored?'总分：'+scores.reduce((sum,item)=>sum+item.score,0)+' / 100。':'资料不足的维度未计分，不计算总分。')+' 评分用于研究比较，不自动转换为交易或仓位。';
  }
 }
 // Collect independent field and citation problems in one repair request. No
 // partial validation values may reach report assembly when any check failed.
 const companyText=(comparisonDecisions??[]).map(row=>`### ${row.security}\n\n**研究动作：** ${row.action} · **置信度：** ${row.confidence}\n\n${row.summary}\n\n依据：${row.sourceIds.map(id=>'['+id+']').join(' ')||'数据不足'}\n\n待核实：${row.unresolved}\n\n${row.falsifiers.map(item=>'- '+item).join('\n')}`).join('\n\n');
 check('references',()=>validateReportReferences({reportBody:[companyText,typeof d.summary==='string'?d.summary:'',...sections.map(section=>section.text),...(falsifiers??[]),...(missingData??[]),typeof d.portfolio?.summary==='string'?d.portfolio.summary:''].join('\n'),audit:typeof value.audit==='string'?value.audit:'',decision:d,sections,researchSummary},sources));
 reject();
 const decision={action:d.action,summary:d.summary.trim(),confidence:d.confidence,dataAsOf:d.dataAsOf,falsifiers,missingData,gates,
  valuation:{status:valuation.status,methods,explanation:valuation.explanation.trim()},portfolio:{status:d.portfolio.status,summary:d.portfolio.summary.trim()},...(scores?{scores}:{}),
  ...(plan.mode==='C'?{baselineStatus:input.baseline||input.previousResearch?.trim()?'compared':'new_baseline'}:{})};
 const reportBody=['## 研究结论',decision.summary,
  '**研究动作：** '+decision.action+' · **置信度：** '+decision.confidence+' · **研究截止日期：** '+decision.dataAsOf,
  ...sections.map(section=>'## '+section.title+'\n\n'+section.text),
  ...(companyText?['## 逐家公司研究判断',companyText]:[]),
  '## 风险与证伪条件',falsifiers.map((item,index)=>(index+1)+'. '+item).join('\n'),
  '## 信息缺口与研究边界',missingData.length?missingData.map(item=>'- '+item).join('\n'):'本次复核未列出额外缺口；资料覆盖与模型复核边界见审计记录。',
  decision.portfolio.summary].join('\n\n');
 const report='# '+input.question.replace(/[\r\n]+/g,' ')+'\n\n'+reportBody;
 if(report.length>500000||value.audit.length>100000)fail('报告或审计内容超出交付上限');
 const cited=validateReportReferences({reportBody,audit:value.audit,decision,sections,researchSummary},sources);
 return {report,audit:value.audit.trim(),...(executionAudit?{executionAudit,auditNarrative}:{}),decision,sections,...(researchSummary?{researchSummary}:{}),...(comparisonDecisions?{comparisonDecisions}:{}),
  validation:{checkedAt:new Date().toISOString(),checks:[{id:'sections',label:'按主模式交付报告章节',passed:true},{id:'decision',label:'研究动作、置信度与证伪条件完整',passed:true},{id:'valuation',label:'估值方法与交叉验证边界已检查',passed:true},{id:'portfolio',label:'组合信息与动作权限一致',passed:true},{id:'references',label:'正文引用已关联资料，来源编号有效',passed:true}],citedSourceIds:cited,referenceFormatNormalized:normalized.changed,
   scope:'程序校验交付结构、动作边界与来源编号；各项证据评价来自模型复核，不等于事实被独立证实'}};
}
