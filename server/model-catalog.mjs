import {modelEnvironment,modelConfig,modelPipelineStages,configuredRoleMetadata,legacyVisionImageInput} from './model-config.mjs';
import {modelRouting} from './model-routing.mjs';
import {createModelPricing} from './model-pricing.mjs';

export {legacyVisionImageInput} from './model-config.mjs';

/**
 * @typedef {Object} ModelProfile
 * @property {1} schemaVersion Configuration schema, not a research schema.
 * @property {string} id Stable configuration identity; not a job/model pin.
 * @property {'legacy-env'} source
 * @property {string} model Opaque model ID, preserved verbatim.
 * @property {string|null} provider Unknown for arbitrary compatible endpoints.
 * @property {'openai-chat-completions'} protocol Wire family, not provider identity.
 * @property {'legacy-analysis'|'legacy-vision'} connectionRef Server-only lookup
 *   through modelRouting; URLs and credentials do not belong in this object.
 * @property {'legacy'} tier Does not infer MAIN/PRO from a model name.
 * @property {Array<'research'|'review'|'followup'|'router'|'vision'>} purposes
 * @property {{textInput:boolean|null,imageInput:boolean|null,streaming:boolean|null,
 *   toolCalling:boolean|null,jsonObject:boolean|null,jsonSchema:boolean|null,
 *   reasoningControl:boolean|null}} capabilities Configured transport usage,
 *   not provider certification. Unknown support is null, never assumed true.
 * @property {number|null} contextWindow Unknown token limit is null.
 * @property {number|null} maxOutputTokens Provider limit, not per-request budget.
 * @property {{currency:string,unit:'per-million-tokens',input:number|null,
 *   output:number|null,cacheRead:number|null}|null} pricing Unknown is not free.
 */

const fields=['schemaVersion','id','source','model','provider','protocol','connectionRef','tier','purposes','capabilities','contextWindow','maxOutputTokens','pricing'];
const capabilityFields=['textInput','imageInput','streaming','toolCalling','jsonObject','jsonSchema','reasoningControl'];
const purposes=['research','review','followup','router','input','vision','researcher','writer','evidence-verifier','auditor','critical-review','judge'];
const invalid=()=>{throw new TypeError('Invalid ModelProfile metadata');};
// Accept data-only records: spreading accessors after validation can read a
// different value, and non-enumerable fields silently disappear from snapshots.
const record=(value,keys)=>{
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))invalid();
 const result={};
 for(const key of keys){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))invalid();
  result[key]=descriptor.value;
 }
 return result;
};
const purposeList=value=>{
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||!value.length||value.length>purposes.length)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(descriptors).length!==value.length+1)invalid();
 const result=Array.from({length:value.length},(_,index)=>{
  const descriptor=descriptors[index];
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value')||!purposes.includes(descriptor.value))invalid();
  return descriptor.value;
 });
 if(new Set(result).size!==result.length)invalid();
 return result;
};
const text=value=>typeof value==='string'&&value.trim().length>0;
const tokenLimit=value=>value===null||Number.isSafeInteger(value)&&value>0;

