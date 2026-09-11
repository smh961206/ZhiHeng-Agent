const messages={
 invalid_request:'模型请求参数无效',configuration:'模型连接配置无效',unsupported_capability:'模型配置不支持请求的能力',
 authentication:'模型服务认证失败',rate_limit:'模型服务请求受限',provider_unavailable:'模型服务暂不可用',provider_request:'模型服务拒绝请求',format_unsupported:'模型服务不支持请求的输出格式',
 network:'模型服务网络连接失败',timeout:'模型请求超时',aborted:'模型请求已取消',malformed_response:'模型响应格式无效',truncated:'模型响应未完整完成',refusal:'模型拒绝了请求',response_too_large:'模型响应超过大小上限',callback_error:'模型输出接收失败',
};
export class ModelGatewayError extends Error{
 constructor(category,status=null){
  category=typeof category==='string'&&Object.hasOwn(messages,category)?category:'malformed_response';
  super(messages[category]);
  this.name='ModelGatewayError';this.category=category;this.code='model_gateway_'+category;
  this.status=Number.isInteger(status)&&status>=400&&status<=599?status:null;this.retryable=['rate_limit','provider_unavailable','network','timeout'].includes(category);
 }
}
// Shared by Gateway lifecycle events and the legacy format-negotiation bridge.
export function syncModelCallback(callback){
 if(callback!==undefined&&typeof callback!=='function')throw new ModelGatewayError('invalid_request');
 return value=>{
  try{
   const result=callback?.(value);
   if(result!=null&&typeof result.then==='function'){void Promise.resolve(result).catch(()=>{});throw new ModelGatewayError('callback_error');}
  }catch{throw new ModelGatewayError('callback_error');}
 };
}
// Existing Agent recovery classifies these codes. Keep this translation at the
// model boundary and never attach an original provider exception or body.
export function legacyCompletionError(error){
 if(!(error instanceof ModelGatewayError))return error;
 if(error.status)return Object.assign(new Error(`模型接口失败（HTTP ${error.status}），请检查后端配置、额度或稍后重试`),{code:'model_http',status:error.status});
 const legacy={
  truncated:['model_output_truncated','模型输出被截断或流式响应中断，请重试'],
  refusal:['model_refusal','模型未能完成审计，未生成可交付结果'],
  network:['model_network','模型服务网络连接失败（fetch failed），请稍后重试'],
  timeout:['model_timeout','本阶段模型请求超过等待时限，请稍后重试'],
 }[error.category];
 return legacy?Object.assign(new Error(legacy[1]),{code:legacy[0]}):error;
}
export function legacyVisionError(error){
 if(!(error instanceof ModelGatewayError))return error;
 if(error.status)return Object.assign(new Error(`模型视觉读取失败（HTTP ${error.status}），保留程序提取结果`),{status:error.status});
 const message={configuration:'模型接口地址无效',invalid_request:'视觉读取请求无效或过大',response_too_large:'模型视觉读取返回过大',malformed_response:'模型视觉读取未完整完成，保留程序提取结果',truncated:'模型视觉读取未完整完成，保留程序提取结果',refusal:'模型视觉读取未完整完成，保留程序提取结果'}[error.category];
 return message?new Error(message):error;
}
const count=v=>Number.isSafeInteger(v)&&v>=0?v:null;
export function normalizeUsage(raw){
 const inputTokens=count(raw?.prompt_tokens),outputTokens=count(raw?.completion_tokens);
 const values=[raw?.prompt_tokens_details?.cached_tokens,raw?.prompt_cache_hit_tokens].filter(v=>v!==undefined);
 let cachedInputTokens=values.length&&values.every(v=>count(v)!==null&&v===values[0])?values[0]:null;
 if(inputTokens!==null&&cachedInputTokens>inputTokens)cachedInputTokens=null;
 let totalTokens=count(raw?.total_tokens);
 if(totalTokens!==null&&inputTokens!==null&&outputTokens!==null&&totalTokens!==inputTokens+outputTokens)totalTokens=null;
 return {inputTokens,outputTokens,totalTokens,cachedInputTokens};
}
export function estimateBilling(usage,pricing){
 if(!pricing||usage.inputTokens===null||usage.outputTokens===null||pricing.input===null||pricing.output===null)return null;
 const {inputTokens,outputTokens,cachedInputTokens:cached}=usage;
 // Never assume an unknown cache count/rate is a free or zero-token category.
 if(cached===null&&pricing.cacheRead!==pricing.input||cached>0&&pricing.cacheRead===null)return null;
 const inputCost=cached===null?inputTokens*pricing.input:(inputTokens-cached)*pricing.input+cached*(pricing.cacheRead??0);
 const amount=(inputCost+outputTokens*pricing.output)/1_000_000;
 return Number.isFinite(amount)?{currency:pricing.currency,estimatedCost:amount}:null;
}
export function publicMessage(message){
 return {role:'assistant',content:message.content??null,...(message.tool_calls?{tool_calls:message.tool_calls.map(c=>({id:c.id,type:'function',function:{name:c.function.name,arguments:c.function.arguments}}))}:{})};
}
