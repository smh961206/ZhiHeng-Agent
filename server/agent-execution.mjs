import {buildResearchContext} from './research-context.mjs';
import {recordedFinancialCoverage} from '../shared/financial-coverage.mjs';
import {toolResultHasGap} from '../shared/research-execution-checks.mjs';
// Only public research tasks and receipts are retained here, never private reasoning.
export const executionProperties={objective:{type:'string'},hypotheses:{type:'array',maxItems:4,items:{type:'string'}},steps:{type:'array',minItems:1,maxItems:12,items:{type:'object',properties:{id:{type:'string'},question:{type:'string'},status:{type:'string',enum:['pending','in_progress','completed','blocked']},evidenceIds:{type:'array',items:{type:'string'}},toolCallIds:{type:'array',items:{type:'string'}},note:{type:'string'}},required:['id','question','status','evidenceIds','toolCallIds','note'],additionalProperties:false}}};
export const executionRules='采用可公开的计划→定向取证→原数核对→计算→复核循环。用update_research_plan保存待验证问题、竞争性解释、当前步骤及阻碍；这是任务清单，不是私有思维链。已确认A股标的存在产销、股本、分红实施或回购缺口时，用read_official_disclosures按主题与日期补读官方公告，再用search_evidence或read_source_pages核对新增来源；部分读取、无结果、归档复用均须如实保留。关键表格不能只靠关键词片段，使用read_source_pages定向读页，文字有歧义时用visual视图请求Vision转写。关键计算前用verify_financial_inputs核对原数与所引片段，匹配只说明原数出现，不能证明行列/期间/经济含义正确。快筛可以调用calculate_valuation_snapshot复算PE/PB/TTM及敏感性，必须声明报价对应的股类、股数和权益口径；A股价乘全体普通股数不是两地实际总市值。归母权益与普通股权益分开，其他权益工具仅扣除一次；敏感性不是合理价值，不用完整DCF替代快筛。每次工具错误先看具体限制，修正参数或改查其他已授权来源，不重复同样失败请求。用get_research_status查看实际覆盖、失败和剩余预算。预算临近结束时交付已确认内容和缺口，不编造补齐。';
export function executionBudget(plan={}){
 const turns=plan.mode==='A'||plan.depth==='Quick'?24:plan.depth==='Deep'?48:32;
 return {maxTurns:turns,maxToolCalls:turns*8,maxTargetPages:16};
}
export function updateExecutionPlan(args,{job,records=[]}){
 const text=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max;
 if(!text(args.objective,1000)||!Array.isArray(args.hypotheses)||args.hypotheses.length>4||args.hypotheses.some(v=>!text(v,700))||!Array.isArray(args.steps)||!args.steps.length||args.steps.length>12)throw new Error('公开计划须包含目标、最多4项待验证解释与1至12个步骤');
 const ids=new Set(),sources=new Set(job.input.sources.map(s=>s.id));
 for(const step of args.steps){
  if(!text(step.id,80)||ids.has(step.id)||!text(step.question,1000)||!['pending','in_progress','completed','blocked'].includes(step.status)||typeof step.note!=='string'||step.note.length>1500)throw new Error('计划步骤标识、问题或状态无效');
  ids.add(step.id);
  if(!Array.isArray(step.evidenceIds)||step.evidenceIds.length>30||step.evidenceIds.some(id=>!sources.has(id))||!Array.isArray(step.toolCallIds)||step.toolCallIds.length>30||step.toolCallIds.some(id=>!records.some(r=>r.toolCallId===id&&!r.result?.error)))throw new Error('计划只能引用本次存在的来源与已返回非错误结果的调用');
  if(step.status==='completed'&&!step.toolCallIds.length)throw new Error('完成的核对步骤须关联实际工具返回；尚无记录请保持待处理');
 }
 const plan={revision:(job.agentPlan?.revision??0)+1,updatedAt:new Date().toISOString(),objective:args.objective,hypotheses:args.hypotheses,steps:args.steps,notice:'Agent声明的公开执行计划；步骤完成不代表事实已独立核实。'};
 job.agentPlan=structuredClone(plan);return plan;
}
export function researchStatus(job,records,budget,turn){
 return {budget:{...budget,turnsUsed:turn,turnsRemaining:Math.max(0,budget.maxTurns-turn),toolCallsUsed:records.length,toolCallsRemaining:Math.max(0,budget.maxToolCalls-records.length)},plan:job.agentPlan??null,
  financialCoverage:recordedFinancialCoverage(records),
  limitedCalls:records.filter(r=>toolResultHasGap(r.result)).map(r=>({toolCallId:r.toolCallId,toolName:r.toolName,status:r.result.status??'limited',unresolved:r.result.unresolved,recovery:r.result.recovery,notice:'历史限制保留；后续返回不自动消除此记录。'})),
  sources:job.input.sources.map(s=>({id:s.id,type:s.type,reportPeriod:s.reportPeriod,readPages:s.readPages,totalPages:s.pages,truncated:!!s.truncated})),
  failedCalls:records.filter(r=>r.result?.error).map(r=>({toolCallId:r.toolCallId,toolName:r.toolName,error:r.result.error})),unresolvedWebGaps:job.webResearch?.gaps?.filter(g=>g.status!=='evidence-located')??[],notice:'这是执行覆盖与预算，不是事实核验结论。'};
}
export function compactExecutionContext({messages,job,evidence,records,threshold=220000}){
 if(JSON.stringify(messages).length<=threshold)return null;
 const lastAssistant=messages.findLastIndex(m=>m.role==='assistant'),returned=new Set(messages.slice(lastAssistant+1).filter(m=>m.role==='tool').map(m=>m.tool_call_id));
 if(messages[lastAssistant]?.tool_calls?.some(c=>!returned.has(c.id)))return null;
 const context=buildResearchContext({evidence,tools:records,evidenceBudget:50000,toolBudget:50000});
 const input=job.input;
 const anchor={question:input.question,mode:job.mode,depth:job.plan.depth,portfolio:input.portfolio,portfolioContext:input.portfolioContext,previousResearch:input.previousResearch,baseline:input.baseline,referenceMaterials:input.referenceMaterials,
  publicPlan:job.agentPlan??job.plan.researchApproach,financialCoverage:recordedFinancialCoverage(records),sourceCatalog:input.sources.map(s=>({id:s.id,title:s.title,type:s.type,security:s.security,url:s.url,reportPeriod:s.reportPeriod,pages:s.pages,readPages:s.readPages,truncated:s.truncated,date:s.date,publishedAt:s.publishedAt,reportDate:s.reportDate,fetchedAt:s.fetchedAt,stale:s.stale,currency:s.currency,asOf:s.asOf})),context,
  instruction:'这是同一研究的上下文整理，保留完整证据和工具记录；窗口遗漏项不是失败或已核实，可通过原来源重新读取。继续未完成事项，必要时从固定快照重新read_rules；不要重新采集已保存来源或重复已完成计算。'};
 messages.splice(1,messages.length-1,{role:'user',content:JSON.stringify(anchor)});
 return context.window;
}
