import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {ModelGatewayError,normalizeUsageProvenance} from './model-gateway-result.mjs';
import {calculateModelCost} from './model-pricing.mjs';

const context=new AsyncLocalStorage();let writer;
export const withModelCallContext=(jobId,run)=>context.run({jobId},run);
export function configureModelTelemetry(sink){writer=sink;}
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const tokens=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const purposes=['research','review','followup','router','input','vision','researcher','writer','evidence-verifier','auditor','critical-review','judge'];
export function normalizeFlagshipMetrics(input){
 const metric=normalizeModelCall({usage:input?.usage,performance:input?.performance,billing:input?.billing});
 return {usage:metric.usage,performance:metric.performance,billing:metric.billing};
}
export function normalizeModelCall(input){
 const details=normalizeUsageProvenance(input.usage,input.tokenSources);
 const usage=Object.fromEntries(['inputTokens','outputTokens','totalTokens','cachedInputTokens'].map(k=>[k,details.usage[k]]));
 const tokenSources=Object.fromEntries(Object.keys(usage).map(k=>[k,details.tokenSources[k]]));
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=200?v:null;
 const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
 const category=input.errorCategory===null?null:new ModelGatewayError(input.errorCategory).category;
 return {schemaVersion:1,id:text(input.id),jobId:text(input.jobId),purpose:purposes.includes(input.purpose)?input.purpose:null,
  profile:text(input.profile),routingMode:['dry-run','policy','champion'].includes(input.routingMode)?input.routingMode:'legacy',policyVersion:['dry-run','policy','champion'].includes(input.routingMode)?1:null,
  status:['started','succeeded','failed','cancelled'].includes(input.status)?input.status:'failed',
  ...(Object.hasOwn(input,'transportAttempts')?{transportAttempts:tokens(input.transportAttempts)}:{}),
  ...(Object.hasOwn(input,'flagship')?{flagship:input.flagship?.version===1&&['opposing_core_claim','valuation_interval','critical_review'].includes(input.flagship.conflictType)?{version:1,conflictType:input.flagship.conflictType}:null}:{}),
  ...(Object.hasOwn(input,'cache')?{cache:input.cache?.schemaVersion===1&&input.cache.textOnly===true&&typeof input.cache.prefixFingerprint==='string'&&/^[a-f0-9]{64}$/.test(input.cache.prefixFingerprint)?{schemaVersion:1,prefixFingerprint:input.cache.prefixFingerprint,textOnly:true}:null}:{}),
  startedAt:timestamp(input.startedAt),finishedAt:timestamp(input.finishedAt),
  errorCategory:category,httpStatus:Number.isInteger(input.httpStatus)&&input.httpStatus>=400&&input.httpStatus<=599?input.httpStatus:null,
  usage,tokenSources,...(Object.hasOwn(input,'usageDetails')?{usageDetails:input.usageDetails?.schemaVersion===1?normalizeUsageProvenance(input.usageDetails.usage,input.usageDetails.tokenSources):null}:{}),performance:{latencyMs:number(input.performance?.latencyMs),ttftMs:number(input.performance?.ttftMs)},
  ...(Object.hasOwn(input,'cost')?{cost:input.cost?.schemaVersion===1?calculateModelCost(usage,input.cost.pricing,tokenSources):null}:{}),
  billing:input.billing&&/^[A-Z]{3}$/.test(input.billing.currency)&&number(input.billing.estimatedCost)!==null?{currency:input.billing.currency,estimatedCost:input.billing.estimatedCost,source:'estimated'}:null};
}
export function uniqueModelCalls(records){
 const known=new Map(),anonymous=[];
 for(const raw of records){
  const call=normalizeModelCall(raw);if(!call.id){anonymous.push(call);continue;}
  const old=known.get(call.id);
  if(old&&old.status!=='started'&&call.status!=='started'&&JSON.stringify(old)!==JSON.stringify(call))throw new Error('Conflicting ModelCall receipts');
  if(!old||old.status==='started')known.set(call.id,call);
 }
 return [...known.values(),...anonymous];
}
export function summarizeModelCalls(records,grouped=true){
 const calls=uniqueModelCalls(records),usage={},byStatus={started:0,succeeded:0,failed:0,cancelled:0};
 for(const call of calls)byStatus[call.status]++;
 for(const key of ['inputTokens','outputTokens','totalTokens','cachedInputTokens']){
  const known=calls.map(c=>c.usage[key]).filter(v=>v!==null),sum=known.reduce((a,b)=>a+b,0);
  usage[key]={knownTotal:known.length&&Number.isSafeInteger(sum)?sum:null,unknownCalls:calls.length-known.length};
 }
 const unknownAttempts=calls.filter(c=>c.transportAttempts==null).length;
 const unpricedAttempts=calls.reduce((n,c)=>n+(c.transportAttempts==null?0:Math.max(0,c.transportAttempts-(c.billing?1:0))),0);
 const currencies=[...new Set(calls.flatMap(c=>c.billing?[c.billing.currency]:[]))];
 const complete=calls.length>0&&calls.every(c=>c.status!=='started'&&c.billing!==null&&c.transportAttempts===1)&&currencies.length===1;
 return {schemaVersion:1,calls:calls.length,byStatus,usage,unknownBillingCalls:calls.filter(c=>c.billing===null).length,
  costCoverage:{complete,unknownAttemptCalls:unknownAttempts,unpricedAttempts,transportAttempts:unknownAttempts?null:calls.reduce((n,c)=>n+c.transportAttempts,0)},
  ...(grouped?{byPurpose:[...new Set(calls.map(c=>c.purpose))].map(purpose=>({purpose,summary:summarizeModelCalls(calls.filter(c=>c.purpose===purpose),false)})),byProfile:[...new Set(calls.map(c=>c.profile))].map(profile=>({profile,summary:summarizeModelCalls(calls.filter(c=>c.profile===profile),false)}))}:{}),
  billing:[...new Set(calls.flatMap(c=>c.billing?[c.billing.currency]:[]))].sort().map(currency=>{
   const amount=calls.filter(c=>c.billing?.currency===currency).reduce((sum,c)=>sum+c.billing.estimatedCost,0);
   return {currency,knownEstimatedCost:Number.isFinite(amount)?amount:null};
  })};
}

