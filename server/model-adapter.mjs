import {resolveModelConnection} from './model-connection.mjs';
export {modelConnectionIdentity} from './model-connection.mjs';
import {fetchModel,isModelNetworkError} from './model-request.mjs';
import {createModelDeadline,modelTimeouts} from './model-deadline.mjs';
import {readCompletion} from './model-stream.mjs';
import {unsupportedReviewFormat} from './review-format.mjs';
import {ModelGatewayError,normalizeUsage} from './model-gateway-result.mjs';

const fail=category=>{throw new ModelGatewayError(category);};
function modelConnection(profile,env){
 const {base,key}=resolveModelConnection(profile,env),url=new URL(base+'/chat/completions');
 return {url,key};
}
function checkAbort(signal){if(signal?.aborted)throw new ModelGatewayError(signal.reason?.name==='TimeoutError'||signal.reason?.code==='model_timeout'?'timeout':'aborted');}
function abortable(promise,signal){
 // reader.read() may synchronously abort before its rejected promise arrives
 // here. Retain a rejection handler even when cancellation wins immediately.
 if(signal.aborted){void Promise.resolve(promise).catch(()=>{});checkAbort(signal);}
 return new Promise((resolve,reject)=>{
  const abort=()=>{try{checkAbort(signal);}catch(error){reject(error);}};
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
 });
}
// One bounded, cancellable reader serves JSON and the existing SSE parser.
function boundedResponse(response,signal,maxBytes){
 async function* chunks(){
  if(!response.body)fail('malformed_response');
  const reader=response.body.getReader();let size=0;
  try{
   while(true){
    checkAbort(signal);const {value,done}=await abortable(reader.read(),signal);checkAbort(signal);
    if(done)break;size+=value.byteLength;if(size>maxBytes)fail('response_too_large');yield value;
   }
  }finally{void reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 return {headers:response.headers,body:chunks(),async json(){const bytes=[];for await(const chunk of chunks())bytes.push(chunk);return JSON.parse(Buffer.concat(bytes).toString('utf8'));}};
}
function cancel(response){void response?.body?.cancel().catch(()=>{});}

export async function completeLegacyChat(request,profile,{env,fetchImpl,now,wait,setTimer,clearTimer,allowMissingJsonFinish=false,allowMissingJsonRole=false}){
 const {url,key}=modelConnection(profile,env);
 if(!key)fail('configuration');
 const body={model:profile.model,messages:request.messages,stream:request.stream,
  ...(request.tools?{tools:request.tools,tool_choice:'auto'}:{}),...(request.responseFormat?{response_format:request.responseFormat}:{}),
  ...(request.maxOutputTokens!==undefined?{max_tokens:request.maxOutputTokens}:{})};
 if(profile.schemaVersion===3){
  if(request.reasoningEffort!==undefined)fail('unsupported_capability');
  if(profile.adapterOptions.thinking==='disabled')body.thinking={type:'disabled'};
 }else if(request.reasoningEffort!==undefined){
  if(profile.schemaVersion===2){
   if(!['low','high','max'].includes(request.reasoningEffort))fail('unsupported_capability');
   body.thinking={type:'enabled'};body.reasoning_effort=request.reasoningEffort;
  }else{
   if(request.reasoningEffort!=='off'||!/^deepseek-/i.test(profile.model))fail('unsupported_capability');
   body.thinking={type:'disabled'};
  }
 }else if(request.purpose==='router'&&/^deepseek-/i.test(profile.model)||request.purpose==='vision'&&profile.model==='deepseek-flash')body.thinking={type:'disabled'};
 let serialized;try{serialized=JSON.stringify(body);}catch{fail('invalid_request');}
 if(Buffer.byteLength(serialized)>16*1024*1024)fail('invalid_request');
 const timeouts=request.purpose==='router'?{idleMs:8000,totalMs:8000}:request.purpose==='vision'?{idleMs:60000,totalMs:60000}:modelTimeouts(env);
 const deadline=createModelDeadline({signal:request.signal,...timeouts,setTimer,clearTimer});
 const started=now();let firstTokenAt=null,usage=normalizeUsage(null),finishReason=null,stage='network',receivedResponse;
 // A callback can synchronously cancel while multiple frames share one buffer.
 const notify=(callback,value)=>{checkAbort(deadline.signal);callback(value);checkAbort(deadline.signal);};
 const activity=()=>{firstTokenAt??=now();deadline.activity();notify(request.onActivity);};
 try{
  checkAbort(request.signal);
  const fetchRequest=request.purpose==='router'||request.purpose==='vision'?(fetchImpl??globalThis.fetch):(url,options)=>fetchModel(url,options,{fetchImpl,wait,onRetry:request.onRetry});
  const pending=Promise.resolve().then(()=>{checkAbort(deadline.signal);return fetchRequest(url,{method:'POST',redirect:'error',signal:deadline.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:serialized});});
  // A late response from a non-cooperative injected fetch must still be closed.
  pending.then(response=>{receivedResponse=response;if(deadline.signal.aborted)cancel(response);},()=>{});
  const response=await abortable(pending,deadline.signal);checkAbort(deadline.signal);stage='response';
  if(!response.ok){
   const status=response.status;let category=status===401||status===403?'authentication':status===429?'rate_limit':status>=500?'provider_unavailable':'provider_request';
   if(request.responseFormat&&[400,422].includes(status)){
    try{const detail=await boundedResponse(response,deadline.signal,64000).json();if(unsupportedReviewFormat(status,detail,request.responseFormat))category='format_unsupported';}catch{checkAbort(deadline.signal);}
   }else cancel(response);
   throw new ModelGatewayError(category,status);
  }
  const result=await readCompletion(boundedResponse(response,deadline.signal,request.purpose==='vision'?512000:8_000_000),text=>notify(request.onDelta,text),{
   strict:true,allowMissingJsonFinish,allowMissingJsonRole,onActivity:activity,onHeartbeat:()=>{deadline.activity();notify(request.onHeartbeat);},onUsage:raw=>{usage=normalizeUsage(raw);},onFinish:reason=>{finishReason=reason??null;},
  });
  checkAbort(deadline.signal);
  if(request.purpose==='vision'&&(finishReason!=='stop'||result.tool_calls||result.content.length>18000))fail('malformed_response');
  return {message:result,usage,finishReason,performance:{latencyMs:Math.max(0,now()-started),ttftMs:firstTokenAt===null?null:Math.max(0,firstTokenAt-started)}};
 }catch(error){
  checkAbort(deadline.signal);
  if(error instanceof ModelGatewayError)throw error;
  const category=error?.code==='model_timeout'||error?.name==='TimeoutError'?'timeout':error?.name==='AbortError'?'aborted':error?.code==='model_output_truncated'||error?.code==='model_stream_incomplete'?'truncated':error?.code==='model_refusal'?'refusal':stage==='network'||isModelNetworkError(error)?'network':'malformed_response';
  throw new ModelGatewayError(category);
 }finally{cancel(receivedResponse);deadline.dispose();}
}
