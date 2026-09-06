import {scoring,confidenceLevels,portfolioReadiness} from '../shared/research-framework.mjs';

const text=value=>typeof value==='string'&&Boolean(value.trim());
const fail=message=>{throw new Error(message);};
const list=(value,label,min=0)=>{
 if(!Array.isArray(value)||value.length<min||value.length>80||value.some(item=>!text(item)))fail(label+'格式无效');
 return value.map(item=>item.trim());
};
export function reviewContract(plan){
 return {
  instruction:'只返回JSON。每个section使用指定id，text为该章节Markdown；缺失不能填造，写明数据不足及原因。researchAction表示研究状态，不代表交易指令。',
  sections:plan.output.sections,
  schema:{sections:[{id:'按上方section id',text:'章节Markdown'}],audit:'复核过程、限制和未核实事项',
   ...(plan.mode==='A'&&plan.contractVersion>=3?{researchSummary:{checks:[{topic:'关键研究问题（3至8项）',assessment:'用简短证据判断说明结论或数据不足，不描述内部思维链',sourceIds:['实际来源ID，例如S1；不足时可为空'],unresolved:'仍待核实的部分；已无额外疑问可写无'}]}}:{}),
   decision:{action:plan.output.actions.join(' / '),summary:'有条件的核心判断',confidence:confidenceLevels.join(' / '),dataAsOf:'YYYY-MM-DD：本次研究截止日期，不冒充行情日期',
    falsifiers:['至少3条具体可检验的证伪条件'],missingData:['缺失信息与影响；无缺失可用空数组'],
    gates:['data','quality','valuation','risk'].map(id=>({id,status:'passed / limited / not_applicable / failed',reason:'依据或不足；failed须先修正才能交付'})),
    valuation:{status:'supported / limited / not_applicable',methods:['实际使用的方法；市赚率变式不是独立估值'],explanation:'模型适配、三情景和敏感性，或不能可靠估值的原因'},
    portfolio:{status:'reviewed / insufficient / not_applicable',summary:'组合分析边界与结论；信息不全不得给具体仓位'},
    ...(plan.output.schema==='Deep'?{scores:scoring.map(item=>({id:item.id,score:'0至'+item.max+'；资料不足为null',reason:'评分依据或无法评分的原因'}))}:{})}},
  constraints:plan.constraints,
 };
}
export function validateReview(value,{input,plan,sources}){
 if(!value||typeof value!=='object'||!text(value.audit))fail('审计结果缺少检查记录');
 let researchSummary;
 if(plan.mode==='A'&&plan.contractVersion>=3){
  const checks=value.researchSummary?.checks;
  if(!Array.isArray(checks)||checks.length<3||checks.length>8)fail('快筛须提供3至8项公开证据与判断摘要');
  researchSummary={checks:checks.map(item=>{
   if(!item||!text(item.topic)||!text(item.assessment)||!text(item.unresolved)||[item.topic,item.assessment,item.unresolved].some(value=>value.length>2500))fail('研究摘要缺少问题、判断或待核实事项');
   const sourceIds=list(item.sourceIds,'研究摘要来源');
   if(sourceIds.some(id=>!sources.some(source=>source.id===id&&!['filing-index','data-check','search-result','search-summary'].includes(source.type))))fail('研究摘要引用了无效证据来源');
   if(!sourceIds.length&&!/不足|缺失|未取得|未读取|待核实|未核实/.test(item.assessment))fail('没有来源的研究摘要须明确数据不足');
   return {topic:item.topic.trim(),assessment:item.assessment.trim(),sourceIds:[...new Set(sourceIds)],unresolved:item.unresolved.trim()};
  }),notice:'公开的证据判断摘要，由模型复核生成；来源编号校验不等于事实独立核实。'};
 }
 if(!Array.isArray(value.sections)||value.sections.length!==plan.output.sections.length)fail('报告章节不符合本次'+plan.output.schema+'交付要求');
 const sections=plan.output.sections.map(expected=>{
  const matches=value.sections.filter(item=>item?.id===expected.id);
  if(matches.length!==1||!text(matches[0].text))fail('报告缺少或重复章节：'+expected.title);
  return {...expected,text:matches[0].text.trim()};
 });
 const d=value.decision;
 if(!d||!plan.output.actions.includes(d.action))fail('研究动作不符合当前模式');
 if(!confidenceLevels.includes(d.confidence)||!text(d.summary))fail('研究结论缺少置信度或判断依据');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.dataAsOf||'')||!Number.isFinite(Date.parse(d.dataAsOf))||new Date(d.dataAsOf).toISOString().slice(0,10)!==d.dataAsOf)fail('数据截止日期无效');
 const falsifiers=list(d.falsifiers,'证伪条件',3);
 if(new Set(falsifiers).size!==falsifiers.length)fail('证伪条件不能重复凑数');
 const missingData=list(d.missingData,'信息缺口');
 const gates=['data','quality','valuation','risk'].map(id=>{
  const matches=Array.isArray(d.gates)?d.gates.filter(gate=>gate?.id===id):[];
  if(matches.length!==1||!['passed','limited','not_applicable','failed'].includes(matches[0].status)||!text(matches[0].reason))fail('缺少有效审计项目：'+id);
  if(matches[0].status==='failed')fail('审计项目未通过：'+id+'；'+matches[0].reason);
  if(['data','quality'].includes(id)&&matches[0].status==='not_applicable')fail('数据与公司质量必须检查或标记不足');
  return {id,status:matches[0].status,reason:matches[0].reason.trim()};
 });
 if(gates.some(gate=>['data','quality'].includes(gate.id)&&gate.status==='limited')){
  if(['高','中高'].includes(d.confidence)||['建仓候选','持有候选','升级'].includes(d.action))fail('关键数据或质量受限时，须降低置信度与研究动作强度');
  if(!missingData.length)fail('受限结论必须列出信息缺口');
 }
 const valuation=d.valuation;
 if(!valuation||!['supported','limited','not_applicable'].includes(valuation.status)||!text(valuation.explanation))fail('须说明估值适配、交叉验证或无法估值的原因');
 const methods=list(valuation.methods,'估值方法');
 if(valuation.status==='supported'&&!methods.length)fail('估值已有依据时须列出实际方法');
 if(plan.mode==='B'&&plan.depth==='Deep'&&valuation.status==='supported'){
  const families=new Set(methods.map(method=>/P2|市赚率|市盈率|市净率|^PE$|^PB$/i.test(method)?'multiples':method.trim().toLowerCase()));
  if(families.size<2)fail('深度研究须独立方法交叉验证；仅一法时标记limited并解释例外，市赚率变式不算独立方法');
 }
 if(!d.portfolio||!['reviewed','insufficient','not_applicable'].includes(d.portfolio.status)||!text(d.portfolio.summary))fail('须说明组合动作的适用边界');
 if(!portfolioReadiness(input.portfolioContext).complete&&d.portfolio.status==='reviewed')fail('组合信息未齐，不能交付具体仓位或再平衡结论');
 if(plan.mode==='E'&&!plan.portfolio.complete&&d.portfolio.status!=='insufficient')fail('组合分析须明确尚缺哪些组合信息');
 if(plan.mode==='C'&&!input.baseline&&!input.previousResearch?.trim()&&d.action!=='维持')fail('缺少旧结论时只能建立本期基线，不能编造升级、降级或剔除变化');
 let scores;
 if(plan.output.schema==='Deep'){
  if(!Array.isArray(d.scores)||d.scores.length!==scoring.length)fail('深度研究须采用Skill规定的六维100分体系');
  scores=scoring.map(dimension=>{
   const matches=d.scores.filter(score=>score?.id===dimension.id),score=matches[0];
   if(matches.length!==1||!text(score.reason)||(score.score!==null&&(typeof score.score!=='number'||!Number.isFinite(score.score)||score.score<0||score.score>dimension.max)))fail('评分维度或分值无效：'+dimension.label);
   return {...dimension,score:score.score,reason:score.reason};
  });
  const scoreSection=sections.find(section=>section.id==='scores');
  const scored=scores.every(item=>item.score!==null);
  scoreSection.text=scores.map(item=>`- **${item.label}：${item.score??'待核实'}${item.score!==null?' / '+item.max:''}**。${item.reason}`).join('\n')+'\n\n'+(scored?'总分：'+scores.reduce((sum,item)=>sum+item.score,0)+' / 100。':'资料不足的维度未计分，不计算总分。')+' 评分用于研究比较，不自动转换为交易或仓位。';
 }
 const decision={action:d.action,summary:d.summary.trim(),confidence:d.confidence,dataAsOf:d.dataAsOf,falsifiers,missingData,gates,
  valuation:{status:valuation.status,methods,explanation:valuation.explanation.trim()},portfolio:{status:d.portfolio.status,summary:d.portfolio.summary.trim()},...(scores?{scores}:{}),
  ...(plan.mode==='C'?{baselineStatus:input.baseline||input.previousResearch?.trim()?'compared':'new_baseline'}:{})};
 const reportBody=['## 研究结论',decision.summary,
  '**研究动作：** '+decision.action+' · **置信度：** '+decision.confidence+' · **研究截止日期：** '+decision.dataAsOf,
  ...sections.map(section=>'## '+section.title+'\n\n'+section.text),
  '## 风险与证伪条件',falsifiers.map((item,index)=>(index+1)+'. '+item).join('\n'),
  '## 信息缺口与研究边界',missingData.length?missingData.map(item=>'- '+item).join('\n'):'本次复核未列出额外缺口；资料覆盖与模型复核边界见审计记录。',
  decision.portfolio.summary].join('\n\n');
 const report='# '+input.question.replace(/[\r\n]+/g,' ')+'\n\n'+reportBody;
 if(report.length>500000||value.audit.length>100000)fail('报告或审计内容超出交付上限');
 const cited=[...JSON.stringify({report:reportBody,audit:value.audit,decision,researchSummary}).matchAll(/\[(S\d+)\]/g)].map(match=>match[1]);
 cited.push(...(researchSummary?.checks.flatMap(item=>item.sourceIds)??[]));
 if(cited.some(id=>!sources.some(source=>source.id===id&&!['search-result','search-summary'].includes(source.type))))fail('报告或审计引用了不存在的资料ID或搜索摘要');
 if(sources.length&&!/\[S\d+\]/.test(reportBody))fail('报告正文未关联资料ID');
 return {report,audit:value.audit.trim(),decision,sections,...(researchSummary?{researchSummary}:{}),
  validation:{checkedAt:new Date().toISOString(),checks:[{id:'sections',label:'按主模式交付报告章节',passed:true},{id:'decision',label:'研究动作、置信度与证伪条件完整',passed:true},{id:'portfolio',label:'组合信息与动作权限一致',passed:true},{id:'references',label:'引用的来源编号有效',passed:true}],citedSourceIds:[...new Set(cited)],
   scope:'程序校验交付结构、动作边界与来源编号；各项证据评价来自模型复核，不等于事实被独立证实'}};
}