export function createModelCallRecorder({sink=writer,timeoutMs=1000}={}){
 const began=performance.now();
 const base={id:randomUUID(),jobId:context.getStore()?.jobId??null,startedAt:new Date().toISOString(),errorCategory:null,transportAttempts:0};
 // Each write is bounded. Late 'started' writes must be insert-only in storage.
 async function write(record){
  if(!sink)return;
  let timer;
  try{await Promise.race([Promise.resolve().then(()=>sink(normalizeModelCall(record))),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),timeoutMs);})]);}
  catch{console.warn('Model telemetry write unavailable');}
  finally{clearTimeout(timer);}
 }
 return {
  enabled:Boolean(sink),
  attempt(){base.transportAttempts++;},
  get attempts(){return base.transportAttempts;},
  cache(value){base.cache=value;},
  flagship(value){base.flagship=value;},
  // Retain only facts already resolved before validation; never a requested but unknown profile ID.
  attribute(purpose,profile,routingMode){base.purpose=purposes.includes(purpose)?purpose:null;base.profile=profile;base.routingMode=routingMode;},
  async start(purpose,profile,routingMode){base.purpose=purpose;base.profile=profile;base.routingMode=routingMode;await write({...base,status:'started'});},
  async finish(response,error){
   const safeError=error instanceof ModelGatewayError?error:error?new ModelGatewayError('invalid_request'):null;
   await write({...base,status:safeError?(safeError.category==='aborted'?'cancelled':'failed'):'succeeded',finishedAt:new Date().toISOString(),
    errorCategory:safeError?.category??null,httpStatus:safeError?.status??null,usage:response?.usage,usageDetails:response?.usageDetails,performance:response?.performance??{latencyMs:performance.now()-began,ttftMs:null},billing:response?.billing,cost:response?.cost});
  },
 };
}

export function summarizeFlagshipCalls(records){
 const calls=uniqueModelCalls(records).filter(c=>['critical-review','judge'].includes(c.purpose));
 const latency=calls.map(c=>c.performance.latencyMs).filter(v=>v!==null).sort((a,b)=>a-b);
 return {version:1,summary:summarizeModelCalls(calls),p95LatencyMs:latency.length?latency[Math.ceil(latency.length*.95)-1]:null,unknownLatencyCalls:calls.length-latency.length,byConflict:[...new Set(calls.map(c=>c.flagship?.conflictType??'unknown'))].map(type=>({type,calls:calls.filter(c=>(c.flagship?.conflictType??'unknown')===type).length})),measuredDecisionValue:null};
}

