import {AsyncLocalStorage} from 'node:async_hooks';
import {isDeepStrictEqual} from 'node:util';
import {createLegacyModelCatalog,createPolicyModelCatalog} from './model-catalog.mjs';
import {modelConnectionIdentity} from './model-connection.mjs';
import {modelRoutingMode} from './model-routing.mjs';

const scope=new AsyncLocalStorage();
export const modelStateError=()=>Object.assign(new Error('已保存的模型配置与当前配置不兼容；请恢复原配置后续跑，不会重新采集或替换已有进度'),{code:'model_state_incompatible',status:409});
export function createJobModelState(env=process.env){
 const routingMode=modelRoutingMode(env);
 return {version:1,routingMode,policyVersion:routingMode==='dry-run'?1:null,
  profiles:createLegacyModelCatalog(env).profiles.map(p=>({id:p.id,model:p.model,connectionIdentity:modelConnectionIdentity(p,env),reasoningEffort:null,purposes:[...p.purposes]})),escalationHistory:[]};
}
const policyProfiles=env=>createPolicyModelCatalog(env).profiles.map(p=>({id:p.id,model:p.model,connectionIdentity:modelConnectionIdentity(p,env),reasoningEffort:null,purposes:[...p.purposes]}));
export function createPolicyJobModelState(env=process.env,initial){
 const start=initial??{profileId:'main',reasoningEffort:'low'};
 if(!escalationSteps.some(s=>isDeepStrictEqual(s,start)))throw modelStateError();
 return {version:2,routingMode:'policy',policyVersion:1,profiles:policyProfiles(env),...(initial?{initial:{...initial}}:{}),active:{...start},escalationHistory:[],failures:{invalid_tool_arguments:0,structured_output:0}};
}
export const escalationSteps=Object.freeze([Object.freeze({profileId:'main',reasoningEffort:'low'}),Object.freeze({profileId:'main',reasoningEffort:'high'}),Object.freeze({profileId:'pro',reasoningEffort:'high'}),Object.freeze({profileId:'pro',reasoningEffort:'max'})]);
function validPolicyState(state,env){
 const expected=createPolicyJobModelState(env,state.initial),history=state.escalationHistory,start=escalationSteps.findIndex(s=>isDeepStrictEqual(s,expected.active));
 if(!Array.isArray(history)||history.length>3-start||!state.failures||!['invalid_tool_arguments','structured_output'].every(k=>Number.isSafeInteger(state.failures[k])&&state.failures[k]>=0&&state.failures[k]<=2)||Object.keys(state.failures).length!==2)return false;
 if(history.some((h,i)=>!isDeepStrictEqual(h,{from:escalationSteps[start+i],to:escalationSteps[start+i+1],reason:h.reason,phase:h.phase})||!['invalid_tool_arguments','structured_output'].includes(h.reason)||!['research','review'].includes(h.phase)))return false;
 expected.active={...escalationSteps[start+history.length]};expected.escalationHistory=history;expected.failures=state.failures;
 return isDeepStrictEqual(state,expected);
}
export function assertJobModelState(job,env=process.env){
 const hasJob=Object.hasOwn(job,'modelState'),hasCheckpoint=job.checkpoint&&Object.hasOwn(job.checkpoint,'modelState');
 if(!hasJob&&!hasCheckpoint)return; // Absence only: no fabricated historical pin.
 if(!hasJob||!job.modelState)throw modelStateError();
 let valid;try{valid=job.modelState.version===2?validPolicyState(job.modelState,env):isDeepStrictEqual(job.modelState,createJobModelState(env));}catch{throw modelStateError();}
 if(!valid||job.checkpoint&&(!hasCheckpoint||!isDeepStrictEqual(job.checkpoint.modelState,job.modelState)))throw modelStateError();
 if(job.mode==='A'&&job.modelState.version===2&&!isDeepStrictEqual(job.modelState.active,escalationSteps[0]))throw modelStateError();
}
export function withJobModelState(job,run){assertJobModelState(job);return scope.run(job,run);}
export function modelStatePin(purpose,env){
 const job=scope.getStore();if(!job)return;
 assertJobModelState(job,env);
 const state=job.modelState;
 if(state?.version===2&&['research','review','followup'].includes(purpose))return {...state.profiles.find(p=>p.id===state.active.profileId),reasoningEffort:state.active.reasoningEffort};
 return state?.profiles.find(p=>p.purposes.includes(purpose));
}
export const hasPolicyModelState=()=>scope.getStore()?.modelState?.version===2;
export function noteModelFailure(job,kind){
 if(job.modelState?.version!==2||!['invalid_tool_arguments','structured_output'].includes(kind))return;
 job.modelState.failures[kind]=Math.min(2,job.modelState.failures[kind]+1);
 if(job.checkpoint)job.checkpoint.modelState=structuredClone(job.modelState);
}