/** Validate, copy and deeply freeze a profile. Never attach an env or a secret. */
export function createModelProfile(input){
 const version=Object.getOwnPropertyDescriptor(input??{},'schemaVersion')?.value;
 input=record(input,version===5?[...fields,'adapterOptions','allow']:version===3||version===4?[...fields,'adapterOptions']:fields);
 const legacy=input.schemaVersion===1&&input.source==='legacy-env'&&input.tier==='legacy'&&['legacy-analysis','legacy-vision'].includes(input.connectionRef);
 const policy=input.schemaVersion===2&&input.source==='policy-config'&&['MAIN','PRO'].includes(input.tier)&&input.connectionRef===input.tier.toLowerCase()&&['zai','deepseek'].includes(input.provider);
 const vision=input.schemaVersion===3&&input.source==='vision-config'&&input.tier==='VISION'&&input.connectionRef==='vision-challenger'&&input.id==='vision-challenger';
 const challenger=input.schemaVersion===4&&input.source==='challenger-config'&&input.tier==='MAIN'&&input.connectionRef==='main-challenger'&&input.id==='main-challenger';
 const flagship=input.schemaVersion===5&&input.source==='flagship-config'&&input.tier==='FLAGSHIP'&&['flagship-review','flagship-judge'].includes(input.id)&&input.connectionRef===input.id;
 const pipeline=input.schemaVersion===6&&input.source==='pipeline-config'&&input.tier==='configured'&&input.id===`configured-${input.connectionRef}`&&/^[a-z][a-z0-9-]{0,51}$/.test(input.connectionRef);
 if(!(legacy||policy||vision||challenger||flagship||pipeline)||!text(input.id)||!text(input.model)||
  !(input.provider===null||text(input.provider))||input.protocol!=='openai-chat-completions'||
  policy&&(input.tier==='MAIN'&&(input.model!=='glm-5.3-flash'||input.provider!=='zai')||input.tier==='PRO'&&(input.model!=='deepseek-flash'||input.provider!=='deepseek')))invalid();
 input.purposes=purposeList(input.purposes);
 if(!flagship&&!pipeline&&input.purposes.some(p=>['critical-review','judge'].includes(p)))invalid();
 if(flagship){
  const purpose=input.id==='flagship-review'?'critical-review':'judge';
  if(input.purposes.length!==1||input.purposes[0]!==purpose)invalid();
  input.allow=record(input.allow,['criticalReview','judge']);
  if(Object.values(input.allow).some(v=>typeof v!=='boolean')||input.allow[purpose==='judge'?'criticalReview':'judge']!==false)invalid();
  input.allow=Object.freeze({...input.allow});
 }
 if(vision||challenger||flagship){
  if(vision&&(input.purposes.length!==1||input.purposes[0]!=='vision')||challenger&&input.purposes.some(p=>!['research','review','followup'].includes(p)))invalid();
  input.adapterOptions=record(input.adapterOptions,['thinking']);
  if(!(challenger||flagship?['omit','disabled','enabled']:['omit','disabled']).includes(input.adapterOptions.thinking))invalid();
  input.adapterOptions=Object.freeze({...input.adapterOptions});
 }
 input.capabilities=record(input.capabilities,capabilityFields);
 if(capabilityFields.some(key=>input.capabilities[key]!==null&&typeof input.capabilities[key]!=='boolean'))invalid();
 if(flagship&&(input.capabilities.textInput!==true||input.capabilities.toolCalling!==false||input.capabilities.streaming!==false))invalid();
 if((challenger||flagship)&&(input.capabilities.imageInput!==false||
  (input.adapterOptions.thinking==='enabled'?input.capabilities.reasoningControl!==true:input.capabilities.reasoningControl===true)))invalid();
 if(!tokenLimit(input.contextWindow)||!tokenLimit(input.maxOutputTokens))invalid();
 let pricing=null;
 if(input.pricing!==null){
  try{pricing=createModelPricing(input.pricing);}catch{invalid();}
 }
 return Object.freeze({...input,purposes:Object.freeze([...input.purposes]),capabilities:Object.freeze({...input.capabilities}),pricing});
}

