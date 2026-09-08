import {ruleUsage} from './research-knowledge.mjs';
export const recordBoundary='研究计划是拟验证的问题；判断摘要说明证据与限制；工具记录只保留实际调用与返回，不包含内部隐藏思维。';
export function publicExecutionPlan(job){
 const plans=[job.agentPlan,...(job.events??[]).filter(e=>e.type==='tool_result'&&e.toolName==='update_research_plan'&&!e.result?.error).map(e=>e.result)].filter(p=>Array.isArray(p?.steps)&&Number.isInteger(p.revision));
 return plans.sort((a,b)=>b.revision-a.revision)[0];
}
export const toolLabels={update_research_plan:'更新公开执行计划',get_research_status:'查看执行进展与预算',read_source_pages:'定向读取财报原页',verify_financial_inputs:'核对原始数字',calculate_valuation_snapshot:'复算TTM与估值快照',search_evidence:'检索已有证据',search_web:'补充公开资料',resolve_web_gap:'记录缺口证据',read_rules:'补读研究规则',calculate_screen_metrics:'核算财务变化',calculate_cashflow_bridge:'解释现金流变化',calculate_normalized_earnings:'测算盈利与估值',calculate_dcf:'现金流折现',calculate_dividend:'测算股息收益率锚',calculate_comparison:'核对公司比较口径'};
Object.assign(toolLabels,{read_official_disclosures:'补读专项官方公告',calculate_reinvestment:'核算研发与再投资',review_valuation_models:'对照估值模型结果'});
Object.assign(toolLabels,{calculate_shareholder_return:'复算分红事件与支付率',calculate_dcf_sensitivity:'核算增长与折现率网格',calculate_dividend_scenarios:'核算盈利派息情景'});
export function researchToolCalls(events=[],status){
 const calls=[],pending=new Map();
 for(const [index,e] of (Array.isArray(events)?events:[]).entries()){
  if(!['tool','tool_result'].includes(e.type))continue;
  if(e.type==='tool'){
   const row={key:`call-${index}`,toolName:e.toolName||'未记录工具名称',toolCallId:e.toolCallId,startedAt:e.time,arguments:e.arguments,hasInput:Object.hasOwn(e,'arguments'),hasReturn:false,eventIndex:index};
   calls.push(row);
   if(e.toolCallId){const queue=pending.get(e.toolCallId)||[];queue.push(row);pending.set(e.toolCallId,queue);}
  }else{
   // Never infer a match by tool name: concurrent calls can share the same tool.
   const queue=e.toolCallId?pending.get(e.toolCallId):null;
   const match=queue?.findIndex(r=>!e.toolName||r.toolName===e.toolName);
   const row=match>=0?queue.splice(match,1)[0]:{key:`return-${index}`,toolName:e.toolName||'未记录工具名称',toolCallId:e.toolCallId,arguments:e.arguments,hasInput:Object.hasOwn(e,'arguments'),eventIndex:index};
   if(!(match>=0))calls.push(row);
   Object.assign(row,{hasReturn:true,returnedAt:e.time,result:e.result,returnEventIndex:index});
  }
 }
 return calls.map(row=>{
  const start=Date.parse(row.startedAt),end=Date.parse(row.returnedAt);
  return {...row,label:toolLabels[row.toolName]||row.toolName,status:row.hasReturn?(row.result?.error?'failed':'returned'):['queued','running'].includes(status)?'pending':'unrecorded',durationMs:Number.isFinite(start)&&Number.isFinite(end)&&end>=start?end-start:null};
 });
}
export function researchTimeline(events=[],status){
 const source=Array.isArray(events)?events:[],calls=researchToolCalls(source,status),used=new Set();
 const timeline=calls.map(call=>{
  used.add(call.eventIndex);if(call.returnEventIndex!==undefined)used.add(call.returnEventIndex);
  const index=call.returnEventIndex??call.eventIndex,event=source[index];
  return {index,key:call.key,event:{...event,type:call.hasReturn?'tool_result':'tool',message:event.message||call.label,arguments:call.arguments,result:call.result,call}};
 });
 source.forEach((event,index)=>{if(!used.has(index))timeline.push({index,key:'event-'+index,event});});
 return timeline.sort((a,b)=>a.index-b.index);
}
export function researchRecordSummary(job={}){
 const calls=researchToolCalls(job.events,job.status),rules=ruleUsage(job);
 const sources=Array.isArray(job.input?.sources)?job.input.sources:[];
 return {calls,attempts:calls.length,returned:calls.filter(c=>c.status==='returned').length,failed:calls.filter(c=>c.status==='failed').length,pending:calls.filter(c=>!c.hasReturn).length,
  officialReports:sources.filter(s=>s.type==='official-report').length,sources:sources.length,ruleReads:rules.records.length,ruleRecorded:rules.recorded,version:rules.version};
}
