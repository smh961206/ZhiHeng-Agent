import {normalizeSourceReferences,sourceReferenceIds} from './research-references.mjs';
import {evidenceBlocks} from './evidence-search.mjs';

const privateKeys=new Set(['reasoning_content','reasoning','chainOfThought','hiddenReasoning','messages','apiKey','api_key','authorization','prompt','systemPrompt']);
export function independentContextData(value){
 if(Array.isArray(value))return value.map(independentContextData);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!privateKeys.has(key)).map(([key,item])=>[key,independentContextData(item)]));
 return value;
}
export const independentContextError=()=>Object.assign(new Error('独立复核缺少完整的原时点证据或来源关联；保留原研究进度'),{code:'flagship_context_invalid'});
export function independentTimestamp(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value.slice(0,10)).toISOString().slice(0,10)===value.slice(0,10);
}
export function buildIndependentContext({cutoff,sources=[],evidence=[],tools=[],conclusions=[]}={}){
 const fail=()=>{throw independentContextError();};
 if(!independentTimestamp(cutoff)||!evidence.length||!conclusions.length)fail();
 const sourceMap=new Map(sources.map(s=>[s.id,s]));if(sourceMap.size!==sources.length)fail();
 const entries=evidence.map(e=>{
  const source=sourceMap.get(e.id);
  if(!source||!independentTimestamp(source.publishedAt)||Date.parse(source.publishedAt)>Date.parse(cutoff)||typeof e.blockId!=='string'||!e.blockId||typeof e.text!=='string'||!e.text.trim()||source.truncated===true)fail();
  const blocks=evidenceBlocks(source).filter(b=>b.id===e.blockId),block=blocks[0];
  if(blocks.length!==1||typeof block.text!=='string'||!e.text.includes(block.text)||block.truncated||block.method==='ocr'||e.referenceAmbiguous||['search-result','search-summary','filing-index','data-check'].includes(source.type))fail();
  return {id:e.id,blockId:e.blockId,page:block.page??null,text:block.text,publishedAt:source.publishedAt,...(block.context?{context:block.context}:{})};
 });
 if(new Set(entries.map(e=>`${e.id}:${e.blockId}`)).size!==entries.length)fail();
 const records=tools.map(t=>{
  if(typeof t.toolCallId!=='string'||!t.toolCallId||typeof t.toolName!=='string'||t.result==null||t.result.error)fail();
  const refs=t.result.basis?.sourceIds??[];
  if(refs.some(id=>!entries.some(e=>e.id===id)))fail();
  if((t.result.basis?.evidenceBlocks??[]).some(ref=>!entries.some(e=>e.id===ref.sourceId&&e.blockId===ref.blockId)))fail();
  return {toolCallId:t.toolCallId,toolName:t.toolName,arguments:independentContextData(t.arguments??{}),result:independentContextData(t.result)};
 });
 if(new Set(records.map(t=>t.toolCallId)).size!==records.length)fail();
 const context=buildResearchContext({evidence:entries,tools:records,evidenceBudget:80000,toolBudget:80000});
 if(context.window.omittedEvidence.length||context.window.omittedTools.length)fail();
 const completed=conclusions.map(c=>{if(typeof c!=='string'||!c.trim()||c.length>80000)fail();return c;});
 return {version:1,cutoff,evidence:context.evidence,tools:context.tools,conclusions:completed};
}

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