const pipelinePurpose=stage=>modelPipelineStages[stage];
const configuredCapabilities=assigned=>Object.freeze({
 textInput:true,
 imageInput:assigned.includes('vision'),
 streaming:assigned.some(stage=>['researcher','writer','evidenceVerifier','auditor'].includes(stage)),
 toolCalling:assigned.some(stage=>['researcher','auditor'].includes(stage)),
 jsonObject:assigned.some(stage=>['evidenceVerifier','auditor'].includes(stage))?true:null,
 jsonSchema:assigned.some(stage=>['criticalReviewer','judge'].includes(stage))?true:null,
 reasoningControl:null,
});
export const configuredProfileId=alias=>`configured-${alias}`;
export function pipelineStageProfiles(stage,env=process.env){
 const config=modelConfig(env);if(config?.schemaVersion!==2||!Object.hasOwn(modelPipelineStages,stage))return Object.freeze([]);
 const value=config.pipeline[stage],pool=typeof value==='string'?[value]:value;
 return Object.freeze(pool.map(configuredProfileId));
}
export function createPipelineModelCatalog(env=process.env){
 const config=modelConfig(env);if(config?.schemaVersion!==2)invalid();
 const profiles=Object.entries(config.models).map(([alias,definition])=>{
  const assigned=Object.keys(modelPipelineStages).filter(stage=>{const value=config.pipeline[stage];return (typeof value==='string'?[value]:value).includes(alias);});
  return createModelProfile({schemaVersion:6,id:configuredProfileId(alias),source:'pipeline-config',model:definition.model,provider:null,protocol:'openai-chat-completions',connectionRef:alias,tier:'configured',purposes:assigned.map(pipelinePurpose),capabilities:configuredCapabilities(assigned),contextWindow:null,maxOutputTokens:null,pricing:null});
 });
 return Object.freeze({schemaVersion:6,profiles:Object.freeze(profiles)});
}

// Independent exceptional roles only; never included in default/research catalogs.
export function createFlagshipModelCatalog(env=process.env){
 env=modelEnvironment(env);
 const profiles=[];
 for(const [role,id,prefix,purpose] of [['flagshipReview','flagship-review','LLM_FLAGSHIP_REVIEW','critical-review'],['flagshipJudge','flagship-judge','LLM_FLAGSHIP_JUDGE','judge']]){
  if(!env[prefix+'_MODEL'])continue;
  let capabilities;try{capabilities=JSON.parse(env[prefix+'_CAPABILITIES']);}catch{invalid();}
  profiles.push(createModelProfile(configuredRoleMetadata(env,role,{schemaVersion:5,source:'flagship-config',id,model:env[prefix+'_MODEL'],provider:env[prefix+'_PROVIDER']||null,protocol:'openai-chat-completions',connectionRef:id,tier:'FLAGSHIP',purposes:[purpose],capabilities,contextWindow:null,maxOutputTokens:null,pricing:null,adapterOptions:{thinking:env[prefix+'_THINKING']||'omit'},allow:{criticalReview:purpose==='critical-review'&&env.FEATURE_FLAGSHIP_REVIEW==='true',judge:purpose==='judge'&&env.FEATURE_JUDGE==='true'}})));
 }
 return Object.freeze({schemaVersion:5,profiles:Object.freeze(profiles)});
}

// Explicit operator-declared compatibility; never inferred from an opaque model name.
export function createVisionModelCatalog(env=process.env){
 env=modelEnvironment(env);
 const legacy=createLegacyModelCatalog(env);
 if(!env.LLM_VISION_CHALLENGER_MODEL)return legacy;
 const profile=createModelProfile(configuredRoleMetadata(env,'visionChallenger',{...legacy.profiles.find(p=>p.id==='legacy-vision'),schemaVersion:3,source:'vision-config',
  id:'vision-challenger',tier:'VISION',model:env.LLM_VISION_CHALLENGER_MODEL,provider:env.LLM_VISION_CHALLENGER_PROVIDER||null,
  connectionRef:'vision-challenger',adapterOptions:{thinking:env.LLM_VISION_CHALLENGER_THINKING||'omit'},
  capabilities:{textInput:true,imageInput:env.LLM_VISION_CHALLENGER_INPUT==='images',streaming:false,toolCalling:false,jsonObject:null,jsonSchema:null,reasoningControl:false}}));
 return Object.freeze({schemaVersion:3,profiles:Object.freeze([...legacy.profiles,profile])});
}

