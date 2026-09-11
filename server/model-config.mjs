import fs from 'node:fs';
import path from 'node:path';
import {ModelGatewayError} from './model-gateway-result.mjs';

// Configuration only: no transport, approvals, persisted job state or secret serialization.
export const modelRoles=Object.freeze({defaultResearch:'legacy-analysis',router:'legacy-router',vision:'legacy-vision',policyMain:'main',policyPro:'pro',visionChallenger:'vision-challenger',mainChallenger:'main-challenger'});
const prefixes={defaultResearch:'LLM',router:'LLM_ROUTER',vision:'LLM_VISION',policyMain:'LLM_MAIN',policyPro:'LLM_PRO',visionChallenger:'LLM_VISION_CHALLENGER',mainChallenger:'LLM_MAIN_CHALLENGER'};
const caps=['textInput','imageInput','streaming','toolCalling','jsonObject','jsonSchema','reasoningControl'];
// Preserve the existing legacy declaration; never infer arbitrary model capability.
export function legacyVisionImageInput(model,inputMode){return inputMode!=='off'&&(model==='deepseek-flash'||inputMode==='images');}
const fail=field=>{const error=new ModelGatewayError('configuration');if(typeof field==='string'&&definitionKeys.includes(field))error.configurationField=field;throw error;};
const text=v=>typeof v==='string'&&v.trim().length>0;
const record=v=>v&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v,keys)=>{if(!record(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail();};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function parseModelConfigJSON(source){
 try{
  if(typeof source!=='string'||Buffer.byteLength(source)>256*1024)fail();
  const result=JSON.parse(source);let i=0;
  const ws=()=>{while(/\s/.test(source[i]??'')&&i<source.length)i++;};
  const string=()=>{const start=i++;while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i++]==='"')return JSON.parse(source.slice(start,i));}fail();};
  const visit=(depth=0)=>{if(depth>24)fail();ws();const c=source[i++];
   if(c==='{'){const seen=new Set();ws();if(source[i]==='}'){i++;return;}while(true){ws();const key=string();if(seen.has(key)||['__proto__','prototype','constructor'].includes(key))fail();seen.add(key);ws();i++;visit(depth+1);ws();if(source[i++]==='}')return;}}
   else if(c==='['){ws();if(source[i]===']'){i++;return;}while(true){visit(depth+1);ws();if(source[i++]===']')return;}}
   else if(c==='"'){i--;string();}else while(i<source.length&&!/[\s,\]}]/.test(source[i]))i++;
  };visit();return result;
 }catch{fail();}
}
export function validateModelConfig(input){
 try{
  exact(input,['schemaVersion','connections','profiles','roles']);if(input.schemaVersion!==1)fail();
  for(const field of ['connections','profiles','roles'])if(!record(input[field])||Object.keys(input[field]).length>32)fail();
  for(const [id,c] of Object.entries(input.connections)){
   if(!/^[a-z][a-z0-9-]{0,63}$/.test(id))fail();exact(c,['protocol','baseUrl','apiKeyEnv']);
   if(c.protocol!=='openai-chat-completions'||!text(c.baseUrl)||!/^[A-Z][A-Z0-9_]*$/.test(c.apiKeyEnv)||c.apiKeyEnv.startsWith('VITE_'))fail();
   const url=new URL(c.baseUrl);if(url.username||url.password||url.search||url.hash||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))fail();
  }
  for(const [id,p] of Object.entries(input.profiles)){
   if(!/^[a-z][a-z0-9-]{0,63}$/.test(id))fail();exact(p,['model','provider','connectionRef','capabilities','adapterOptions']);
   if(!text(p.model)||!(p.provider===null||text(p.provider))||!Object.hasOwn(input.connections,p.connectionRef))fail();
   exact(p.capabilities,caps);if(caps.some(k=>p.capabilities[k]!==null&&typeof p.capabilities[k]!=='boolean'))fail();
   if(p.adapterOptions!==null){exact(p.adapterOptions,['thinking']);if(!['omit','disabled','enabled'].includes(p.adapterOptions.thinking))fail();}
  }
  for(const role of ['defaultResearch','router','vision','policyMain','policyPro'])if(!Object.hasOwn(input.roles,role))fail();
  for(const [role,id] of Object.entries(input.roles))if(!Object.hasOwn(modelRoles,role)||!Object.hasOwn(input.profiles,id))fail();
  if(new Set(Object.values(input.roles)).size!==Object.keys(input.profiles).length||new Set(Object.values(input.profiles).map(p=>p.connectionRef)).size!==Object.keys(input.connections).length)fail();
  return freeze(input);
 }catch{fail();}
}
// Startup/first-use snapshot. A bad explicit source stays closed until restart too.
const files=new Map();
const secretSource=Symbol('model-config-secret-source');
function source(env){
 if(!env.MODEL_CONFIG_FILE)return null;
 const file=path.resolve(env.MODEL_CONFIG_FILE);
 if(!files.has(file)){
  if(files.size>=64)fail();let value=null;
  try{if(!fs.statSync(file).isFile()||fs.statSync(file).size>256*1024)fail();value=validateModelConfig(parseModelConfigJSON(fs.readFileSync(file,'utf8')));}catch{}
  files.set(file,value);
 }
 const config=files.get(file);if(!config)fail();return config;
}
const definitionKeys=Object.entries(prefixes).flatMap(([role,prefix])=>role==='router'?[prefix+'_MODEL']:[prefix+'_MODEL',prefix+'_BASE_URL',...(role.includes('Challenger')?[prefix+'_PROVIDER',prefix+'_THINKING',prefix+(role==='mainChallenger'?'_CAPABILITIES':'_INPUT')]:role==='vision'?[prefix+'_INPUT']:[])]);
export const modelDefinitionKeys=Object.freeze(definitionKeys);
function projection(config,env){
 const output={};
 for(const [role,id] of Object.entries(config.roles)){
  const p=config.profiles[id],c=config.connections[p.connectionRef],prefix=prefixes[role];output[prefix+'_MODEL']=p.model;
  if(role!=='router'){output[prefix+'_BASE_URL']=c.baseUrl;output[prefix+'_API_KEY']=env[c.apiKeyEnv]||'';}
  if(role==='vision')output.LLM_VISION_INPUT=p.capabilities.imageInput===true?'images':'off';
  if(role.includes('Challenger')){output[prefix+'_PROVIDER']=p.provider??'';output[prefix+'_THINKING']=p.adapterOptions?.thinking??'omit';
   if(role==='visionChallenger')output[prefix+'_INPUT']=p.capabilities.imageInput===true?'images':'off';
   else output[prefix+'_CAPABILITIES']=JSON.stringify(p.capabilities);
  }
 }
 return output;
}
function equivalent(key,a,b,env){
 if(key==='LLM_VISION_INPUT')return legacyVisionImageInput(env.LLM_VISION_MODEL,a)===(b==='images');
 if(key.endsWith('_BASE_URL')){try{return new URL(a).href.replace(/\/$/,'')===new URL(b).href.replace(/\/$/,'');}catch{return false;}}
 if(key.endsWith('_CAPABILITIES')){try{const x=JSON.parse(a),y=JSON.parse(b);return caps.every(k=>x[k]===y[k])&&Object.keys(x).length===caps.length;}catch{return false;}}
 return a===b;
}
export function modelConfig(env=process.env){
 env=env[secretSource]??env;
 const config=source(env);if(!config)return null;const projected=projection(config,env);
 for(const key of definitionKeys)if(env[key]&&!equivalent(key,env[key],projected[key],{...projected,...env}))fail(key);
 return config;
}
// Existing facades receive effective values; the original env is never mutated.
export function modelEnvironment(env=process.env){
 if(env[secretSource])return env;
 const config=modelConfig(env);if(!config)return env;
 const effective={...env};for(const key of definitionKeys)delete effective[key];
 for(const [role,prefix] of Object.entries(prefixes))if(role!=='router')delete effective[prefix+'_API_KEY'];
 return {...effective,...projection(config,env),[secretSource]:Object.freeze({...env})};
}
export function configuredRoleMetadata(env,role,defaults){
 const config=modelConfig(env);if(!config)return defaults;
 const p=config.profiles[config.roles[role]];if(!p)fail();
 if((defaults.schemaVersion===1||defaults.schemaVersion===2)&&p.adapterOptions!==null)fail();
 return {...defaults,model:p.model,provider:p.provider,capabilities:p.capabilities,...(defaults.schemaVersion>=3?{adapterOptions:p.adapterOptions}:{} )};
}
export function configuredConnection(profile,env){
 env=env[secretSource]??env;
 const config=modelConfig(env);if(!config)return null;
 const role=Object.keys(modelRoles).find(role=>modelRoles[role]===profile.id);const p=config.profiles[config.roles[role]];if(!p)fail();
 const c=config.connections[p.connectionRef];
 return {base:c.baseUrl,key:env[c.apiKeyEnv]};
}
