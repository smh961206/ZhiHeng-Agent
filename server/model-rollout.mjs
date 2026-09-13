import {modelEnvironment,modelConfig} from './model-config.mjs';
import {researchBudgetConfiguration} from './research-budget.mjs';
import {createBenchmarkModelCatalog,createVisionModelCatalog,createFlagshipModelCatalog,createPipelineModelCatalog,pipelineStageProfiles} from './model-catalog.mjs';
import {modelConnectionIdentity} from './model-connection.mjs';
import {benchmarkCodeHash} from '../benchmark/runner.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {gradeJudgeCase} from '../benchmark/graders.mjs';
import {summarizeModelCalls} from './model-telemetry.mjs';
import {validateReview} from './research-output.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createJobModelState,createPolicyJobModelState,createChampionJobModelState,createPipelineJobModelState} from './model-state.mjs';
import {validateChampionRegistry,validateChampionPolicy} from './model-champion.mjs';
import {assignModelExperiment,validateModelExperiment} from './model-experiment.mjs';
import {classifyModelTask} from './model-task-class.mjs';
import {resolveModelConnection} from './model-connection.mjs';
import {championInvalidated} from './model-drift.mjs';
import {evaluateModelPolicy} from './model-policy.mjs';
import {modelTimeouts} from './model-deadline.mjs';
import {modelRouting} from './model-routing.mjs';
import {configuredVisionProfile} from './vision-policy.mjs';

