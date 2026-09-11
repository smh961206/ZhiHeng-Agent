import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createJobModelState,createPolicyJobModelState} from './model-state.mjs';
import {evaluateModelPolicy} from './model-policy.mjs';
import {modelTimeouts} from './model-deadline.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
export function modelRolloutFingerprint(env=process.env){
 const legacy=createJobModelState({...env,MODEL_ROUTING_MODE:'legacy'}),candidate=createPolicyJobModelState(env);
 const owners=['model-rollout','model-state','model-escalation','model-gateway','model-adapter','model-catalog','model-connection','model-routing','model-policy','research-complexity','model-deadline','model-request','model-stream','model-gateway-result','review-format','research-output','research-references','agent','research-context'];
 return hash(JSON.stringify({legacy,candidate,reviewFormat:env.LLM_REVIEW_FORMAT||'auto',timeouts:modelTimeouts(env),code:owners.map(name=>hash(fs.readFileSync(new URL('./'+name+'.mjs',import.meta.url))))}));
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
export function createConfiguredJobModelState(env=process.env,signals){
 if(modelRolloutStatus(env).active==='policy'){
  const candidate=evaluateModelPolicy(signals).candidate;
  if(candidate)return createPolicyJobModelState(env,{profileId:candidate.slot.toLowerCase(),reasoningEffort:candidate.reasoningEffort});
 }
 return createJobModelState(env);
}
export function assertModelRollout(job,env=process.env){
 if(job.modelState?.version===2&&modelRolloutStatus(env).active!=='policy')throw Object.assign(new Error('策略模式准入尚未通过或已回退；保留原研究进度，恢复准入后可续跑'),{code:'model_rollout_closed',status:409});
}
