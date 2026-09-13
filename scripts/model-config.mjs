import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {createBenchmarkModelCatalog,createVisionModelCatalog} from '../server/model-catalog.mjs';
import {resolveModelConnection,modelConnectionIdentity} from '../server/model-connection.mjs';
import {createJobModelState,createPolicyJobModelState} from '../server/model-state.mjs';
import {modelRoles,validateModelConfig,modelDefinitionKeys,modelConfig} from '../server/model-config.mjs';

const fail=()=>{throw new Error('模型配置迁移校验失败；请检查参数、引用和新旧配置是否一致');};
function profiles(env){return [...new Map([...createBenchmarkModelCatalog(env).profiles,...createVisionModelCatalog(env).profiles].map(p=>[p.id,p])).values()];}
function keyReference(id,env){
 if(id==='legacy-vision')return env.LLM_VISION_API_KEY?'LLM_VISION_API_KEY':'LLM_API_KEY';
 if(id==='main')return 'LLM_MAIN_API_KEY';
 if(id==='pro')return env.LLM_PRO_API_KEY?'LLM_PRO_API_KEY':'LLM_API_KEY';
 if(id==='vision-challenger')return 'LLM_VISION_CHALLENGER_API_KEY';
 if(id==='main-challenger')return 'LLM_MAIN_CHALLENGER_API_KEY';
 return 'LLM_API_KEY';
}
export function buildLegacyModelConfig(env=process.env){
 if(env.MODEL_CONFIG_FILE?.trim())return modelConfig(env);
 const legacy={...env,MODEL_CONFIG_FILE:''},result={schemaVersion:1,connections:{},profiles:{},roles:{}};
 for(const p of profiles(legacy)){
  const role=Object.keys(modelRoles).find(k=>modelRoles[k]===p.id);if(!role)fail();
  const connection={protocol:p.protocol,baseUrl:resolveModelConnection(p,legacy).base,apiKeyEnv:keyReference(p.id,legacy)};
  let connectionRef=Object.keys(result.connections).find(k=>isDeepStrictEqual(result.connections[k],connection));
  if(!connectionRef){connectionRef=p.id;result.connections[connectionRef]=connection;}
  const profile={model:p.model,provider:p.provider,connectionRef,capabilities:{...p.capabilities},adapterOptions:p.adapterOptions?{...p.adapterOptions}:null};
  let profileRef=Object.keys(result.profiles).find(k=>isDeepStrictEqual(result.profiles[k],profile));
  if(!profileRef){profileRef=p.id;result.profiles[profileRef]=profile;}
  result.roles[role]=profileRef;
 }
 return validateModelConfig(result);
}
export function verifyModelConfig(file,env=process.env){
 const current=modelConfig(env);
 if(current?.schemaVersion===2){
  const candidate=validateModelConfig(JSON.parse(fs.readFileSync(file,'utf8')));
  if(candidate.schemaVersion!==2||!isDeepStrictEqual(current,candidate))fail();
  const references=[...new Set(Object.values(candidate.pipeline).flatMap(value=>typeof value==='string'?[value]:value))];
  return {equivalent:true,schemaVersion:2,models:Object.keys(candidate.models).length,stages:Object.keys(candidate.pipeline).length,credentialsConfigured:references.every(id=>Boolean(env[candidate.models[id].apiKeyEnv])),paidCalls:0};
 }
 const legacy={...env},next={...env,MODEL_CONFIG_FILE:file};
 const oldProfiles=profiles(legacy),newProfiles=profiles(next);
 if(!isDeepStrictEqual(oldProfiles,newProfiles))fail();
 for(const p of oldProfiles){
  if(modelConnectionIdentity(p,legacy)!==modelConnectionIdentity(p,next)||!isDeepStrictEqual(resolveModelConnection(p,legacy),resolveModelConnection(p,next)))fail();
 }
 if(!isDeepStrictEqual(createJobModelState(legacy),createJobModelState(next))||!isDeepStrictEqual(createPolicyJobModelState(legacy),createPolicyJobModelState(next)))fail();
 return {equivalent:true,profiles:oldProfiles.length,connectionValuesEqual:true,legacyAndPolicyPinsEqual:true,paidCalls:0};
}
export function writeLegacyModelConfig(file,config,root=process.cwd()){
 const target=path.resolve(root,file),relative=path.relative(path.resolve(root),target);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))fail();
 let parent=path.dirname(target);while(!fs.existsSync(parent))parent=path.dirname(parent);
 const resolved=path.relative(fs.realpathSync(root),fs.realpathSync(parent));if(resolved.startsWith('..')||path.isAbsolute(resolved))fail();
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify(validateModelConfig(config),null,2)+'\n',{flag:'wx',mode:0o600});
 return target;
}
export function parseConfigArguments(args){
 if(args.length!==2||args[0]!=='--check'||!args[1]||args[1].startsWith('--'))fail();
 return {'--check':args[1]};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const options=parseConfigArguments(process.argv.slice(2));
  console.log(JSON.stringify(verifyModelConfig(options['--check'])));
 }catch(error){console.error('模型配置操作未完成：请检查参数、目标文件是否已存在及配置是否一致；未输出凭据。');if(modelDefinitionKeys.includes(error?.configurationField))console.error('冲突字段：'+error.configurationField);process.exitCode=1;}
}
