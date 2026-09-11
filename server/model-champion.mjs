import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {modelTimeouts} from './model-deadline.mjs';
import {createBenchmarkModelCatalog} from './model-catalog.mjs';
import {modelConnectionIdentity} from './model-connection.mjs';
import {modelTaskClasses,taskClassifierVersion} from './model-task-class.mjs';
import {freeze,identifier,jsonData,requireBenchmark,timestamp} from '../benchmark/case.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {compareSamples} from '../benchmark/statistics.mjs';
export const championStages=Object.freeze(['disabled','dry-run','ab','production']);
export function championCodeFiles(){
 const root=new URL('../',import.meta.url);
 const walk=dir=>fs.readdirSync(new URL(dir+'/',root),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.name.endsWith('.mjs')?[dir+'/'+e.name]:[]);
 const knowledge=JSON.parse(fs.readFileSync(new URL('knowledge/modules.json',root)));
 return [...['server','shared','benchmark'].flatMap(walk),'package.json','pnpm-lock.yaml','knowledge/modules.json','knowledge/ENTRY.md',...knowledge.modules.map(m=>m.path)];
}
export function championCodeHash(){return objectHash(championCodeFiles().map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL('../'+name,import.meta.url))).digest('hex')]));}
export function championExecutionSettings(env=process.env){
 const reviewFormat=env.LLM_REVIEW_FORMAT||'auto';requireBenchmark(['auto','json_schema','json_object','text'].includes(reviewFormat),'review format setting');
 return {reviewFormat,timeouts:modelTimeouts(env)};
}
export function championIntentHash({id,stage,percent,taskClasses,reasoningEffort,configuration,codeHash,executionSettings}){return objectHash({id,stage,percent,taskClasses,reasoningEffort,configuration,codeHash,executionSettings});}
export function championConfiguration(env,baselineId='main',championId='main-challenger'){
 const catalog=createBenchmarkModelCatalog(env),profiles=[baselineId,championId].map(id=>catalog.profiles.find(p=>p.id===id));
 requireBenchmark(profiles.every(Boolean)&&profiles.every(p=>p.tier==='MAIN')&&baselineId!==championId,'two explicit MAIN profiles');
 return profiles.map(profile=>({profile,connectionIdentity:modelConnectionIdentity(profile,env)}));
}
// A trusted local operator attestation is required; hashes are not proof of honest scoring.
export function createChampionPolicy({id,stage,percent,taskClasses,evidence,review,reasoningEffort=null},env=process.env){
 const configuration=championConfiguration(env,evidence.baselineId,evidence.candidateId);
 const body={version:1,id,stage,percent,taskClasses,reasoningEffort,classifierVersion:taskClassifierVersion,evidence,review,configuration,executionSettings:championExecutionSettings(env),codeHash:championCodeHash()};
 const value={...body,hash:objectHash(body)};validateChampionPolicy(value,env);return freeze(value);
}
export function validateChampionPolicy(input,env=process.env){
 const p=jsonData(input),{hash,...body}=p;
 requireBenchmark(p.version===1&&identifier(p.id)&&hash===objectHash(body)&&championStages.includes(p.stage)&&Number.isInteger(p.percent)&&p.percent>=0&&p.percent<=100,'champion identity/stage');
 requireBenchmark((p.stage==='production'?p.percent===100:p.stage==='disabled'||p.stage==='dry-run'?p.percent===0:p.percent>0&&p.percent<100),'stage percentage');
 requireBenchmark(p.classifierVersion===taskClassifierVersion&&Array.isArray(p.taskClasses)&&p.taskClasses.length>0&&new Set(p.taskClasses).size===p.taskClasses.length&&p.taskClasses.every(c=>modelTaskClasses.includes(c)),'champion task coverage');
 const e=p.evidence,r=p.review;
 requireBenchmark(e?.version===1&&identifier(e.benchmarkVersion)&&/^[a-f0-9]{64}$/.test(e.suiteHash)&&Array.isArray(e.runBindings)&&e.runBindings.length>0&&e.runBindings.every(h=>/^[a-f0-9]{64}$/.test(h))&&timestamp(e.completedAt),'versioned frozen comparison evidence');
 requireBenchmark(Array.isArray(e.runArtifacts)&&e.runArtifacts.length>0&&new Set(e.runArtifacts.map(a=>a.runId)).size===e.runArtifacts.length&&e.runArtifacts.every(a=>identifier(a.runId)&&e.runBindings.includes(a.binding)&&/^[a-f0-9]{64}$/.test(a.resultsHash))&&e.runBindings.every(b=>e.runArtifacts.some(a=>a.binding===b)),'approved run result identities');
 const comparison=compareSamples(e.samples,{baselineId:e.baselineId,candidateId:e.candidateId,policy:e.statisticalPolicy});
 requireBenchmark(p.taskClasses.every(c=>comparison.tasks.find(t=>t.taskClass===c)?.eligible===true),'quality/sample/repeat gate');
 requireBenchmark(r&&identifier(r.approvedBy)&&timestamp(r.approvedAt)&&Date.parse(r.approvedAt)>=Date.parse(e.completedAt)&&r.evidenceHash===objectHash(e)&&r.pipelineReviewPassed===true&&r.dryRunVerified===true&&r.rollbackVerified===true,'artifact-bound operator and pipeline review');
 const expected=championConfiguration(env,e.baselineId,e.candidateId);requireBenchmark(objectHash(p.configuration)===objectHash(expected)&&p.codeHash===championCodeHash(),'champion configuration/code changed');
 requireBenchmark(e.configurationHash===objectHash(expected)&&e.codeHash===p.codeHash&&e.classifierVersion===taskClassifierVersion,'comparison execution identity changed');
 requireBenchmark(objectHash(p.executionSettings)===objectHash(championExecutionSettings(env))&&e.executionSettingsHash===objectHash(p.executionSettings),'research execution settings changed');
 requireBenchmark(e.reasoningEffort===p.reasoningEffort&&e.executionScope==='research-pipeline','measured research execution settings required');
 requireBenchmark(r.intentHash===championIntentHash(p),'operator rollout intent binding');
 requireBenchmark(p.reasoningEffort===null||['low','high','max'].includes(p.reasoningEffort),'explicit effort');
 for(const {profile} of expected){requireBenchmark(['textInput','streaming','toolCalling'].every(k=>profile.capabilities[k]===true)&&['research','review','followup'].every(k=>profile.purposes.includes(k)),'research capability gate');
  if(profile.schemaVersion===4)requireBenchmark(profile.capabilities.jsonObject===true&&profile.capabilities.jsonSchema===true,'candidate review format capability gate');
  if(profile.schemaVersion===2||profile.adapterOptions?.thinking==='enabled')requireBenchmark(p.reasoningEffort!==null,'explicit MAIN effort');
  else requireBenchmark(p.reasoningEffort===null,'unsupported effort');
 }
 if(p.taskClasses.includes('quick_screen'))requireBenchmark(p.reasoningEffort==='low','quick screen effort cap');
 return freeze(p);
}
export function validateChampionRegistry(input,env=process.env){
 const r=jsonData(input);requireBenchmark(r.version===1&&Array.isArray(r.policies)&&r.policies.length<=100&&new Set(r.policies.map(p=>p.id)).size===r.policies.length,'registry schema');
 // Disabled/old entries are retained as audit data. Only the explicitly selected entry executes.
 requireBenchmark(r.activePolicyId===null||identifier(r.activePolicyId)&&r.policies.some(p=>p.id===r.activePolicyId),'registry active policy');
 for(const p of r.policies){const {hash,...body}=p;requireBenchmark(hash===objectHash(body),'historical policy changed');}
 if(r.activePolicyId!==null)validateChampionPolicy(r.policies.find(p=>p.id===r.activePolicyId),env);
 return freeze(r);
}
export function taskChampion(registry,taskClass,env=process.env){
 const r=validateChampionRegistry(registry,env),policy=r.policies.find(p=>p.id===r.activePolicyId);
 return policy&&policy.taskClasses.includes(taskClass)&&!['disabled','dry-run'].includes(policy.stage)?policy:null;
}
