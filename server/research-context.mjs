import {normalizeSourceReferences,sourceReferenceIds} from './research-references.mjs';

// Pack complete records, never arbitrary slices of JSON, tables or tool output.
// This is a model input window, not a claim of complete document verification.
function pack(records,budget){
 const included=[],omitted=[];let used=2;
 for(const record of records){
  const size=JSON.stringify(record).length+(included.length?1:0);
  if(used+size<=budget){included.push(record);used+=size;}else omitted.push(record);
 }
 return {included,omitted,characters:used};
}
const evidenceKey=entry=>`${entry.id}:${entry.blockId}`;
export function buildResearchContext({evidence=[],tools=[],draft='',evidenceBudget=40000,toolBudget=40000}={}){
 for(const budget of [evidenceBudget,toolBudget])if(!Number.isInteger(budget)||budget<2)throw new Error('证据窗口预算无效');
 const cited=sourceReferenceIds(normalizeSourceReferences(draft)),citedSet=new Set(cited);
 const unique=[...new Map(evidence.map(entry=>[evidenceKey(entry),entry])).values()];
 const calculations=tools.filter(item=>item.toolName?.startsWith('calculate_'));
 // A failed attempt is still retained, but must not displace a later usable
 // result. Never merge scenarios just because they called the same tool.
 const records=pack([...calculations.filter(item=>!item.result?.error).reverse(),...calculations.filter(item=>item.result?.error).reverse(),...tools.filter(item=>!item.toolName?.startsWith('calculate_')).reverse()],toolBudget);
 const includedCalculations=records.included.filter(item=>item.toolName?.startsWith('calculate_')&&!item.result?.error);
 const calculationSources=new Set(includedCalculations.flatMap(item=>item.result?.basis?.sourceIds??[]));
 const calculationBlocks=new Set(includedCalculations.flatMap(item=>item.result?.basis?.evidenceBlocks??[]).map(({sourceId,blockId})=>evidenceKey({id:sourceId,blockId})));
 // First round gives each cited source a complete excerpt; remaining excerpts
 // follow in rounds by source so one long report cannot crowd out a comparison.
 const groups=new Map();
 for(const entry of unique){if(!groups.has(entry.id))groups.set(entry.id,[]);groups.get(entry.id).push(entry);}
 const priority=id=>Number(calculationSources.has(id))*2+Number(citedSet.has(id));
 const ordered=[...groups.entries()].sort(([a],[b])=>priority(b)-priority(a));
 const balanced=[];
 for(let round=0;ordered.some(([,items])=>items[round]);round++)for(const [,items] of ordered)if(items[round])balanced.push(items[round]);
 const excerpts=pack([...balanced.filter(entry=>calculationBlocks.has(evidenceKey(entry))),...balanced.filter(entry=>!calculationBlocks.has(evidenceKey(entry)))],evidenceBudget);
 const includedIds=new Set(excerpts.included.map(entry=>entry.id));
 const includedKeys=new Set(excerpts.included.map(evidenceKey)),retrievedKeys=new Set(unique.map(evidenceKey));
 const calculationEvidence=includedCalculations.map(item=>({toolName:item.toolName,toolCallId:item.toolCallId,
  sourceIdsWithoutExcerpt:[...new Set(item.result?.basis?.sourceIds??[])].filter(id=>!includedIds.has(id)),
  missingBlocks:(item.result?.basis?.evidenceBlocks??[]).filter(ref=>!includedKeys.has(evidenceKey({id:ref.sourceId,blockId:ref.blockId}))).map(ref=>({...ref,reason:retrievedKeys.has(evidenceKey({id:ref.sourceId,blockId:ref.blockId}))?'window-limit':'not-retrieved'})),
 }));
 const omittedEvidence=excerpts.omitted.map(({id,blockId,page})=>({sourceId:id,blockId,page}));
 const omittedTools=records.omitted.map(({toolName,toolCallId})=>({toolName,toolCallId}));
 return {
  evidence:excerpts.included,tools:records.included,
  window:{evidenceTotal:unique.length,evidenceIncluded:excerpts.included.length,toolsTotal:tools.length,toolsIncluded:records.included.length,
   evidenceCharacters:excerpts.characters,toolCharacters:records.characters,
   omittedEvidence,omittedTools,citedSourcesWithoutExcerpt:cited.filter(id=>!includedIds.has(id)),calculationEvidence,
   notice:'本窗口仅含实际检索和工具返回的完整记录；优先纳入成功计算及其指定原文，失败记录和其他场景不因此失效。calculationEvidence列出窗口中仍缺少的计算依据；同一来源的其他片段不能代替指定原文。未纳入片段、未读取页面及未返回字段均不能声称已复核。目录编号不等于事实依据；缺失的关键依据应补查或在报告中保留限制。'},
 };
}
