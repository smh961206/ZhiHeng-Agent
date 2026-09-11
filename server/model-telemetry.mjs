import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import {ModelGatewayError} from './model-gateway-result.mjs';

const context=new AsyncLocalStorage();let writer;
export const withModelCallContext=(jobId,run)=>context.run({jobId},run);
export function configureModelTelemetry(sink){writer=sink;}
const number=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
const tokens=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const purposes=['research','review','followup','router','vision'];
export function normalizeModelCall(input){
 const usage=Object.fromEntries(['inputTokens','outputTokens','totalTokens','cachedInputTokens'].map(k=>[k,tokens(input.usage?.[k])]));
 const tokenSources=Object.fromEntries(Object.entries(usage).map(([k,v])=>[k,v===null?'unknown':'provider']));
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=200?v:null;
 const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
 const category=input.errorCategory===null?null:new ModelGatewayError(input.errorCategory).category;
 return {schemaVersion:1,id:text(input.id),jobId:text(input.jobId),purpose:purposes.includes(input.purpose)?input.purpose:null,
  profile:text(input.profile),routingMode:['dry-run','policy'].includes(input.routingMode)?input.routingMode:'legacy',policyVersion:['dry-run','policy'].includes(input.routingMode)?1:null,
  status:['started','succeeded','failed','cancelled'].includes(input.status)?input.status:'failed',
  startedAt:timestamp(input.startedAt),finishedAt:timestamp(input.finishedAt),
  errorCategory:category,httpStatus:Number.isInteger(input.httpStatus)&&input.httpStatus>=400&&input.httpStatus<=599?input.httpStatus:null,
  usage,tokenSources,performance:{latencyMs:number(input.performance?.latencyMs),ttftMs:number(input.performance?.ttftMs)},
  billing:input.billing&&/^[A-Z]{3}$/.test(input.billing.currency)&&number(input.billing.estimatedCost)!==null?{currency:input.billing.currency,estimatedCost:input.billing.estimatedCost,source:'estimated'}:null};
}
export function summarizeModelCalls(records){
 const calls=records.map(normalizeModelCall),usage={},byStatus={started:0,succeeded:0,failed:0,cancelled:0};
 for(const call of calls)byStatus[call.status]++;
 for(const key of ['inputTokens','outputTokens','totalTokens','cachedInputTokens']){
  const known=calls.map(c=>c.usage[key]).filter(v=>v!==null),sum=known.reduce((a,b)=>a+b,0);
  usage[key]={knownTotal:known.length&&Number.isSafeInteger(sum)?sum:null,unknownCalls:calls.length-known.length};
 }
 return {schemaVersion:1,calls:calls.length,byStatus,usage,unknownBillingCalls:calls.filter(c=>c.billing===null).length,
  billing:[...new Set(calls.flatMap(c=>c.billing?[c.billing.currency]:[]))].sort().map(currency=>{
   const amount=calls.filter(c=>c.billing?.currency===currency).reduce((sum,c)=>sum+c.billing.estimatedCost,0);
   return {currency,knownEstimatedCost:Number.isFinite(amount)?amount:null};
  })};
}

export function createModelCallRecorder({sink=writer,timeoutMs=1000}={}){
 const began=performance.now();
 const base={id:randomUUID(),jobId:context.getStore()?.jobId??null,startedAt:new Date().toISOString(),errorCategory:null};
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
  // Retain only facts already resolved before validation; never a requested but unknown profile ID.
  attribute(purpose,profile,routingMode){base.purpose=purposes.includes(purpose)?purpose:null;base.profile=profile;base.routingMode=routingMode;},
  async start(purpose,profile,routingMode){base.purpose=purpose;base.profile=profile;base.routingMode=routingMode;await write({...base,status:'started'});},
  async finish(response,error){
   const safeError=error instanceof ModelGatewayError?error:error?new ModelGatewayError('invalid_request'):null;
   await write({...base,status:safeError?(safeError.category==='aborted'?'cancelled':'failed'):'succeeded',finishedAt:new Date().toISOString(),
    errorCategory:safeError?.category??null,httpStatus:safeError?.status??null,usage:response?.usage,performance:response?.performance??{latencyMs:performance.now()-began,ttftMs:null},billing:response?.billing});
  },
 };
}
