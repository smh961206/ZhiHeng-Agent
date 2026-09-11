import {modelRouting} from './model-routing.mjs';

// Legacy configuration fact, not inference from arbitrary model names.
export function legacyVisionImageInput(model,inputMode){
 return inputMode!=='off'&&(model==='deepseek-v4-flash-vision-exp'||inputMode==='images');
}

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
const purposes=['research','review','followup','router','vision'];
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
 input=record(input,fields);
 const legacy=input.schemaVersion===1&&input.source==='legacy-env'&&input.tier==='legacy'&&['legacy-analysis','legacy-vision'].includes(input.connectionRef);
 const policy=input.schemaVersion===2&&input.source==='policy-config'&&['MAIN','PRO'].includes(input.tier)&&input.connectionRef===input.tier.toLowerCase()&&['zai','deepseek'].includes(input.provider);
 if(!(legacy||policy)||!text(input.id)||!text(input.model)||
  !(input.provider===null||text(input.provider))||input.protocol!=='openai-chat-completions'||
  policy&&(input.tier==='MAIN'&&(input.model!=='glm-5.3-flash'||input.provider!=='zai')||input.tier==='PRO'&&(input.model!=='deepseek-v4-pro'||input.provider!=='deepseek')))invalid();
 input.purposes=purposeList(input.purposes);
 input.capabilities=record(input.capabilities,capabilityFields);
 if(capabilityFields.some(key=>input.capabilities[key]!==null&&typeof input.capabilities[key]!=='boolean'))invalid();
 if(!tokenLimit(input.contextWindow)||!tokenLimit(input.maxOutputTokens))invalid();
 let pricing=null;
 if(input.pricing!==null){
  input.pricing=record(input.pricing,['currency','unit','input','output','cacheRead']);
  if(typeof input.pricing.currency!=='string'||!/^[A-Z]{3}$/.test(input.pricing.currency)||input.pricing.unit!=='per-million-tokens'||
   ['input','output','cacheRead'].some(key=>input.pricing[key]!==null&&!(typeof input.pricing[key]==='number'&&Number.isFinite(input.pricing[key])&&input.pricing[key]>=0)))invalid();
  pricing=Object.freeze({...input.pricing});
 }
 return Object.freeze({...input,purposes:Object.freeze([...input.purposes]),capabilities:Object.freeze({...input.capabilities}),pricing});
}

// Explicit user-selected bindings, never inferred from arbitrary legacy model names.
export function createPolicyModelCatalog(env=process.env){
 const legacy=createLegacyModelCatalog(env);
 const profiles=['MAIN','PRO'].map(tier=>createModelProfile({schemaVersion:2,source:'policy-config',id:tier.toLowerCase(),tier,
  model:env['LLM_'+tier+'_MODEL']||(tier==='MAIN'?'glm-5.3-flash':'deepseek-v4-pro'),provider:tier==='MAIN'?'zai':'deepseek',protocol:'openai-chat-completions',connectionRef:tier.toLowerCase(),purposes:['research','review','followup'],
  capabilities:{textInput:true,imageInput:false,streaming:true,toolCalling:true,jsonObject:true,jsonSchema:null,reasoningControl:true},contextWindow:null,maxOutputTokens:null,pricing:null,
 }));
 return Object.freeze({schemaVersion:2,profiles:Object.freeze([...legacy.profiles,...profiles])});
}

/**
 * Pure metadata snapshot. Gateway owns requests; wrappers retain readiness.
 * Connection refs intentionally omit even base URLs: URLs can contain secrets.
 * Resolve credentials at the Gateway boundary, never through serialization.
 */
export function createLegacyModelCatalog(env=process.env){
 const {analysisModel,visionModel}=modelRouting(env);
 const profile=(id,model,connectionRef,profilePurposes,capabilities)=>createModelProfile({
  schemaVersion:1,id,source:'legacy-env',model,provider:null,protocol:'openai-chat-completions',
  connectionRef,tier:'legacy',purposes:profilePurposes,
  capabilities:{textInput:true,imageInput:false,streaming:false,toolCalling:false,jsonObject:null,jsonSchema:null,reasoningControl:null,...capabilities},
  contextWindow:null,maxOutputTokens:null,pricing:null,
 });
 return Object.freeze({schemaVersion:1,profiles:Object.freeze([
  profile('legacy-analysis',analysisModel,'legacy-analysis',['research','review','followup'],{streaming:true,toolCalling:true}),
  profile('legacy-router',env.LLM_ROUTER_MODEL||analysisModel,'legacy-analysis',['router'],{}),
  profile('legacy-vision',visionModel,'legacy-vision',['vision'],{imageInput:legacyVisionImageInput(visionModel,env.LLM_VISION_INPUT)}),
 ])});
}
