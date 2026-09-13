import {pricingRecord,pricingTime,pricingAt} from './model-pricing.mjs';
import fs from 'node:fs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID,createHash} from 'node:crypto';
const scope=new AsyncLocalStorage();
const kinds=['model','toolRound','webRequest','visionPage'];
const purposes=['research','review','followup','router','input','vision','researcher','writer','evidence-verifier','auditor'];
export const researchBudgetActive=()=>Boolean(scope.getStore());
export const researchResourceId=(kind,value)=>scope.getStore()?kind+':'+createHash('sha256').update(JSON.stringify(value)).digest('hex'):undefined;
const invalid=()=>{throw Object.assign(new Error('研究预算记录无效，已保留原进度，请检查配置'),{code:'research_budget_invalid',status:409});};
export function createResearchBudget(input){
 try{
  const b=pricingRecord(input,['version','maxModelCost','maxToolRounds','maxWebRequests','maxVisionPages','maxDurationMs']);
  if(b.version!==1)invalid();
  for(const k of ['maxToolRounds','maxWebRequests','maxVisionPages','maxDurationMs'])if(b[k]!==null&&(!Number.isSafeInteger(b[k])||b[k]<0))invalid();
  if(b.maxModelCost!==null){const c=pricingRecord(b.maxModelCost,['currency','amount']);if(typeof c.currency!=='string'||!/^[A-Z]{3}$/.test(c.currency)||typeof c.amount!=='number'||!Number.isFinite(c.amount)||c.amount<0)invalid();b.maxModelCost=Object.freeze(c);}
  return Object.freeze(b);
 }catch{invalid();}
}
export function createResearchBudgetState(limits,{startedAt,mode='dry-run'}={}){
 if(!pricingTime(startedAt)||!['dry-run','enforce'].includes(mode))invalid();
 return {version:1,limits:createResearchBudget(limits),mode,startedAt,receipts:[],decisions:[]};
}
export function configuredResearchBudget(env=process.env,startedAt=new Date().toISOString()){
 if(!env.RESEARCH_BUDGET_FILE)return null;
 try{const bytes=fs.readFileSync(env.RESEARCH_BUDGET_FILE);if(bytes.length>16000)invalid();return createResearchBudgetState(JSON.parse(bytes.toString('utf8')),{startedAt,mode:env.FEATURE_RESEARCH_BUDGET==='true'?'enforce':'dry-run'});}catch{invalid();}
}
export function researchBudgetConfiguration(env){
 const state=configuredResearchBudget(env,'2000-01-01T00:00:00.000Z');
 if(!state)return null;
 let pricingHash=null;
 if(state.limits.maxModelCost&&env.MODEL_PRICING_FILE){try{pricingHash=createHash('sha256').update(fs.readFileSync(env.MODEL_PRICING_FILE)).digest('hex');}catch{pricingHash='unavailable';}}
 return {mode:state.mode,limits:state.limits,pricingHash};
}
export function validateResearchBudgetState(value){
 try{
  const state=pricingRecord(value,['version','limits','mode','startedAt','receipts','decisions']);
  createResearchBudgetState(state.limits,state);
  if(state.version!==1||!Array.isArray(state.receipts)||state.receipts.length>20000||!Array.isArray(state.decisions)||state.decisions.length>20000)invalid();
  const ids=new Set();
  for(const r of state.receipts){
   pricingRecord(r,['id','kind','units','purpose','status','createdAt','completedAt','cost','reservedCost']);
   if(typeof r.id!=='string'||! /^[a-zA-Z0-9._:-]{1,160}$/.test(r.id)||ids.has(r.id)||!kinds.includes(r.kind)||!Number.isSafeInteger(r.units)||r.units<0||r.purpose!==null&&!purposes.includes(r.purpose)||!['reserved','completed'].includes(r.status)||!pricingTime(r.createdAt)||r.createdAt<state.startedAt||r.completedAt!==null&&(!pricingTime(r.completedAt)||r.completedAt<r.createdAt)||r.status==='completed'&&r.completedAt===null||r.status==='reserved'&&r.completedAt!==null)invalid();
   ids.add(r.id);
   if(r.cost!==null){pricingRecord(r.cost,['currency','estimatedCost']);if(typeof r.cost.currency!=='string'||!/^[A-Z]{3}$/.test(r.cost.currency)||typeof r.cost.estimatedCost!=='number'||!Number.isFinite(r.cost.estimatedCost)||r.cost.estimatedCost<0||r.kind!=='model')invalid();}
   if(r.reservedCost!==null){pricingRecord(r.reservedCost,['currency','estimatedCost']);if(typeof r.reservedCost.currency!=='string'||!/^[A-Z]{3}$/.test(r.reservedCost.currency)||typeof r.reservedCost.estimatedCost!=='number'||!Number.isFinite(r.reservedCost.estimatedCost)||r.reservedCost.estimatedCost<0||r.kind!=='model')invalid();}
  }
  for(const d of state.decisions){pricingRecord(d,['id','at','reason','action']);if(typeof d.id!=='string'||d.id.length>160||!pricingTime(d.at)||!['model_cost','tool_rounds','web_requests','vision_pages','duration','unknown_cost','optional_retrieval'].includes(d.reason)||!['would-stop','stop','would-reduce','reduce'].includes(d.action))invalid();}
  return structuredClone(state);
 }catch{invalid();}
}
export function researchBudgetSummary(state,at=new Date().toISOString()){
 if(!state)return null;
 if(!pricingTime(at))invalid();
 const s=validateResearchBudgetState(state),counts=Object.fromEntries(kinds.map(k=>[k,s.receipts.filter(r=>r.kind===k).reduce((n,r)=>n+r.units,0)]));
 const model=s.receipts.filter(r=>r.kind==='model'),unknown=model.filter(r=>!r.cost).length;
 const billing=[...new Set(model.flatMap(r=>r.cost?[r.cost.currency]:[]))].sort().map(currency=>({currency,knownEstimatedCost:model.filter(r=>r.cost?.currency===currency).reduce((n,r)=>n+r.cost.estimatedCost,0)}));
 return {version:1,mode:s.mode,limits:s.limits,counts,billing,unknownModelCalls:unknown,pending:s.receipts.filter(r=>r.status==='reserved').length,
  elapsedMs:Math.max(0,Date.parse(at)-Date.parse(s.startedAt)),decisions:s.decisions.map(d=>({...d})),completeCost:model.length>0&&unknown===0&&billing.length===1};
}
export function withResearchBudget(job,run,{persist,env=process.env,now=()=>new Date().toISOString()}={}){
 if(!job.budgetState)return run();
 validateResearchBudgetState(job.budgetState);
 if(typeof persist!=='function')throw Object.assign(new Error('研究预算需要可靠保存回调，未开始新的请求'),{code:'research_budget_persistence'});
 if(job.budgetState.receipts.some(r=>r.status==='reserved'))throw Object.assign(new Error('上次请求的执行结果尚未确认，预算与原进度已保留，停止自动重放'),{code:'research_budget_uncertain'});
 return scope.run({job,persist,env,now,queue:Promise.resolve(),failed:false},run);
}
const locked=(context,fn)=>{
 const result=context.queue.then(()=>{if(context.failed)throw Object.assign(new Error('预算保存未确认，已停止后续请求'),{code:'research_budget_persistence'});return fn();});
 context.queue=result.catch(()=>{});return result;
};
async function durable(context){
 try{await context.persist();}catch{context.failed=true;throw Object.assign(new Error('预算保存未确认，已停止后续请求并保留原进度'),{code:'research_budget_persistence'});}
}
export async function beginResearchResource(kind,units,{id=randomUUID(),purpose=null,reservedCost=null}={}){
 const c=scope.getStore();if(!c)return null;
 return locked(c,async()=>{
  if(!kinds.includes(kind)||!Number.isSafeInteger(units)||units<0||purpose!==null&&!purposes.includes(purpose))invalid();
  const previous=c.job.budgetState.receipts.find(r=>r.id===id);
  if(previous)throw Object.assign(new Error('该请求已有预算记录，保留原结果并停止自动重复执行'),{code:'research_budget_replay'});
  const reason=budgetLimitReason(c.job.budgetState,{kind,units,reservedCost,at:c.now()});
  if(reason){c.job.budgetState.decisions.push({id,at:c.now(),reason,action:'would-stop'});await durable(c);}
  const r={id,kind,units,purpose,status:'reserved',createdAt:c.now(),completedAt:null,cost:null,reservedCost};
  c.job.budgetState.receipts.push(r);validateResearchBudgetState(c.job.budgetState);await durable(c);return {context:c,id};
 });
}
export async function finishResearchResource(token,cost=null){
 if(!token)return;
 const c=token.context;
 return locked(c,async()=>{
  const r=c.job.budgetState.receipts.find(r=>r.id===token.id);if(!r)invalid();
  if(r.status==='completed')return;
  r.status='completed';r.completedAt=c.now();r.cost=cost;validateResearchBudgetState(c.job.budgetState);await durable(c);
 });
}
export async function accountResearchRound(id){
 const c=scope.getStore();if(!c)return;
 const old=c.job.budgetState.receipts.find(r=>r.id===id);
 if(old?.status==='completed'&&old.kind==='toolRound'&&old.units===1)return;
 await finishResearchResource(await beginResearchResource('toolRound',1,{id}));
}
export function withResearchResource(kind,units,run,options){
 if(!scope.getStore())return run();
 return (async()=>{const token=await beginResearchResource(kind,units,options);
 try{return await run();}finally{await finishResearchResource(token);}})();
}

