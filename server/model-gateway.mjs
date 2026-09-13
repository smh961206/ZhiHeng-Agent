import {createLegacyModelCatalog,createPolicyModelCatalog,createBenchmarkModelCatalog,createPipelineModelCatalog,createModelProfile} from './model-catalog.mjs';
import {completeLegacyChat,modelConnectionIdentity} from './model-adapter.mjs';
import {modelRoutingMode,observeModelPolicy} from './model-policy.mjs';
import {createModelCallRecorder} from './model-telemetry.mjs';
import {modelHealth,healthConfiguration,canUseHealthFallback} from './model-health.mjs';
import {modelStatePin,modelStateError,hasPolicyModelState,hasChampionModelState,hasPipelineModelState,currentModelJob} from './model-state.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {ModelGatewayError,publicMessage,estimateBilling,syncModelCallback} from './model-gateway-result.mjs';
import {modelEnvironment,modelConfig} from './model-config.mjs';
import {currentFlagshipCall} from './model-flagship.mjs';
import {loadPricingRegistry,resolveModelPricing,calculateModelCost} from './model-pricing.mjs';
import {modelPrefixFingerprint} from './model-cache.mjs';
import {beginResearchResource,finishResearchResource,researchResourceId,modelCostReservation,researchBudgetActive} from './research-budget.mjs';
export {ModelGatewayError} from './model-gateway-result.mjs';

const fail=category=>{throw new ModelGatewayError(category);};
const text=value=>typeof value==='string'&&value.trim().length>0;
const executionMode=env=>hasPipelineModelState()?'pipeline':hasChampionModelState()?'champion':hasPolicyModelState()?'policy':modelRoutingMode(env);
const purposeAliases=Object.freeze({input:['input','router'],router:['router','input'],researcher:['researcher','research'],research:['research','researcher'],writer:['writer','research'],review:['review','auditor'],auditor:['auditor','review'],followup:['followup','evidence-verifier'],['evidence-verifier']:['evidence-verifier','followup'],vision:['vision'],['critical-review']:['critical-review'],judge:['judge']});
const legacyPurpose=purpose=>Object.freeze({input:'router',researcher:'research',writer:'research',auditor:'review',['evidence-verifier']:'followup'})[purpose]??purpose;
const supportsPurpose=(profile,purpose)=>purposeAliases[purpose]?.some(value=>profile.purposes.includes(value));
function prepare(request,catalog,onProfile){
 if(!request||!Object.hasOwn(purposeAliases,request.purpose)||['critical-review','judge'].includes(request.purpose)&&!request.routingContext?.profileId)fail('invalid_request');
 if(request.signal!==undefined&&!(request.signal instanceof AbortSignal))fail('invalid_request');
 const routingContext=request.routingContext;
 if(routingContext!==undefined&&(!routingContext||typeof routingContext!=='object'||Array.isArray(routingContext)))fail('invalid_request');
 const profileId=routingContext?.profileId;
 if(profileId!==undefined&&!text(profileId))fail('invalid_request');
 const selected=catalog.profiles.filter(p=>profileId!==undefined?p.id===profileId:supportsPurpose(p,request.purpose));
 if(selected.length!==1||!supportsPurpose(selected[0],request.purpose))fail('configuration');
 const profile=selected[0];
 if(profile.tier==='FLAGSHIP'&&(!currentFlagshipCall()||!['critical-review','judge'].includes(request.purpose)))fail('configuration');
 onProfile?.(profile);
 const requiredCapabilities=request.requiredCapabilities;
 if(requiredCapabilities!==undefined){
  if(!Array.isArray(requiredCapabilities)||!requiredCapabilities.length||new Set(requiredCapabilities).size!==requiredCapabilities.length)fail('invalid_request');
  for(const capability of requiredCapabilities){
   if(!Object.hasOwn(profile.capabilities,capability))fail('invalid_request');
   if(profile.capabilities[capability]!==true)fail('unsupported_capability');
  }
 }
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
  if(['vision','critical-review','judge'].includes(request.purpose)&&(!['system','user'].includes(message.role)||['reasoning_content','tool_calls','tool_call_id'].some(key=>Object.hasOwn(message,key))))fail('invalid_request');
  if(Array.isArray(message.content)){
   for(const part of message.content){
    if(part?.type==='image_url'){if(!text(part.image_url?.url)||request.purpose==='vision'&&message.role!=='user')fail('invalid_request');images++;}
    else if(part?.type!=='text'||typeof part.text!=='string')fail('invalid_request');
   }
  }else if(typeof message.content!=='string'&&!(message.role==='assistant'&&message.content==null&&Array.isArray(message.tool_calls)))fail('invalid_request');
 }
 if(images&&profile.capabilities.imageInput!==true)fail('unsupported_capability');
 if(request.purpose==='vision'&&(!images||images>12))fail('invalid_request');
 if(tools!==undefined){
  if(['vision','critical-review','judge'].includes(request.purpose))fail('invalid_request');
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
  if(capability&&(profile.capabilities[capability]===false||[4,5].includes(profile.schemaVersion)&&profile.capabilities[capability]!==true))fail('unsupported_capability');
 }
 if(request.reasoningEffort!==undefined&&!['off','low','medium','high','max'].includes(request.reasoningEffort))fail('invalid_request');
 if(profile.schemaVersion===2&&request.reasoningEffort===undefined)fail('invalid_request');
 if(request.reasoningEffort!==undefined&&profile.capabilities.reasoningControl===false)fail('unsupported_capability');
 const maxOutputTokens=request.maxOutputTokens===undefined?(request.purpose==='vision'?6000:['router','input'].includes(request.purpose)?400:undefined):request.maxOutputTokens;
 if(maxOutputTokens!==undefined&&(!Number.isSafeInteger(maxOutputTokens)||maxOutputTokens<=0||profile.maxOutputTokens!==null&&maxOutputTokens>profile.maxOutputTokens||request.purpose==='vision'&&maxOutputTokens>6000))fail('invalid_request');
 const callbacks=Object.fromEntries(['onDelta','onRetry','onActivity','onHeartbeat'].map(name=>[name,syncModelCallback(request[name])]));
 return {profile,request:{purpose:request.purpose,messages,tools,responseFormat,stream,maxOutputTokens,requiredCapabilities:requiredCapabilities?.slice(),reasoningEffort:request.reasoningEffort,signal:request.signal,...callbacks}};
}

