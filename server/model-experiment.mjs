import {createHash} from 'node:crypto';
import {freeze,identifier,jsonData,timestamp} from '../benchmark/case.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {createModelProfile} from './model-catalog.mjs';
import {classifyModelTask,taskClassifierVersion} from './model-task-class.mjs';

export const modelExperimentAlgorithm='sha256-json-u32-mod100-v1';
const invalid=()=>{throw Object.assign(new TypeError('Invalid model experiment selection'),{code:'model_experiment_invalid'});};
const check=value=>{if(!value)invalid();};
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const bucketFor=(jobId,policyId)=>Number.parseInt(createHash('sha256').update(JSON.stringify([jobId,policyId])).digest('hex').slice(0,8),16)%100;
const fields=['version','policyId','policyHash','jobId','createdAt','mode','taskClass','classifierVersion','algorithm','bucket','stage','percent','group','baselineId','candidateId','profileId','effort','configurationHash','approvedAt'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
function jobIdentity(job){
 const value={};
 for(const key of ['id','createdAt','mode']){
  const descriptor=Object.getOwnPropertyDescriptor(job??{},key);
  check(descriptor?.enumerable&&Object.hasOwn(descriptor,'value'));value[key]=descriptor.value;
 }
 check(identifier(value.id)&&timestamp(value.createdAt)&&['A','B','C','D','E','F'].includes(value.mode));
 return value;
}

// Pure assignment from an already admitted policy. Registry/quality/code admission
// belongs to model-champion/model-rollout, never inferred from a self-supplied hash.
// Only job.mode is currently an established creation-time classification signal.
export function assignModelExperiment(job,policy){
 try{
  const j=jobIdentity(job),p=jsonData(policy),{hash:policyHash,...body}=p;
  check(p.version===1&&identifier(p.id)&&hash(policyHash)&&policyHash===objectHash(body));
  check(p.classifierVersion===taskClassifierVersion&&Array.isArray(p.taskClasses)&&new Set(p.taskClasses).size===p.taskClasses.length);
  const taskClass=classifyModelTask({mode:j.mode});check(p.taskClasses.includes(taskClass));
  const baselineId=p.evidence?.baselineId,candidateId=p.evidence?.candidateId;
  check(['main','main-challenger'].includes(baselineId)&&['main','main-challenger'].includes(candidateId)&&baselineId!==candidateId);
  check(Array.isArray(p.configuration)&&p.configuration.length===2);
  p.configuration.forEach((entry,i)=>{
   check(exact(entry,['profile','connectionIdentity'])&&hash(entry.connectionIdentity));
   const profile=createModelProfile(entry.profile);
   check(profile.id===[baselineId,candidateId][i]&&profile.tier==='MAIN');
  });
  const bucket=bucketFor(j.id,p.id),group=bucket<p.percent?'candidate':'baseline';
  return validateModelExperiment({version:1,policyId:p.id,policyHash,jobId:j.id,createdAt:j.createdAt,mode:j.mode,taskClass,
   classifierVersion:p.classifierVersion,algorithm:modelExperimentAlgorithm,bucket,stage:p.stage,percent:p.percent,group,
   baselineId,candidateId,profileId:group==='candidate'?candidateId:baselineId,effort:p.reasoningEffort,
   configurationHash:objectHash(p.configuration),approvedAt:p.review?.approvedAt});
 }catch{invalid();}
}

export function validateModelExperiment(input,{job,policy}={}){
 try{
  const s=jsonData(input);
  check(exact(s,fields)&&s.version===1&&identifier(s.policyId)&&hash(s.policyHash)&&identifier(s.jobId));
  check(timestamp(s.createdAt)&&timestamp(s.approvedAt)&&Date.parse(s.approvedAt)<=Date.parse(s.createdAt));
  check(['A','B','C','D','E','F'].includes(s.mode)&&s.taskClass===classifyModelTask({mode:s.mode})&&s.classifierVersion===taskClassifierVersion);
  check(s.algorithm===modelExperimentAlgorithm&&Number.isInteger(s.bucket)&&s.bucket===bucketFor(s.jobId,s.policyId));
  check(Number.isInteger(s.percent)&&(s.stage==='ab'?s.percent>0&&s.percent<100:s.stage==='production'&&s.percent===100));
  check(s.group===(s.bucket<s.percent?'candidate':'baseline'));
  check(['main','main-challenger'].includes(s.baselineId)&&['main','main-challenger'].includes(s.candidateId)&&s.baselineId!==s.candidateId);
  check(s.profileId===(s.group==='candidate'?s.candidateId:s.baselineId)&&hash(s.configurationHash));
  check(s.effort===null||['low','high','max'].includes(s.effort));
  if(s.mode==='A')check(s.effort==='low');
  if(job!==undefined){const j=jobIdentity(job);check(s.jobId===j.id&&s.createdAt===j.createdAt&&s.mode===j.mode);}
  if(policy!==undefined)check(objectHash(s)===objectHash(assignModelExperiment(job??{id:s.jobId,createdAt:s.createdAt,mode:s.mode},policy)));
  return freeze(s);
 }catch{invalid();}
}