export function budgetLimitReason(state,{kind,units=0,reservedCost=null,at}){
 const s=researchBudgetSummary(state,at),l=s.limits;
 if(l.maxDurationMs!==null&&s.elapsedMs>=l.maxDurationMs)return 'duration';
 const dimensions={toolRound:['maxToolRounds','tool_rounds'],webRequest:['maxWebRequests','web_requests'],visionPage:['maxVisionPages','vision_pages']};
 if(dimensions[kind]){const [key,reason]=dimensions[kind];if(l[key]!==null&&s.counts[kind]+units>l[key])return reason;}
 if(kind==='model'&&l.maxModelCost!==null){
  if(!reservedCost||reservedCost.currency!==l.maxModelCost.currency)return 'unknown_cost';
  const rows=state.receipts.filter(r=>r.kind==='model');
  const amounts=rows.map(r=>r.status==='reserved'?r.reservedCost:r.cost);
  if(amounts.some(c=>!c||c.currency!==l.maxModelCost.currency))return 'unknown_cost';
  const sum=amounts.reduce((n,c)=>n+c.estimatedCost,0)+reservedCost.estimatedCost;
  if(!Number.isFinite(sum)||sum>l.maxModelCost.amount)return 'model_cost';
 }
 return null;
}
// Use declared provider context/output ceilings only. Missing ceilings/rates
// cannot become invented token forecasts or zero-cost authorization.
export function modelCostReservation(profile,request,resolution){
 const p=resolution?pricingAt(resolution.pricing,resolution.at)?.pricing:null,maxOutput=request.maxOutputTokens??profile.maxOutputTokens;
 if(!p||!Number.isSafeInteger(profile.contextWindow)||profile.contextWindow<=0||!Number.isSafeInteger(maxOutput)||maxOutput<=0||[p.input,p.output,p.cacheRead].some(v=>v===null))return null;
 const attempts=['research','review','followup','researcher','writer','evidence-verifier','auditor'].includes(request.purpose)?3:1;
 const estimatedCost=(profile.contextWindow*Math.max(p.input,p.cacheRead)+maxOutput*p.output)*attempts/1_000_000;
 return Number.isFinite(estimatedCost)?{currency:p.currency,estimatedCost}:null;
}
export function budgetUnderPressure(state,at){
 if(!state)return false;
 const s=researchBudgetSummary(state,at),l=s.limits;
 return [['toolRound','maxToolRounds'],['webRequest','maxWebRequests'],['visionPage','maxVisionPages']].some(([kind,key])=>l[key]!==null&&s.counts[kind]>=l[key]*0.8)||l.maxDurationMs!==null&&s.elapsedMs>=l.maxDurationMs*0.8||l.maxModelCost!==null&&(s.unknownModelCalls>0||s.billing.some(c=>c.currency===l.maxModelCost.currency&&c.knownEstimatedCost>=l.maxModelCost.amount*0.8));
}
export const retrievalSnapshot=(sources,args)=>createHash('sha256').update(JSON.stringify({args,sources:sources.map(s=>({id:s.id,text:s.text,documentBlocks:s.documentBlocks,publishedAt:s.publishedAt}))})).digest('hex');
export async function reuseBudgetRetrieval({toolName,args,sources,records}){
 const c=scope.getStore();if(!c||toolName!=='search_evidence'||!budgetUnderPressure(c.job.budgetState,c.now()))return null;
 const fingerprint=retrievalSnapshot(sources,args),previous=records.findLast(r=>r.toolName===toolName&&r.retrievalFingerprint===fingerprint&&Array.isArray(r.result?.matches)&&r.result.matches.length>0&&!r.result.error);
 if(!previous)return null;
 await locked(c,async()=>{c.job.budgetState.decisions.push({id:randomUUID(),at:c.now(),reason:'optional_retrieval',action:'would-reduce'});await durable(c);});
 return null;
}
