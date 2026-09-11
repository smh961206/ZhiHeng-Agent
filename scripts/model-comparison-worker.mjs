// One private process per arm: no application server, MongoDB or production gate override.
import fs from 'node:fs';
import path from 'node:path';
import {readJSON,writeJSON,digest,executionFingerprint,budgetedTransport,comparisonInput,frozenMarketData} from './model-comparison.mjs';
import {createPolicyModelCatalog} from '../server/model-catalog.mjs';
import {resolveModelConnection} from '../server/model-connection.mjs';
import {createJobModelState,createPolicyJobModelState} from '../server/model-state.mjs';
import {evaluateModelPolicy} from '../server/model-policy.mjs';
import {configureModelTelemetry,withModelCallContext,summarizeModelCalls} from '../server/model-telemetry.mjs';

async function worker(){
 if(!process.send)throw new Error('Worker requires the comparison parent');
 const [directory,unit]=process.argv.slice(2),stateFile=path.join(directory,'run.json');
 const state=readJSON(stateFile),entry=state.units[unit];
 if(!entry||entry.status==='completed'||state.executionFingerprint!==executionFingerprint()||state.executionDate!==new Date().toISOString().slice(0,10))throw new Error('Worker pin mismatch');
 const arm=unit.endsWith('--candidate')?'candidate':'baseline',c=state.plan.cases.find(c=>c.id+'--'+arm===unit);
 if(!c)throw new Error('Unknown case');
 const checkpointFile=path.join(directory,'private',unit+'.json'),resultFile=path.join(directory,'results',unit+'.json');
 const control=new AbortController(),timer=setTimeout(()=>control.abort(new Error('arm_timeout')),state.limits.timeoutMs);
 let fatal=null,job,telemetry=[];
 const persistState=()=>writeJSON(stateFile,state);
 const persist=()=>writeJSON(checkpointFile,{job,telemetry});
 const nativeFetch=globalThis.fetch;
 const connections=createPolicyModelCatalog().profiles.filter(p=>p.id==='legacy-analysis'||p.id==='main'||p.id==='pro').map(p=>({...resolveModelConnection(p,process.env),model:p.model}));
 // Prevent all acquisition and all non-model traffic before importing the Agent.
 // Mock mode has no path to nativeFetch, even when real credentials are inherited.
 let mockCall=0,reviewFixture;
 if(state.offline)({reviewFixture}=await import('../tests/fixtures/research-review.mjs'));
 globalThis.fetch=budgetedTransport({state,unit,connections,persist:persistState,control,onStop:reason=>{fatal=reason;},dispatch:async(url,options)=>{
   const body=JSON.parse(options.body);let response;
   if(state.offline){
    mockCall++;
    const review=body.messages[0]?.content?.includes('审计')&&!body.messages[0]?.content?.startsWith('你是价值投资研究Agent');
    let message;
    if(review)message={role:'assistant',content:JSON.stringify(reviewFixture(job.input))};
    else if(!body.messages.some(m=>m.role==='tool'))message={role:'assistant',content:null,reasoning_content:'PRIVATE-OFFLINE-REASONING',tool_calls:[{id:'comparison-read-rules',type:'function',function:{name:'read_rules',arguments:JSON.stringify({query:'现金流'})}}]};
    else message={role:'assistant',content:'合成草稿：资料不足，保留缺口。[S1]'};
    response=Response.json({choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150}});
   }else response=await nativeFetch(url,options);
   return response;
 }});
 try{
  // All remaining effects use existing research owners with fixed local inputs.
  const {runAgent}=await import('../server/agent.mjs');
  const {createResearchPlan}=await import('../shared/research-framework.mjs');
  const {createWebResearchSession}=await import('../server/web-research.mjs');
  const {createAgentPageReader}=await import('../server/agent-page-reader.mjs');
  const {researchResume}=await import('../server/research-resume.mjs');
  if(fs.existsSync(checkpointFile)){
   ({job,telemetry}=readJSON(checkpointFile));
   // The resume owner checks a job's internal consistency. Bind that private
   // job to this run/arm and frozen input before accepting its saved history.
   if(job?.id!==state.id+'-'+unit||job.mode!==c.mode||digest(job.input)!==digest(comparisonInput(c,state.plan.cutoff)))throw new Error('checkpoint_input_mismatch');
   if(!researchResume(job))throw new Error('checkpoint_incompatible');
   job.resume={available:true};
  }else{
   if(entry.status!=='pending')throw new Error('checkpoint_missing');
   const input=comparisonInput(c,state.plan.cutoff);
   const plan=createResearchPlan(input,c.mode),candidate=evaluateModelPolicy({mode:c.mode,historyYears:plan.historyYears}).candidate;
   const modelState=arm==='candidate'&&candidate?createPolicyJobModelState(process.env,{profileId:candidate.slot.toLowerCase(),reasoningEffort:candidate.reasoningEffort}):createJobModelState();
   job={id:state.id+'-'+unit,mode:c.mode,input,plan,modelState,events:[]};
  }
  entry.status='running';delete entry.reason;entry.startedAt??=new Date().toISOString();persistState();
  configureModelTelemetry(record=>{
   const existing=telemetry.findIndex(r=>r.id===record.id);if(existing<0)telemetry.push(record);else telemetry[existing]=record;
   // Existing telemetry is best effort; mandatory budget/checkpoint writes are separate.
   persist();
  });
  const unavailable=async()=>{throw new Error('固定材料对照未提供所请求的原件；未读取，不得当作已核实。');};
  const result=await withModelCallContext(job.id,()=>runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),control.signal,{
   collectData:async()=>frozenMarketData(c.input,state.plan.cutoff),
   webSession:options=>createWebResearchSession({...options,status:{enabled:false,configured:false,provider:'frozen-corpus'}}),
   pageReader:createAgentPageReader({request:unavailable,readVision:unavailable,save:unavailable,enabled:()=>false}),
   disclosureReader:unavailable,
   onCheckpoint:persist,onModelCheckpoint:persist,
  }));
  control.signal.throwIfAborted();if(fatal)throw new Error(fatal);
  // runAgent returns only after its existing review, Evidence and financial gates.
  writeJSON(resultFile,{version:1,kind:state.offline?'synthetic-research-result':'live-research-result',runId:state.id,unit,corpusHash:state.corpusHash,cutoff:state.plan.cutoff,
   inputHash:digest(c.input),result,modelState:job.modelState,usage:summarizeModelCalls(telemetry),calls:telemetry,toolRecords:job.checkpoint?.toolRecords??[],evidence:job.checkpoint?.evidence??[],mockCalls:state.offline?mockCall:undefined});
  entry.status='completed';entry.artifactHash=digest(readJSON(resultFile));entry.finishedAt=new Date().toISOString();persistState();
 }catch(error){
  entry.status='incomplete';entry.reason=fatal||(['checkpoint_incompatible','checkpoint_missing','checkpoint_input_mismatch'].includes(error.message)?error.message:control.signal.aborted?'interrupted':'research_or_validation_failed');
  persistState();process.exitCode=1;
 }finally{clearTimeout(timer);globalThis.fetch=nativeFetch;configureModelTelemetry(undefined);}
}
worker().catch(()=>{process.exitCode=1;});