// Cost per successfully validated delivery includes failed tasks and all
// research/review/followup calls. It does not certify model quality.
export function effectiveTaskCost(tasks){
 if(!Array.isArray(tasks)||new Set(tasks.map(t=>t?.jobId)).size!==tasks.length)throw new TypeError('Invalid cost cohort');
 const calls=[],callIds=new Set();let delivered=0,toolRounds=0,unknownToolRounds=0,complete=tasks.length>0;
 for(const task of tasks){
  if(typeof task.jobId!=='string'||!task.jobId||!Array.isArray(task.modelCalls)||typeof task.delivered!=='boolean'||typeof task.validationPassed!=='boolean'||!Number.isSafeInteger(task.criticalErrors)||task.criticalErrors<0)throw new TypeError('Invalid cost cohort');
  if(task.delivered&&task.validationPassed&&task.criticalErrors===0)delivered++;
  if(Number.isSafeInteger(task.toolRounds)&&task.toolRounds>=0)toolRounds+=task.toolRounds;else unknownToolRounds++;
  const rows=uniqueModelCalls(task.modelCalls);
  for(const call of rows){if(!call.id||call.jobId!==task.jobId||callIds.has(call.id))throw new TypeError('Invalid cost cohort lineage');callIds.add(call.id);}
  const summary=summarizeModelCalls(rows);complete&&=summary.costCoverage.complete;calls.push(...rows);
 }
 const summary=summarizeModelCalls(calls);complete&&=summary.costCoverage.complete;
 const amount=summary.billing.length===1?summary.billing[0]:null;
 return {schemaVersion:1,formulaVersion:'effective-task-cost-1',tasks:tasks.length,validatedDeliveries:delivered,deliveryPassRate:tasks.length?delivered/tasks.length:null,
  toolRounds:unknownToolRounds||!Number.isSafeInteger(toolRounds)?null:toolRounds,unknownToolRoundTasks:unknownToolRounds,summary,
  currency:amount?.currency??null,estimatedCostPerDelivery:complete&&delivered>0&&Number.isFinite(amount?.knownEstimatedCost)?amount.knownEstimatedCost/delivered:null,
  complete,qualityAccepted:false};
}

export function publicModelCostSummary(summary){
 const amount=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const groups=rows=>(rows??[]).map(r=>({purpose:purposes.includes(r.purpose)?r.purpose:null,calls:tokens(r.summary.calls),unknownBillingCalls:tokens(r.summary.unknownBillingCalls),billing:r.summary.billing.map(b=>({currency:b.currency,knownEstimatedCost:amount(b.knownEstimatedCost)}))}));
 return {version:1,calls:tokens(summary.calls),unknownBillingCalls:tokens(summary.unknownBillingCalls),
  billing:summary.billing.map(b=>({currency:b.currency,knownEstimatedCost:amount(b.knownEstimatedCost)})),
  complete:summary.costCoverage?.complete===true,unpricedAttempts:tokens(summary.costCoverage?.unpricedAttempts),unknownAttemptCalls:tokens(summary.costCoverage?.unknownAttemptCalls),
  byPurpose:groups(summary.byPurpose),byModel:(summary.byProfile??[]).map(r=>({profile:['legacy-analysis','legacy-router','legacy-vision','main','pro','main-challenger','vision-challenger'].includes(r.profile)||/^configured-[a-z][a-z0-9-]{0,51}$/.test(r.profile)?r.profile:null,calls:tokens(r.summary.calls),billing:r.summary.billing.map(b=>({currency:b.currency,knownEstimatedCost:amount(b.knownEstimatedCost)}))})),
  cache:{inputTokens:summary.usage.inputTokens.knownTotal,cachedInputTokens:summary.usage.cachedInputTokens.knownTotal,unknownCalls:summary.usage.cachedInputTokens.unknownCalls},
  notice:'费用为已记录模型调用的估算，未包含未知账单或外部数据费用；缓存命中不代表证据质量。'};
}
