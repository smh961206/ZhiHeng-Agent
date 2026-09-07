const contextTypes=new Set(['filing-index','data-check']);
const excludedTypes=new Set(['search-result','search-summary']);
export const isResearchEvidence=source=>!contextTypes.has(source.type)&&!excludedTypes.has(source.type);
export const sourceReferenceRules='引用协议：报告正文的事实与财务数字须紧邻实际资料编号，统一写成[S1]；表格在对应行的来源列写[S1]，多来源写[S1] [S2]。PDF页码、证据块、XBRL标签和报告期另行保留，不能代替资料编号。只引用本次已读取且确实支持该判断的证据；来源目录不代表已核实。filing-index和data-check只可说明覆盖与缺口，不能作为财务事实或researchSummary的依据；搜索摘要不能引用。researchSummary.checks[].sourceIds中的编号不能代替sections[].text中的正文引用。没有支持证据的判断须删除或标明数据不足，不得为通过检查任意补挂编号。';
export function referenceContract(sources=[]){
 return {rules:sourceReferenceRules,format:'[S1]；多来源：[S1] [S2]；PDF示例：[S1] 第80页（实际报告期）',
  evidenceSourceIds:sources.filter(isResearchEvidence).map(source=>source.id),
  coverageOnlySourceIds:sources.filter(source=>contextTypes.has(source.type)).map(source=>source.id),
  notice:'编号可用不等于该资料支持当前事实；须依据已读取原文匹配。'};
}

