import {savedKnowledgeMatches} from './knowledge.mjs';
import {frameworkVersion} from '../shared/research-framework.mjs';
// Internal model conversations are persisted only in the private job payload.
export const resumeScope=job=>JSON.stringify({frameworkVersion,mode:job.mode,question:job.input?.question,securities:job.input?.securities,depth:job.input?.depth,historyYears:job.input?.historyYears,...(job.plan?.knowledgeSnapshot?{knowledgeSnapshot:job.plan.knowledgeSnapshot}:{})});
const changedRules=job=>!savedKnowledgeMatches(job.plan);
const changedFramework=job=>Boolean(job.plan?.version&&job.plan.version!==frameworkVersion);
const validCheckpoint=job=>!changedRules(job)&&job.checkpoint?.version===1&&job.checkpoint.scope===resumeScope(job)
 &&['research','review'].includes(job.checkpoint.phase)&&Array.isArray(job.checkpoint.toolRecords)&&Array.isArray(job.checkpoint.evidence)
 &&(job.checkpoint.phase!=='review'||typeof job.checkpoint.draft==='string'&&Boolean(job.checkpoint.draft.trim()));
const hasLegacyProgress=job=>!changedFramework(job)&&!changedRules(job)&&!job.checkpoint&&job.workflow?.stages?.some(s=>s.id==='evidence'&&s.status==='completed')&&job.input?.sources?.length;
function legacyRecords(job){
 const calls=new Map(),records=new Map();
 for(const event of job.events??[]){
  if(event.type==='tool'&&event.toolCallId)calls.set(event.toolCallId,event);
  if(event.type==='tool_result'&&event.toolCallId&&event.result!==undefined){const call=calls.get(event.toolCallId);if(call?.toolName===event.toolName)records.set(event.toolCallId,{toolName:event.toolName,toolCallId:event.toolCallId,arguments:call.arguments,result:event.result});}
 }
 return [...records.values()];
}
export function researchResume(job){
 if(changedFramework(job)||changedRules(job))return null;
 const checkpoint=job.checkpoint;
 if(validCheckpoint(job))return structuredClone(checkpoint);
 if(checkpoint)return null;
 // Older jobs predate model-conversation checkpoints. Rebuild context only
 // from actual saved tool inputs/outputs, never from a partial streamed draft.
 if(!hasLegacyProgress(job))return null;
 const records=legacyRecords(job);
 const draft=typeof job.draft==='string'?job.draft:'';
 return {version:1,scope:resumeScope(job),phase:draft.trim()?'review':'research',origin:'history',turn:0,draft,toolRecords:records,evidence:records.flatMap(record=>record.result?.matches??[])};
}
export function resumeSummary(job){
 if(job.status==='completed')return {available:false};
 if(changedFramework(job))return {available:false,reason:'framework_changed',fromVersion:job.plan.version,toVersion:frameworkVersion};
 if(changedRules(job))return {available:false,reason:'rules_changed',toVersion:frameworkVersion};
 const valid=validCheckpoint(job);
 if(!valid&&!hasLegacyProgress(job))return {available:false};
 const records=valid?job.checkpoint.toolRecords:legacyRecords(job);
 return {available:true,phase:valid?job.checkpoint.phase:job.draft?.trim()?'review':'research',origin:valid?job.checkpoint.origin||'checkpoint':'history',
  sourceCount:job.input?.sources?.length??0,toolCount:records.length,
  calculationCount:records.filter(record=>record.toolName?.startsWith('calculate_')&&record.result!=null&&!record.result.error).length};
}
export function pendingToolCalls(messages=[]){
 const lastAssistant=messages.findLastIndex(message=>message.role==='assistant');
 if(lastAssistant<0)return [];
 const completed=new Set(messages.slice(lastAssistant+1).filter(message=>message.role==='tool').map(message=>message.tool_call_id));
 return (messages[lastAssistant].tool_calls??[]).filter(call=>!completed.has(call.id));
}