export function createModelGateway({env=process.env,catalog,fetchImpl,now=()=>performance.now(),wallNow=()=>new Date().toISOString(),wait,setTimer=setTimeout,clearTimer=clearTimeout,compatibility,onModelCall,health=modelHealth,healthRouting,onRoutingDecision=decision=>console.info(JSON.stringify(decision))}={}){
 if(compatibility!==undefined&&!['legacy-text','legacy-router-vision'].includes(compatibility))fail('configuration');
 let configured;
 if(catalog){
  try{configured={profiles:catalog.profiles.map(createModelProfile)};if(new Set(configured.profiles.map(p=>p.id)).size!==configured.profiles.length)fail('configuration');}catch{fail('configuration');}
 }
 const healthConfig=healthConfiguration(healthRouting,configured);
 const continuations=new WeakMap();
 return Object.freeze({
  async complete(input){
   const recorder=createModelCallRecorder({sink:onModelCall});let completed,failed,callSignal,budgetToken;
   try{
   let prepared,callEnv,callCatalog,explicitProfile,callPin;
   // Pin configuration before observation: a logging hook may reload env.
   // Subsequent complete() calls still see the latest configuration.
   try{
    callEnv=modelEnvironment({...env});
    // Existing v1-v3 jobs keep their original purpose in cache, budget and
    // telemetry identities. Only schema-v2 configuration or modelState v4
    // adopts the new stage names.
    const pipelineCall=hasPipelineModelState()||modelConfig(callEnv)?.schemaVersion===2;
    if(!pipelineCall&&input?.purpose)input={...input,purpose:legacyPurpose(input.purpose)};
    // Recheck local approval at every call boundary; revocation keeps the original pin.
    if(hasChampionModelState())(await import('./model-rollout.mjs')).assertModelRollout(currentModelJob(),callEnv);
    if(input?.routingContext!==undefined&&(!input.routingContext||typeof input.routingContext!=='object'||Array.isArray(input.routingContext)))fail('invalid_request');
    const flagship=currentFlagshipCall();
    if(['critical-review','judge'].includes(input?.purpose)){
     if(!input.routingContext?.profileId)fail('invalid_request');
     if(!flagship||flagship.purpose!==input.purpose||currentModelJob()!==flagship.job)fail('configuration');
     const status=(await import('./model-rollout.mjs')).flagshipRolloutStatus(input.purpose,callEnv);
     if(!status.accepted||status.approvalHash!==flagship.approvalHash||objectHash(status.profile)!==objectHash(flagship.profile)||status.connectionIdentity!==flagship.connectionIdentity)fail('configuration');
    }
    const pin=flagship&&flagship.purpose===input?.purpose?{id:flagship.profile.id,model:flagship.profile.model,connectionIdentity:flagship.connectionIdentity}:modelStatePin(input?.purpose,callEnv);
    callPin=pin;
    if(pin){
     if(input?.routingContext?.profileId!==undefined&&input.routingContext.profileId!==pin.id||input?.reasoningEffort!==undefined&&input.reasoningEffort!==pin.reasoningEffort)throw modelStateError();
     input={...input,reasoningEffort:pin.reasoningEffort??input.reasoningEffort,routingContext:{...input.routingContext,profileId:pin.id}};
    }
    callCatalog=flagship&&flagship.purpose===input?.purpose?{profiles:[flagship.profile]}:configured??(pipelineCall?createPipelineModelCatalog(callEnv):hasChampionModelState()?createBenchmarkModelCatalog(callEnv):hasPolicyModelState()?createPolicyModelCatalog(callEnv):createLegacyModelCatalog(callEnv));
    if(callPin&&hasChampionModelState()&&['research','review','followup'].includes(input.purpose)){
     const selected=callCatalog.profiles.find(p=>p.id===callPin.id),expected=createBenchmarkModelCatalog(callEnv).profiles.find(p=>p.id===callPin.id);
     if(!selected||objectHash(selected)!==objectHash(expected))throw modelStateError();
    }
    explicitProfile=input?.routingContext?.profileId;
    if(recorder.enabled)recorder.attribute(input?.purpose,undefined,executionMode(callEnv));
    const selectionCatalog=explicitProfile===undefined?{profiles:callCatalog.profiles.filter(p=>!healthConfig.fallbacks.some(pair=>pair.fallback===p.id))}:callCatalog;
    prepared=prepare(input,selectionCatalog,recorder.enabled?profile=>recorder.attribute(input.purpose,profile.id,executionMode(callEnv)):undefined);
    if(callPin&&(prepared.profile.model!==callPin.model||modelConnectionIdentity(prepared.profile,callEnv)!==callPin.connectionIdentity))throw modelStateError();
   }catch(error){if(error instanceof ModelGatewayError||['model_state_incompatible','model_rollout_closed'].includes(error?.code))throw error;fail('invalid_request');}
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
   if(['critical-review','judge'].includes(request.purpose))recorder.flagship({version:1,conflictType:currentFlagshipCall().conflictType});
   // Snapshot effective prices before transport. Telemetry configuration errors
   // leave price unknown and cannot fail or replay research.
   let pricingResolution=null;
   try{
    const at=wallNow(),connectionIdentity=modelConnectionIdentity(profile,callEnv);
    const registry=callEnv.MODEL_PRICING_FILE?loadPricingRegistry(callEnv.MODEL_PRICING_FILE):{schemaVersion:1,entries:[1,2].includes(profile.pricing?.schemaVersion)?[{profileId:profile.id,connectionIdentity,recordedAt:at,pricing:profile.pricing}]:[]};
    pricingResolution=resolveModelPricing(registry,{profileId:profile.id,connectionIdentity,at});
   }catch{/* Unknown is not free. */}
   // Keep the dispatched signal across telemetry awaits; callers may reuse the input object.
   callSignal=request.signal;
   recorder.cache(modelPrefixFingerprint(request,profile,modelConnectionIdentity(profile,callEnv)));
   if(recorder.enabled)await recorder.start(request.purpose,profile.id,executionMode(callEnv));
   if(compatibility==='legacy-text'&&!['research','researcher','writer','review','auditor','followup','evidence-verifier'].includes(request.purpose))fail('unsupported_capability');
   if(compatibility==='legacy-router-vision'&&!['router','input','vision'].includes(request.purpose))fail('unsupported_capability');
   if(modelRoutingMode(callEnv)==='dry-run'&&!request.signal?.aborted){
    // No candidate is passed to prepare(), the adapter, or the public response.
    let signals;
    try{signals=input.routingContext?.complexitySignals;}catch{signals=null;}
    const observedPurpose={input:'router',researcher:'research',writer:'research',auditor:'review',['evidence-verifier']:'followup'}[request.purpose]??request.purpose;
    observeModelPolicy({purpose:observedPurpose,profile,reasoningEffort:request.reasoningEffort,signals},onRoutingDecision);
   }
   const observation=health.begin(modelConnectionIdentity(profile,callEnv));let result;
   if(researchBudgetActive())budgetToken=await beginResearchResource('model',1,{id:researchResourceId('model',{profile:profile.id,connection:modelConnectionIdentity(profile,callEnv),purpose:request.purpose,messages:request.messages,tools:request.tools??null,responseFormat:request.responseFormat??null,reasoningEffort:request.reasoningEffort??null}),purpose:request.purpose,reservedCost:modelCostReservation(profile,request,pricingResolution)});
   try{
    result=await completeLegacyChat(request,profile,{env:callEnv,fetchImpl:(...args)=>{recorder.attempt();return (fetchImpl??globalThis.fetch)(...args);},now,wait,setTimer,clearTimer,allowMissingJsonFinish:compatibility==='legacy-text',allowMissingJsonRole:compatibility==='legacy-router-vision'});
    health.finish(observation);
   }catch(error){health.finish(observation,error);throw error;}
   const response={message:publicMessage(result.message),profile:profile.id,provider:profile.provider,model:profile.model,tier:profile.tier,finishReason:result.finishReason,usage:result.usage,usageDetails:result.usageDetails,performance:result.performance,billing:estimateBilling(result.usage,profile.pricing)};
   response.cost=calculateModelCost(result.usage,pricingResolution,result.usageDetails?.tokenSources);
   if(callEnv.MODEL_PRICING_FILE||[1,2].includes(profile.pricing?.schemaVersion))response.billing=response.cost.estimatedCost===null?null:{currency:response.cost.currency,estimatedCost:response.cost.estimatedCost};
   const privateMessage=publicMessage(result.message);
   if(typeof result.message.reasoning_content==='string')privateMessage.reasoning_content=result.message.reasoning_content;
   continuations.set(response,privateMessage);
   completed=response;
   return response;
   }catch(error){failed=error;throw error;}finally{
    if(budgetToken)await finishResearchResource(budgetToken,recorder.attempts===1?completed?.billing??null:null);
    if(recorder.enabled)await recorder.finish(completed,failed);
    if(completed&&callSignal?.aborted)throw new ModelGatewayError(callSignal.reason?.name==='TimeoutError'||callSignal.reason?.code==='model_timeout'?'timeout':'aborted');
   }
  },
  // Server-only explicit access; serialization/public response cannot reveal it.
  getContinuationMessage(response){if(!continuations.has(response))fail('invalid_request');return structuredClone(continuations.get(response));},
 });
}
export const modelGateway=createModelGateway();