export function flagshipRolloutFingerprint(env=process.env){
 env=modelEnvironment(env);
 return objectHash({version:1,profiles:createFlagshipModelCatalog(env).profiles.map(profile=>({profile,connectionIdentity:modelConnectionIdentity(profile,env)})),baseline:createBenchmarkModelCatalog(env).profiles.map(profile=>({profile,connectionIdentity:modelConnectionIdentity(profile,env)})),code:benchmarkCodeHash(),budget:researchBudgetConfiguration(env),reviewFormat:env.LLM_REVIEW_FORMAT||'auto',timeouts:modelTimeouts(env)});
}
export function validateFlagshipRollout(report,env=process.env){
 const reasons=[];
 try{
  if(report?.version!==1||report.kind!=='flagship-live-acceptance'||!['critical-review','judge'].includes(report.purpose)||report.evidenceKind!=='live-model')throw Error();
  if(report.fingerprint!==flagshipRolloutFingerprint(env))reasons.push('configuration_or_code_changed');
  const {review,...evidence}=report;
  if(!review||typeof review.approvedBy!=='string'||!review.approvedBy.trim()||!Number.isFinite(Date.parse(review.approvedAt))||review.evidenceHash!==objectHash(evidence)||review.dryRunAccepted!==true||review.rollbackVerified!==true||review.costJustified!==true)reasons.push('operator_acceptance_required');
  const cases=report.cases;
  if(!Array.isArray(cases)||cases.length<20||cases.length>1000||new Set(cases.map(c=>c.id)).size!==cases.length||new Set(cases.map(c=>objectHash(c.fixture))).size!==cases.length)throw Error();
  const profileId=report.purpose==='judge'?'flagship-judge':'flagship-review';let baselineCorrect=0,candidateCorrect=0,extra=0,currency=null;
  const callIds=new Set();
  for(const c of cases){
   for(const arm of ['baseline','candidate']){
    const s=c[arm];if(!s||!Array.isArray(s.calls)||!Number.isSafeInteger(s.criticalErrors)||s.criticalErrors<0||typeof s.correct!=='boolean'||s.reviewHash!==objectHash({fixture:c.fixture,output:s.output,calls:s.calls,criticalErrors:s.criticalErrors,correct:s.correct}))throw Error();
    for(const call of s.calls){if(!call.id||callIds.has(call.id)||call.purpose!==report.purpose||call.status!=='succeeded'||!Number.isFinite(Date.parse(call.finishedAt))||Date.parse(call.finishedAt)>Date.parse(review?.approvedAt)||arm==='candidate'&&call.profile!==profileId)throw Error();callIds.add(call.id);}
    let passed=false;
    if(report.purpose==='judge')passed=gradeJudgeCase(c.fixture,s.output).passed;
    else{try{validateReview(s.output,{input:c.fixture.input,plan:createResearchPlan(c.fixture.input),sources:c.fixture.input.sources});passed=true;}catch{}}
    if(arm==='candidate'&&(!passed||s.criticalErrors!==0||!s.correct))reasons.push('candidate_quality_failure');
    if(passed&&s.correct&&s.criticalErrors===0){if(arm==='baseline')baselineCorrect++;else candidateCorrect++;}
    const summary=summarizeModelCalls(s.calls);
    if(s.output!==null&&!summary.costCoverage.complete)reasons.push('observed_cost_required');
    if(summary.billing.length>1)throw Error();
    if(summary.billing.length){const row=summary.billing[0];if(currency&&currency!==row.currency)throw Error();currency=row.currency;extra+=(arm==='candidate'?1:-1)*row.knownEstimatedCost;}
   }
  }
  if(candidateCorrect<=baselineCorrect)reasons.push('correctness_improvement_required');
  if(!report.extraCostLimit||report.extraCostLimit.currency!==currency||!Number.isFinite(report.extraCostLimit.amount)||report.extraCostLimit.amount<0||extra>report.extraCostLimit.amount)reasons.push('cost_justification_required');
  if(!Number.isSafeInteger(report.routineObservation?.jobs)||report.routineObservation.jobs<100||!Number.isSafeInteger(report.routineObservation.flagshipJobs)||report.routineObservation.flagshipJobs<0||report.routineObservation.flagshipJobs/report.routineObservation.jobs>.05)reasons.push('rare_use_observation_required');
 }catch{reasons.push('live_artifacts_required');}
 return {accepted:reasons.length===0,reasons:[...new Set(reasons)]};
}
export function flagshipRolloutStatus(purpose,env=process.env){
 const disabled={accepted:false,reasons:['disabled']};
 if(!['critical-review','judge'].includes(purpose))return disabled;
 const config=modelConfig(env);
 if(config?.schemaVersion===2){
  try{
   const stage=purpose==='judge'?'judge':'criticalReviewer',id=pipelineStageProfiles(stage,env)[0];
   if(!id)return disabled;
   const profile=createPipelineModelCatalog(env).profiles.find(p=>p.id===id),connectionIdentity=modelConnectionIdentity(profile,env);
   if(!profile||!resolveModelConnection(profile,env).key||profile.capabilities.jsonSchema!==true)throw Error();
   const fingerprint=objectHash({version:2,purpose,profile,connectionIdentity});
   return {accepted:true,reasons:[],fingerprint,approvalHash:fingerprint,profile,connectionIdentity};
  }catch{return {accepted:false,reasons:['configuration_missing_or_invalid']};}
 }
 if(env[purpose==='judge'?'FEATURE_JUDGE':'FEATURE_FLAGSHIP_REVIEW']!=='true')return disabled;
 try{
  const profile=createFlagshipModelCatalog(env).profiles.find(p=>p.purposes.includes(purpose));
  if(!profile||!resolveModelConnection(profile,env).key||profile.capabilities.jsonSchema!==true)throw Error();
  const file=env[purpose==='judge'?'JUDGE_ACCEPTANCE_FILE':'FLAGSHIP_REVIEW_ACCEPTANCE_FILE'];
  if(!file||fs.statSync(file).size>16*1024*1024)throw Error();
  const report=JSON.parse(fs.readFileSync(file,'utf8'));if(report.purpose!==purpose)throw Error();
  const result=validateFlagshipRollout(report,env);
  return {...result,...(result.accepted?{fingerprint:report.fingerprint,approvalHash:objectHash(report),profile,connectionIdentity:modelConnectionIdentity(profile,env)}:{})};
 }catch{return {accepted:false,reasons:['acceptance_missing_or_invalid']};}
}
export function createFlagshipJobState(job,env=process.env){
 const authorizations={};
 for(const purpose of ['critical-review','judge']){const s=flagshipRolloutStatus(purpose,env);if(s.accepted)authorizations[purpose]={fingerprint:s.fingerprint,approvalHash:s.approvalHash,profileHash:objectHash(s.profile),...(s.profile.schemaVersion===6?{profileId:s.profile.id}:{}),connectionIdentity:s.connectionIdentity};}
 if(!Object.keys(authorizations).length)return null;
 if(!Number.isFinite(Date.parse(job.createdAt)))throw new Error('Original research cutoff required');
 return {version:1,cutoff:job.createdAt,authorizations,sessions:{}};
}

