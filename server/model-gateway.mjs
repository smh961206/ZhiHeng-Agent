import {createLegacyModelCatalog,createPolicyModelCatalog,createModelProfile} from './model-catalog.mjs';
import {completeLegacyChat,modelConnectionIdentity} from './model-adapter.mjs';
import {modelRoutingMode,observeModelPolicy} from './model-policy.mjs';
import {createModelCallRecorder} from './model-telemetry.mjs';
import {modelHealth,healthConfiguration,canUseHealthFallback} from './model-health.mjs';
import {modelStatePin,modelStateError,hasPolicyModelState} from './model-state.mjs';
import {ModelGatewayError,publicMessage,estimateBilling,syncModelCallback} from './model-gateway-result.mjs';
export {ModelGatewayError} from './model-gateway-result.mjs';

const fail=category=>{throw new ModelGatewayError(category);};
const text=value=>typeof value==='string'&&value.trim().length>0;
const executionMode=env=>hasPolicyModelState()?'policy':modelRoutingMode(env);
function prepare(request,catalog,onProfile){
 if(!request||!['research','review','followup','router','vision'].includes(request.purpose))fail('invalid_request');
 if(request.signal!==undefined&&!(request.signal instanceof AbortSignal))fail('invalid_request');
 const routingContext=request.routingContext;
 if(routingContext!==undefined&&(!routingContext||typeof routingContext!=='object'||Array.isArray(routingContext)))fail('invalid_request');
 const profileId=routingContext?.profileId;
 if(profileId!==undefined&&!text(profileId))fail('invalid_request');
 const selected=catalog.profiles.filter(p=>profileId!==undefined?p.id===profileId:p.purposes.includes(request.purpose));
 if(selected.length!==1||!selected[0].purposes.includes(request.purpose))fail('configuration');
 const profile=selected[0];
 onProfile?.(profile);
 const stream=request.stream===undefined?profile.capabilities.streaming:request.stream;
 if(typeof stream!=='boolean')fail('invalid_request');
 if(stream&&profile.capabilities.streaming!==true)fail('unsupported_capability');
 let messages,tools,responseFormat;
 try{messages=structuredClone(request.messages);tools=structuredClone(request.tools);responseFormat=structuredClone(request.responseFormat);}catch{fail('invalid_request');}
 if(!Array.isArray(messages)||!messages.length)fail('invalid_request');
 if(profile.capabilities.textInput!==true)fail('unsupported_capability');
 let images=0;
 for(const message of messages){
  if(!message||!['system','user','assistant','tool'].includes(message.role))fail('invalid_request');
  if(Array.isArray(message.content)){
   for(const part of message.content){
    if(part?.type==='image_url'){if(!text(part.image_url?.url))fail('invalid_request');images++;}
    else if(part?.type!=='text'||typeof part.text!=='string')fail('invalid_request');
   }
  }else if(typeof message.content!=='string'&&!(message.role==='assistant'&&message.content==null&&Array.isArray(message.tool_calls)))fail('invalid_request');
 }
 if(images&&profile.capabilities.imageInput!==true)fail('unsupported_capability');
 if(request.purpose==='vision'&&(!images||images>12))fail('invalid_request');
 if(tools!==undefined){
  if(!Array.isArray(tools)||!tools.length)fail('invalid_request');
  // Iteration visits holes too; JSON would otherwise send them as null tools.
  for(const tool of tools)if(tool?.type!=='function'||!text(tool.function?.name))fail('invalid_request');
  if(profile.capabilities.toolCalling!==true)fail('unsupported_capability');
 }
 if(responseFormat!==undefined){
  if(!['text','json_object','json_schema'].includes(responseFormat?.type)||responseFormat.type==='json_schema'&&(!text(responseFormat.json_schema?.name)||!responseFormat.json_schema?.schema))fail('invalid_request');
  const capability=responseFormat.type==='json_schema'?'jsonSchema':responseFormat.type==='json_object'?'jsonObject':null;
  // Unknown optional format support is negotiated by an explicit request;
  // provider refusal is normalized, never silently downgraded here.
  if(capability&&profile.capabilities[capability]===false)fail('unsupported_capability');
 }
 if(request.reasoningEffort!==undefined&&!['off','low','medium','high','max'].includes(request.reasoningEffort))fail('invalid_request');
 if(profile.schemaVersion===2&&request.reasoningEffort===undefined)fail('invalid_request');
 if(request.reasoningEffort!==undefined&&profile.capabilities.reasoningControl===false)fail('unsupported_capability');
 const maxOutputTokens=request.maxOutputTokens===undefined?(request.purpose==='vision'?6000:request.purpose==='router'?400:undefined):request.maxOutputTokens;
 if(maxOutputTokens!==undefined&&(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<=0||profile.maxOutputTokens!==null&&maxOutputTokens>profile.maxOutputTokens||request.purpose==='vision'&&maxOutputTokens>6000))fail('invalid_request');
 const callbacks=Object.fromEntries(['onDelta','onRetry','onActivity','onHeartbeat'].map(name=>[name,syncModelCallback(request[name])]));
 return {profile,request:{purpose:request.purpose,messages,tools,responseFormat,stream,maxOutputTokens,reasoningEffort:request.reasoningEffort,signal:request.signal,...callbacks}};
}

