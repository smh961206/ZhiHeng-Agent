// Exceptional independent review policy. Financial/data/provider failures are
// deliberately absent from the validated reasoning-failure allowlist.
import {objectHash} from '../benchmark/fixtures.mjs';
import {independentContextData} from './research-context.mjs';
import {normalizeFlagshipMetrics} from './model-telemetry.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {buildIndependentContext} from './research-context.mjs';
import {modelHealth} from './model-health.mjs';
const callScope=new AsyncLocalStorage();
export const currentFlagshipCall=()=>callScope.getStore();
export const flagshipStateError=()=>Object.assign(new Error('独立复核状态未确认或配置已变化；请保留原进度，不自动重复请求'),{code:'flagship_state_incompatible',status:409});
export function flagshipEligibility({purpose,mode,evidenceSufficient,missingData,providerFailure,toolsPending,failures=[],conflict,complexity}={}){
 const deny=reason=>({eligible:false,reason});
 if(!['critical-review','judge'].includes(purpose))return deny('unsupported_purpose');
 if(mode==='A')return deny('routine_mode');
 if(!['B','C','D','E','F'].includes(mode))return deny('unknown_mode');
 if(missingData!==false||evidenceSufficient!==true)return deny('insufficient_evidence');
 if(providerFailure!==false)return deny('provider_failure_or_unknown');
 if(toolsPending!==false)return deny('pending_tools_or_unknown');
 if(purpose==='judge')return conflict?.material===true&&conflict?.completed===true?{eligible:true,reason:'material_l1_l2_conflict'}:deny('no_material_conflict');
 const valid=Array.isArray(failures)?failures.filter(f=>f?.validated===true&&['format','semantic'].includes(f.kind)&&Number.isSafeInteger(f.attempt)&&f.attempt>=0):[];
 if(new Set(valid.map(f=>f.attempt)).size<2)return deny('repeated_validated_failure_required');
 return {eligible:true,reason:complexity==='exceptional'?'exceptional_complexity_repeated_review_failure':'repeated_review_failure'};
}

export function classifiedReviewFailure(error,attempt){
 if(!Number.isSafeInteger(attempt)||attempt<0)return null;
 if(error?.code==='review_json')return {attempt,kind:'format',validated:true};
 // Only closed structural/action fields qualify. Evidence, numeric, financial,
 // confidence, date, coverage and reference failures must remain hard failures.
 const issues=error?.validationIssues;
 if(error?.code==='review_validation'&&Array.isArray(issues)&&issues.length&&issues.every(i=>i.code==='invalid_review_field'&&['decision.action','sections'].includes(i.path)))return {attempt,kind:'semantic',validated:true};
 return null;
}

// A receipt lives in the existing private job payload. Strict reservation saves
// precede dispatch; an uncertain process interruption never becomes a free retry.
export async function executeFlagshipSession({job,purpose,input,profile,connectionIdentity,reason,complete,validate,persist,signal,metrics}){
 const permitted=profile?.schemaVersion===6||profile?.tier==='FLAGSHIP'&&profile.allow?.[purpose==='judge'?'judge':'criticalReview'];
 if(!['critical-review','judge'].includes(purpose)||!permitted||!profile.purposes.includes(purpose)||typeof persist!=='function'||typeof validate!=='function'||typeof complete!=='function')throw flagshipStateError();
 signal?.throwIfAborted();
 const clean=independentContextData(input),inputHash=objectHash(clean),profileHash=objectHash(profile),key=purpose==='judge'?'judge':'review';
 const state=job.flagshipState??={version:1,cutoff:input.cutoff,sessions:{}};
 if(state.version!==1||state.cutoff!==input.cutoff||!state.sessions||Object.keys(state.sessions).some(k=>!['review','judge'].includes(k)))throw flagshipStateError();
 const previous=state.sessions[key];
 if(previous){
  if(previous.jobId!==(job.id??null))throw flagshipStateError();
  if(previous.inputHash!==inputHash||previous.profileHash!==profileHash||previous.connectionIdentity!==connectionIdentity||previous.status!=='completed'||previous.outcomeHash!==objectHash(previous.outcome))throw flagshipStateError();
  return validate(structuredClone(previous.outcome));
 }
 const session={version:1,jobId:job.id??null,status:'reserved',inputHash,profileHash,profileId:profile.id,connectionIdentity,reason,cutoff:input.cutoff,evidenceRefs:(input.evidence??[]).map(e=>({sourceId:e.id,blockId:e.blockId})),toolCallIds:(input.tools??[]).map(t=>t.toolCallId)};
 if(input.conflict)session.conflict={signature:input.conflict.signature,type:input.conflict.type,l1Id:input.conflict.l1Id,l2Id:input.conflict.l2Id};
 state.sessions[key]=session;
 const save=async()=>{try{await persist();}catch{throw flagshipStateError();}};
 await save();signal?.throwIfAborted();
 let output;
 try{output=await complete(structuredClone(clean));signal?.throwIfAborted();}
 catch(error){session.status='uncertain';await save();throw error;}
 try{
  const validated=await validate(structuredClone(output));
  const outcome=independentContextData(output);
  session.outcome=outcome;session.outcomeHash=objectHash(outcome);session.status='completed';
  if(metrics)session.metrics=normalizeFlagshipMetrics(metrics());
  await save();
  return validated;
 }catch(error){if(session.status==='completed')session.status='uncertain';else{session.status='rejected';await save();}throw error;}
}