// Public snapshot for new work, not a health check or a saved job's model identity.
// Never serialize policies, registry paths, credentials, groups or admission reasons.
export function publicModelSelection(env=process.env){
 try{
  const config=modelConfig(env);
  if(config?.schemaVersion===2){
   const catalog=createPipelineModelCatalog(env),researcher=catalog.profiles.find(p=>p.id===pipelineStageProfiles('researcher',env)[0]),vision=catalog.profiles.find(p=>p.id===pipelineStageProfiles('vision',env)[0]);
   const stageModels=Object.fromEntries(['input','vision','researcher','writer','evidenceVerifier','auditor','criticalReviewer','judge'].map(stage=>[stage,catalog.profiles.find(p=>p.id===pipelineStageProfiles(stage,env)[0])?.model??null]));
   return {mode:'pipeline',analysisModel:researcher?.model??null,visionModel:vision&&resolveModelConnection(vision,env).key?vision.model:null,stageModels,candidatesEnabled:Object.values(config.pipeline).some(value=>Array.isArray(value)&&value.length>1),stageRouting:true,optionalReviewEnabled:pipelineStageProfiles('criticalReviewer',env).length>0,judgeEnabled:pipelineStageProfiles('judge',env).length>0};
  }
  const mode=modelRolloutStatus(env).active,vision=configuredVisionProfile(env);
  return {mode,analysisModel:['legacy','dry-run'].includes(mode)?modelRouting(env).analysisModel:null,
   visionModel:vision.capabilities.imageInput===true&&resolveModelConnection(vision,env).key?vision.model:null,
   candidatesEnabled:['policy','champion'].includes(mode)||vision.id==='vision-challenger'};
 }catch{return {mode:'unknown',analysisModel:null,visionModel:null,candidatesEnabled:null};}
}

const hash=value=>createHash('sha256').update(value).digest('hex');
export function modelRolloutFingerprint(env=process.env){
 const legacy=createJobModelState({...env,MODEL_ROUTING_MODE:'legacy'}),candidate=createPolicyJobModelState(env);
 const owners=['research-budget','model-pricing','model-cache','model-telemetry','model-config','model-rollout','model-state','model-escalation','model-gateway','model-adapter','model-catalog','model-connection','model-routing','model-policy','research-complexity','model-deadline','model-request','model-stream','model-gateway-result','review-format','research-output','research-references','agent','research-context'];
 return hash(JSON.stringify({legacy,candidate,reviewFormat:env.LLM_REVIEW_FORMAT||'auto',timeouts:modelTimeouts(env),researchBudget:researchBudgetConfiguration(env),code:owners.map(name=>hash(fs.readFileSync(new URL('./'+name+'.mjs',import.meta.url))))}));
}
export function validateModelRollout(report,env=process.env){
 const reasons=[];
 if(report?.version!==1||report.kind!=='live-model-comparison')reasons.push('live_comparison_required');
 if(report?.fingerprint!==modelRolloutFingerprint(env))reasons.push('configuration_or_code_changed');
 if(report?.dryRunAccepted!==true)reasons.push('dry_run_required');
 if(report?.rollbackVerified!==true)reasons.push('rollback_required');
 if(typeof report?.approvedBy!=='string'||!report.approvedBy.trim()||typeof report?.approvedAt!=='string'||!Number.isFinite(Date.parse(report.approvedAt)))reasons.push('operator_acceptance_required');
 const cases=report?.cases;
 if(!Array.isArray(cases)||cases.length<50||cases.length>10000||new Set(cases.map(c=>c?.id)).size!==cases.length||cases.some(c=>typeof c?.id!=='string'||!c.id.trim()))reasons.push('fifty_unique_cases_required');
 else{
  if(!['A','B','C','D','E','F'].every(mode=>cases.some(c=>c.mode===mode)))reasons.push('six_mode_coverage_required');
  const valid=cases.every(c=>c.source==='live'&&['A','B','C','D','E','F'].includes(c.mode)&&['baseline','candidate'].every(k=>typeof c[k]?.deliveryPassed==='boolean'&&typeof c[k]?.citationPassed==='boolean'&&Number.isSafeInteger(c[k]?.criticalFactErrors)&&c[k].criticalFactErrors>=0));
  if(!valid)reasons.push('live_quality_measurements_required');
  else if(cases.some(c=>c.candidate.criticalFactErrors!==0||c.baseline.deliveryPassed&&!c.candidate.deliveryPassed||c.baseline.citationPassed&&!c.candidate.citationPassed)||!cases.every(c=>c.candidate.deliveryPassed&&c.candidate.citationPassed))reasons.push('quality_regression_or_failed_delivery');
 }
 return {accepted:reasons.length===0,reasons};
}
export function modelRolloutStatus(env=process.env){
 env=modelEnvironment(env);
 if(env.MODEL_ROUTING_MODE==='champion'){const {policy,...status}=championRolloutStatus(env);return status;}
 const requested=env.MODEL_ROUTING_MODE==='policy'?'policy':env.MODEL_ROUTING_MODE==='dry-run'?'dry-run':'legacy';
 if(requested!=='policy')return {requested,active:requested,reasons:[]};
 let report;
 try{
  const path=env.MODEL_POLICY_ACCEPTANCE_FILE;if(!path||fs.statSync(path).size>4*1024*1024)throw new Error();
  report=JSON.parse(fs.readFileSync(path,'utf8'));
  const result=validateModelRollout(report,env);
  if(!env.LLM_MAIN_API_KEY||!(env.LLM_PRO_API_KEY||env.LLM_API_KEY))return {requested,active:'legacy',reasons:[...result.reasons,'credentials_required']};
  return {requested,active:result.accepted?'policy':'legacy',reasons:result.reasons};
 }catch{return {requested,active:'legacy',reasons:['acceptance_report_missing_or_invalid']};}
}
export function createConfiguredJobModelState(env=process.env,signals,job){
 if(modelConfig(env)?.schemaVersion===2)return createPipelineJobModelState(env);
 if(env.MODEL_ROUTING_MODE==='champion'){
  const status=championRolloutStatus(env),taskClass=classifyModelTask({mode:job?.mode});
  if(status.active==='champion'&&job&&status.policy.taskClasses.includes(taskClass)){
   try{return createChampionJobModelState(env,assignModelExperiment(job,status.policy));}catch{return createJobModelState(env);}
  }
  return createJobModelState(env);
 }
 if(modelRolloutStatus(env).active==='policy'){
  const candidate=evaluateModelPolicy(signals).candidate;
  if(candidate)return createPolicyJobModelState(env,{profileId:candidate.slot.toLowerCase(),reasoningEffort:candidate.reasoningEffort});
 }
 return createJobModelState(env);
}
export function assertModelRollout(job,env=process.env){
 if(job.modelState?.version===3){
  const selection=job.modelState.selection,status=championRolloutStatus(env,selection?.policyId);
  try{if(status.active!=='champion')throw Error();validateModelExperiment(selection,{job,policy:status.policy});}
  catch{throw Object.assign(new Error('模型分组策略已停用或不再兼容；保留原研究进度，恢复原审批和配置后可续跑'),{code:'model_rollout_closed',status:409});}
 }
 if(job.modelState?.version===2&&modelRolloutStatus(env).active!=='policy')throw Object.assign(new Error('策略模式准入尚未通过或已回退；保留原研究进度，恢复准入后可续跑'),{code:'model_rollout_closed',status:409});
}