export function createModelGateway({env=process.env,catalog,fetchImpl,now=()=>performance.now(),wait,setTimer=setTimeout,clearTimer=clearTimeout,compatibility,onModelCall,health=modelHealth,healthRouting,onRoutingDecision=decision=>console.info(JSON.stringify(decision))}={}){
 if(compatibility!==undefined&&!['legacy-text','legacy-router-vision'].includes(compatibility))fail('configuration');
 let configured;
 if(catalog){
  try{configured={profiles:catalog.profiles.map(createModelProfile)};if(new Set(configured.profiles.map(p=>p.id)).size!==configured.profiles.length)fail('configuration');}catch{fail('configuration');}
 }
 const healthConfig=healthConfiguration(healthRouting,configured);
 const continuations=new WeakMap();
 return Object.freeze({
  async complete(input){
   const recorder=createModelCallRecorder({sink:onModelCall});let completed,failed,callSignal;
   try{
   let prepared,callEnv,callCatalog,explicitProfile,callPin;
   // Pin configuration before observation: a logging hook may reload env.
   // Subsequent complete() calls still see the latest configuration.
   try{
    callEnv={...env};
    if(input?.routingContext!==undefined&&(!input.routingContext||typeof input.routingContext!=='object'||Array.isArray(input.routingContext)))fail('invalid_request');
    const pin=modelStatePin(input?.purpose,callEnv);
    callPin=pin;
    if(pin){
     if(input?.routingContext?.profileId!==undefined&&input.routingContext.profileId!==pin.id||input?.reasoningEffort!==undefined&&input.reasoningEffort!==pin.reasoningEffort)throw modelStateError();
     input={...input,reasoningEffort:pin.reasoningEffort??input.reasoningEffort,routingContext:{...input.routingContext,profileId:pin.id}};
    }
    callCatalog=configured??(hasPolicyModelState()?createPolicyModelCatalog(callEnv):createLegacyModelCatalog(callEnv));
    explicitProfile=input?.routingContext?.profileId;
    if(recorder.enabled)recorder.attribute(input?.purpose,undefined,executionMode(callEnv));
    const selectionCatalog=explicitProfile===undefined?{profiles:callCatalog.profiles.filter(p=>!healthConfig.fallbacks.some(pair=>pair.fallback===p.id))}:callCatalog;
    prepared=prepare(input,selectionCatalog,recorder.enabled?profile=>recorder.attribute(input.purpose,profile.id,executionMode(callEnv)):undefined);
    if(callPin&&(prepared.profile.model!==callPin.model||modelConnectionIdentity(prepared.profile,callEnv)!==callPin.connectionIdentity))throw modelStateError();
   }catch(error){if(error instanceof ModelGatewayError||error?.code==='model_state_incompatible')throw error;fail('invalid_request');}
   if(healthConfig.mode==='fallback'&&explicitProfile===undefined&&canUseHealthFallback(prepared.request)&&health.cooling(modelConnectionIdentity(prepared.profile,callEnv))){
    const primary=prepared.profile;let alternate;
    for(const pair of healthConfig.fallbacks.filter(p=>p.primary===primary.id)){
     const candidate=callCatalog.profiles.find(p=>p.id===pair.fallback);
     const format=prepared.request.responseFormat?.type;
     if(format==='json_object'&&candidate.capabilities.jsonObject!==true||format==='json_schema'&&candidate.capabilities.jsonSchema!==true||prepared.request.reasoningEffort!==undefined&&candidate.capabilities.reasoningControl!==true)continue;
     if(primary.contextWindow!==null&&(candidate.contextWindow===null||candidate.contextWindow<primary.contextWindow))continue;
     try{alternate=prepare({...prepared.request,routingContext:{profileId:candidate.id}},callCatalog);}catch(error){if(['configuration','unsupported_capability','invalid_request'].includes(error.category))continue;throw error;}
     if(health.cooling(modelConnectionIdentity(candidate,callEnv))){alternate=undefined;continue;}
     break;
    }
    if(!alternate)fail('provider_unavailable');
    prepared=alternate;
   }
   const {profile,request}=prepared;
   // Keep the dispatched signal across telemetry awaits; callers may reuse the input object.
   callSignal=request.signal;
   if(recorder.enabled)await recorder.start(request.purpose,profile.id,executionMode(callEnv));
   if(compatibility==='legacy-text'&&!['research','review','followup'].includes(request.purpose))fail('unsupported_capability');
   if(compatibility==='legacy-router-vision'&&!['router','vision'].includes(request.purpose))fail('unsupported_capability');
   if(modelRoutingMode(callEnv)==='dry-run'&&!request.signal?.aborted){
    // No candidate is passed to prepare(), the adapter, or the public response.
    let signals;
    try{signals=input.routingContext?.complexitySignals;}catch{signals=null;}
    observeModelPolicy({purpose:request.purpose,profile,reasoningEffort:request.reasoningEffort,signals},onRoutingDecision);
   }
   const observation=health.begin(modelConnectionIdentity(profile,callEnv));let result;
   try{
    result=await completeLegacyChat(request,profile,{env:callEnv,fetchImpl,now,wait,setTimer,clearTimer,allowMissingJsonFinish:compatibility==='legacy-text',allowMissingJsonRole:compatibility==='legacy-router-vision'});
    health.finish(observation);
   }catch(error){health.finish(observation,error);throw error;}
   const response={message:publicMessage(result.message),profile:profile.id,provider:profile.provider,model:profile.model,tier:profile.tier,finishReason:result.finishReason,usage:result.usage,performance:result.performance,billing:estimateBilling(result.usage,profile.pricing)};
   const privateMessage=publicMessage(result.message);
   if(typeof result.message.reasoning_content==='string')privateMessage.reasoning_content=result.message.reasoning_content;
   continuations.set(response,privateMessage);
   completed=response;
   return response;
   }catch(error){failed=error;throw error;}finally{
    if(recorder.enabled)await recorder.finish(completed,failed);
    if(completed&&callSignal?.aborted)throw new ModelGatewayError(callSignal.reason?.name==='TimeoutError'||callSignal.reason?.code==='model_timeout'?'timeout':'aborted');
   }
  },
  // Server-only explicit access; serialization/public response cannot reveal it.
  getContinuationMessage(response){if(!continuations.has(response))fail('invalid_request');return structuredClone(continuations.get(response));},
 });
}
export const modelGateway=createModelGateway();