// Explicit user-selected bindings, never inferred from arbitrary legacy model names.
export function createPolicyModelCatalog(env=process.env){
 env=modelEnvironment(env);
 const legacy=createLegacyModelCatalog(env);
 const profiles=['MAIN','PRO'].map(tier=>createModelProfile(configuredRoleMetadata(env,tier==='MAIN'?'policyMain':'policyPro',{schemaVersion:2,source:'policy-config',id:tier.toLowerCase(),tier,
  model:env['LLM_'+tier+'_MODEL']||(tier==='MAIN'?'glm-5.3-flash':'deepseek-flash'),provider:tier==='MAIN'?'zai':'deepseek',protocol:'openai-chat-completions',connectionRef:tier.toLowerCase(),purposes:['research','review','followup'],
  capabilities:{textInput:true,imageInput:false,streaming:true,toolCalling:true,jsonObject:true,jsonSchema:null,reasoningControl:true},contextWindow:null,maxOutputTokens:null,pricing:null,
 })));
 return Object.freeze({schemaVersion:2,profiles:Object.freeze([...legacy.profiles,...profiles])});
}

// Offline eligibility only: never consumed by production/default or historical state factories.
// CAPABILITIES is a JSON record with all seven boolean/null fields explicitly declared.
// THINKING defaults to omission; enabled permits optional low/high/max request effort.
export function createBenchmarkModelCatalog(env=process.env){
 env=modelEnvironment(env);
 const existing=createPolicyModelCatalog(env);
 if(!env.LLM_MAIN_CHALLENGER_MODEL)return existing;
 let capabilities;
 try{capabilities=JSON.parse(env.LLM_MAIN_CHALLENGER_CAPABILITIES);}catch{invalid();}
 const profile=createModelProfile(configuredRoleMetadata(env,'mainChallenger',{schemaVersion:4,source:'challenger-config',id:'main-challenger',tier:'MAIN',
  model:env.LLM_MAIN_CHALLENGER_MODEL,provider:env.LLM_MAIN_CHALLENGER_PROVIDER||null,protocol:'openai-chat-completions',
  connectionRef:'main-challenger',purposes:['research','review','followup'],capabilities,
  adapterOptions:{thinking:env.LLM_MAIN_CHALLENGER_THINKING??'omit'},contextWindow:null,maxOutputTokens:null,pricing:null}));
 return Object.freeze({schemaVersion:4,profiles:Object.freeze([...existing.profiles,profile])});
}

/**
 * Pure metadata snapshot. Gateway owns requests; wrappers retain readiness.
 * Connection refs intentionally omit even base URLs: URLs can contain secrets.
 * Resolve credentials at the Gateway boundary, never through serialization.
 */
export function createLegacyModelCatalog(env=process.env){
 env=modelEnvironment(env);
 const {analysisModel,visionModel}=modelRouting(env);
 const profile=(id,model,connectionRef,profilePurposes,capabilities)=>createModelProfile(configuredRoleMetadata(env,id==='legacy-analysis'?'defaultResearch':id==='legacy-router'?'router':'vision',{
  schemaVersion:1,id,source:'legacy-env',model,provider:null,protocol:'openai-chat-completions',
  connectionRef,tier:'legacy',purposes:profilePurposes,
  capabilities:{textInput:true,imageInput:false,streaming:false,toolCalling:false,jsonObject:null,jsonSchema:null,reasoningControl:null,...capabilities},
  contextWindow:null,maxOutputTokens:null,pricing:null,
 }));
 return Object.freeze({schemaVersion:1,profiles:Object.freeze([
  profile('legacy-analysis',analysisModel,'legacy-analysis',['research','review','followup'],{streaming:true,toolCalling:true}),
  profile('legacy-router',env.LLM_ROUTER_MODEL||analysisModel,'legacy-analysis',['router'],{}),
  profile('legacy-vision',visionModel,'legacy-vision',['vision'],{imageInput:legacyVisionImageInput(visionModel,env.LLM_VISION_INPUT)}),
 ])});
}