export function validateFlagshipState(state){
 if(!state||state.version!==1||typeof state.cutoff!=='string'||!Number.isFinite(Date.parse(state.cutoff))||!state.sessions||typeof state.sessions!=='object'||Array.isArray(state.sessions)||Object.keys(state.sessions).some(k=>!['review','judge'].includes(k)))throw flagshipStateError();
 for(const [key,s] of Object.entries(state.sessions)){
  const purpose=key==='judge'?'judge':'critical-review',expected=state.authorizations?.[purpose]?.profileId??(key==='judge'?'flagship-judge':'flagship-review');
  if(s?.version!==1||!['reserved','uncertain','rejected','completed'].includes(s.status)||s.cutoff!==state.cutoff||!['inputHash','profileHash','connectionIdentity'].every(k=>typeof s[k]==='string'&&/^[a-f0-9]{64}$/.test(s[k]))||s.profileId!==expected||!Array.isArray(s.evidenceRefs)||!Array.isArray(s.toolCallIds))throw flagshipStateError();
  if(s.status==='completed'&&(!s.outcome||s.outcomeHash!==objectHash(s.outcome)))throw flagshipStateError();
 }
 return state;
}
export function assertFlagshipRecovery(job){
 if(!Object.hasOwn(job,'flagshipState'))return;
 validateFlagshipState(job.flagshipState);
 if(job.flagshipState.authorizations&&job.flagshipState.cutoff!==job.createdAt||Object.values(job.flagshipState.sessions).some(s=>s.jobId!==(job.id??null)))throw flagshipStateError();
 if(Object.values(job.flagshipState.sessions).some(s=>s.status!=='completed'))throw flagshipStateError();
}

export async function runFlagshipCall({job,purpose,packet,eligibility,validate,persist,signal,system,responseFormat,env=process.env,gateway}){
 const {flagshipRolloutStatus}=await import('./model-rollout.mjs');
 const status=flagshipRolloutStatus(purpose,env),auth=job.flagshipState?.authorizations?.[purpose];
 if(!status.accepted||!auth)return null;
 validateFlagshipState(job.flagshipState);
 if(job.flagshipState.cutoff!==job.createdAt)throw flagshipStateError();
 if(auth.fingerprint!==status.fingerprint||auth.approvalHash!==status.approvalHash||auth.profileHash!==objectHash(status.profile)||auth.connectionIdentity!==status.connectionIdentity||packet.cutoff!==job.flagshipState.cutoff)throw flagshipStateError();
 if(!eligibility?.eligible)return null;
 if(modelHealth.cooling(status.connectionIdentity))throw flagshipStateError();
 let response;
 const sessionInput={...packet,instruction:system,responseFormat};
 const run=()=>executeFlagshipSession({job,purpose,input:sessionInput,profile:status.profile,connectionIdentity:status.connectionIdentity,reason:eligibility.reason,persist,validate,signal,metrics:()=>response,
  complete:async captured=>{
   const {instruction,responseFormat:format,...payload}=captured;
   const activeGateway=gateway??(await import('./model-gateway.mjs')).modelGateway;
   response=await activeGateway.complete({purpose,routingContext:{profileId:status.profile.id},messages:[{role:'system',content:instruction},{role:'user',content:JSON.stringify(payload)}],stream:false,responseFormat:format,requiredCapabilities:['textInput','jsonSchema'],maxOutputTokens:8000,signal});
   if(response.message.tool_calls?.length)throw flagshipStateError();
   return JSON.parse(response.message.content);
  }});
 return callScope.run({job,purpose,profile:status.profile,connectionIdentity:status.connectionIdentity,approvalHash:status.approvalHash,conflictType:packet.conflict?.type??'critical_review'},run);
}

export async function runCriticalReview({job,failures,evidence,tools,draft,system,responseFormat,validate,persist,signal,missingData,env=process.env}){
 if(!job.flagshipState?.authorizations?.['critical-review'])return null;
 let packet;try{packet=buildIndependentContext({cutoff:job.flagshipState.cutoff,sources:job.input.sources,evidence,tools,conclusions:[draft]});}catch{return null;}
 packet.research=JSON.parse(JSON.stringify({question:job.input.question,mode:job.mode,depth:job.plan?.depth,portfolio:job.input.portfolio,portfolioContext:job.input.portfolioContext}));
 const eligibility=flagshipEligibility({purpose:'critical-review',mode:job.mode,evidenceSufficient:true,missingData,providerFailure:false,toolsPending:false,failures});
 return runFlagshipCall({job,purpose:'critical-review',packet,eligibility,validate,persist,signal,system,responseFormat,env});
}