// Visit visible Markdown text only. Examples in code, image labels and link
// destinations must neither acquire citations nor satisfy the citation gate.
function mapMarkdown(text,transform){
 let fence;
 return text.split('\n').map(line=>{
  const marker=line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if(fence){if(marker&&marker[1][0]===fence[0]&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;return line;}
  if(marker){fence=marker[1];return line;}
  const protectedText=[];
  let prefix='\uE000';while(line.includes(prefix))prefix+='\uE000';
  const masked=line.replace(/(`+)[^\n]*?\1|!\[[^\]\n]*\]\([^\)\n]*\)|(?<=\])\([^\)\n]*\)|<[^>\n]*>|https?:\/\/[^\s<>]+/g,match=>{
   const token=prefix+protectedText.length+'\uE001';protectedText.push([token,match]);return token;
  });
  return protectedText.reduce((value,[token,original])=>value.replaceAll(token,original),transform(masked));
 }).join('\n');
}
const idList='S\\d+(?:\\s*[,，、/;；]\\s*S\\d+)*';
const page='(?:\\s+(?:[pP]{1,2}\\.?\\s*\\d+(?:\\s*[-–—]\\s*\\d+)?|第\\s*\\d+(?:\\s*[-–—]\\s*\\d+)?\\s*页))?';
const reference=new RegExp('^('+idList+')('+page+')$');
const renderReference=value=>{
 const match=value.trim().match(reference);
 return match?match[1].match(/S\d+/g).map(id=>'['+id+']').join(' ')+(match[2]?' '+match[2].trim():''):null;
};
export function normalizeSourceReferences(text){
 let previous='',columns=[];
 return mapMarkdown(text,line=>{
  // Only source-labelled table columns can turn bare S numbers into citations.
  const cells=line.split('|');
  if(cells.length>1&&cells.filter(cell=>cell.trim()).every(cell=>/^:?-{3,}:?$/.test(cell.trim()))){
   columns=previous.split('|').flatMap((cell,index)=>/^(?:来源|资料来源|数据来源|证据来源|资料ID|sources?|references?)$/i.test(cell.trim())?[index]:[]);
  }else if(cells.length>1&&columns.length){
   for(const column of columns){const normalized=renderReference(cells[column]??'');if(normalized)cells[column]=' '+normalized+' ';}
   line=cells.join('|');
  }else columns=[];
  previous=line;
  return line.replace(/(?<!\\)(?:\[([^\[\]\n]+)\]|【([^【】\n]+)】|［([^［］\n]+)］|（([^（）\n]+)）|\(([^()\n]+)\))/g,
   (original,...groups)=>renderReference(groups.slice(0,5).find(value=>value!==undefined))??original);
 });
}
export function sourceReferenceIds(text){
 const ids=[];
 mapMarkdown(text,line=>{ids.push(...[...line.matchAll(/(?<!\\)\[(S\d+)\]/g)].map(match=>match[1]));return line;});
 return [...new Set(ids)];
}

export function normalizeReviewReferences(value){
 let changed=false;
 const normalize=text=>{
  if(typeof text!=='string')return text;
  const result=normalizeSourceReferences(text);changed||=result!==text;return result;
 };
 const record=(item,fields)=>!item||typeof item!=='object'?item:Object.fromEntries(Object.entries(item).map(([key,value])=>[key,fields.includes(key)?normalize(value):value]));
 const array=(items,transform)=>Array.isArray(items)?items.map(transform):items;
 const decision=record(value.decision,['summary']);
 if(decision&&typeof decision==='object'){
  for(const key of ['falsifiers','missingData'])decision[key]=array(decision[key],normalize);
  for(const key of ['gates','scores'])if(key in decision)decision[key]=array(decision[key],item=>record(item,['reason']));
  decision.valuation=record(decision.valuation,['explanation']);decision.portfolio=record(decision.portfolio,['summary']);
 }
 const normalized={...value,audit:normalize(value.audit),sections:array(value.sections,item=>record(item,['text'])),decision};
 if(value.researchSummary)normalized.researchSummary={...value.researchSummary,checks:array(value.researchSummary.checks,item=>record(item,['topic','assessment','unresolved']))};
 if(value.comparisonDecisions)normalized.comparisonDecisions=array(value.comparisonDecisions,item=>({...record(item,['summary','unresolved']),falsifiers:array(item?.falsifiers,normalize)}));
 return {value:normalized,changed};
}

export function validateReportReferences({reportBody,audit,decision,sections,researchSummary},sources){
 const catalog=new Map(sources.map(source=>[source.id,source]));
 const textFields=(value,path)=>typeof value==='string'?[{path,text:value}]:value&&typeof value==='object'?Object.entries(value).flatMap(([key,item])=>textFields(item,path+'.'+key)):[];
 const fields=[{path:'report',text:reportBody},{path:'audit',text:audit},
  ...sections.map(section=>({path:'sections.'+section.id+'.text',text:section.text})),
  ...textFields(decision,'decision'),
  ...(researchSummary?.checks.flatMap((item,index)=>textFields({topic:item.topic,assessment:item.assessment,unresolved:item.unresolved},`researchSummary.checks[${index}]`))??[])];
 const issues=[],cited=new Set();
 for(const field of fields){
  const ids=sourceReferenceIds(field.text);ids.forEach(id=>cited.add(id));
  const invalid=ids.filter(id=>!catalog.has(id)||excludedTypes.has(catalog.get(id).type));
  if(invalid.length)issues.push({code:'invalid_reference',path:field.path,sourceIds:invalid,message:'报告或审计引用了不存在的资料ID或搜索摘要'});
 }
 for(const [index,item] of (researchSummary?.checks??[]).entries()){
  item.sourceIds.forEach(id=>cited.add(id));
  const invalid=item.sourceIds.filter(id=>!catalog.has(id)||!isResearchEvidence(catalog.get(id)));
  if(invalid.length)issues.push({code:'invalid_summary_reference',path:`researchSummary.checks[${index}].sourceIds`,sourceIds:invalid,message:'研究摘要引用了无效证据来源'});
 }
 const bodyIds=sourceReferenceIds(reportBody);
 if(sources.length&&!bodyIds.some(id=>catalog.has(id)&&isResearchEvidence(catalog.get(id)))){
  issues.push({code:'missing_body_reference',path:'sections[].text',sourceIds:bodyIds,message:bodyIds.length?'报告正文未关联有效财务证据；目录、覆盖检查或无效编号不能替代证据':'报告正文未关联资料ID'});
 }
 if(issues.length)throw Object.assign(new Error([...new Set(issues.map(issue=>issue.message))].join('；')),{validationIssues:issues});
 return [...cited];
}

export function reviewRepairMessage(error,sources){
 if(error.code==='review_json'||['model_output_truncated','model_stream_incomplete'].includes(error.code))return '审计输出未能完整解析：'+error.message+'。这是格式或传输问题，不代表研究结论错误。依据同一份草稿、资料和交付协议重新返回完整JSON对象，不接续残缺片段。\n'+
  JSON.stringify({issues:error.validationIssues??[],instruction:'只输出一个JSON对象，不添加说明或代码围栏。字符串内的双引号、反斜杠、换行必须正确转义。保留全部必需章节与字段，删去重复叙述以控制长度；不编造数值、日期、引用或证据，不将failed改成passed来凑格式。完成格式修复后仍须复查原交付协议与引用规则。'});
 return '程序交付检查未通过：'+(error instanceof SyntaxError?'审计返回JSON格式无效':error.message)+'。依据已有证据修正，不能伪造缺失字段或提高结论强度。重新输出完整JSON。\n'+
  JSON.stringify({issues:error.validationIssues??[],references:referenceContract(sources),instruction:'逐项修正本次列出的全部问题，并复查完整协议。研究动作只能选择原协议中的一个完整选项；dataAsOf只写真实研究截止日YYYY-MM-DD，日期说明放正文。资料不足但已披露影响并收敛判断可标limited，同时保持较低置信度和适用的研究动作。failed意味着报告仍有实质错误，须先修正正文和结论，不能只改状态来通过。保留已有效关联的正文引用；摘要和审计中的引用不能代替正文引用。仅在已读证据支持时补回实际编号；无法核实的事实删除或标明数据不足，保留缺口及影响。'});
}