export function championRolloutStatus(env=process.env,pinnedPolicyId){
 env=modelEnvironment(env);
 const closed=reason=>({requested:env.MODEL_ROUTING_MODE==='champion'?'champion':'legacy',active:'legacy',reasons:[reason]});
 if(env.MODEL_ROUTING_MODE!=='champion'||env.MODEL_CHAMPION_ENABLED!=='true')return closed('champion_disabled');
 try{
  const file=env.MODEL_CHAMPION_REGISTRY_FILE;if(!file||fs.statSync(file).size>4*1024*1024)return closed('registry_missing_or_invalid');
  const registry=validateChampionRegistry(JSON.parse(fs.readFileSync(file,'utf8')),env);
  if(!registry.activePolicyId||registry.activePolicyId!==env.MODEL_CHAMPION_POLICY_VERSION)return closed('explicit_policy_version_required');
  const policy=registry.policies.find(p=>p.id===(pinnedPolicyId??registry.activePolicyId));if(!policy)return closed('pinned_policy_missing');
  validateChampionPolicy(policy,env);
  if(championInvalidated(policy,env))return closed('champion_drift_invalidation');
  if(policy.stage==='disabled'||policy.stage==='dry-run')return closed(policy.stage==='dry-run'?'dry_run_only':'policy_disabled');
  if(policy.stage==='ab'&&env.MODEL_AB_ENABLED!=='true')return closed('ab_disabled');
  if(!policy.configuration.every(({profile})=>resolveModelConnection(profile,env).key))return closed('credentials_required');
  return {requested:'champion',active:'champion',reasons:[],policy};
 }catch{return closed('champion_evidence_or_configuration_invalid');}
}

// Public readiness validates the explicit source without exposing its path or errors.
export function modelConfigurationStatus(env=process.env){
 if(!env.MODEL_CONFIG_FILE)return {configured:Boolean(env.LLM_API_KEY&&env.LLM_MODEL),model:env.LLM_MODEL||null,configurationError:false};
 try{
  const config=modelConfig(env);
  if(config?.schemaVersion===2){
   const catalog=createPipelineModelCatalog(env),required=['input','vision','researcher','writer','evidenceVerifier','auditor'].map(stage=>catalog.profiles.find(p=>p.id===pipelineStageProfiles(stage,env)[0]));
   return {configured:required.every(profile=>profile&&resolveModelConnection(profile,env).key),model:required[2]?.model??null,configurationError:false};
  }
  const effective=modelEnvironment(env),catalog=createBenchmarkModelCatalog(effective);createVisionModelCatalog(effective);
  const profile=catalog.profiles.find(p=>p.id==='legacy-analysis');
  const configured=Boolean(effective.LLM_MODEL&&resolveModelConnection(profile,effective).key);
  return {configured,model:profile.model,configurationError:false};
 }catch{return {configured:false,model:null,configurationError:true};}
}
