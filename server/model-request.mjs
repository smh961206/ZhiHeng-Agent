import {setTimeout as delay} from 'node:timers/promises';
const transientCodes=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','ENOTFOUND','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_SOCKET']);
const certificateCodes=new Set(['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID','UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
function networkCodes(error,seen=new Set()){
 if(!error||typeof error!=='object'||seen.has(error))return [];
 seen.add(error);
 return [error.code,...networkCodes(error.cause,seen),...(Array.isArray(error.errors)?error.errors.flatMap(item=>networkCodes(item,seen)):[])].filter(code=>typeof code==='string');
}
// Shared classification for failures after headers too; this does not retry a body.
export function isModelNetworkError(error){
 return error?.code==='model_network'||networkCodes(error).some(code=>transientCodes.has(code)||certificateCodes.has(code))||error instanceof TypeError&&error.message==='fetch failed';
}
function checkSignal(signal){
 if(!signal?.aborted)return;
 if(signal.reason?.name==='TimeoutError')throw Object.assign(new Error('模型服务连接超时，请稍后重试'),{code:'model_timeout',cause:signal.reason});
 signal.throwIfAborted();
}
// Retry only before a response is received. Streaming content and tool execution
// stay outside this loop, so partial output cannot be appended or replayed.
export async function fetchModel(url,options,{onRetry=()=>{},fetchImpl=globalThis.fetch,wait=(ms,signal)=>delay(ms,undefined,{signal})}={}){
 const maxAttempts=3;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  checkSignal(options.signal);
  try{return await fetchImpl(url,options);}
  catch(error){
   checkSignal(options.signal);
   if(error.name==='AbortError')throw error;
   const codes=networkCodes(error),certificate=codes.some(code=>certificateCodes.has(code));
   const transient=!certificate&&(codes.some(code=>transientCodes.has(code))||error.message==='fetch failed'&&!codes.length);
   if(!transient&&error.message!=='fetch failed'&&!certificate)throw error;
   if(!transient||attempt===maxAttempts){
    const code=codes.find(code=>transientCodes.has(code));
    const reason=certificate?'安全连接校验失败':code==='ECONNRESET'||code==='UND_ERR_SOCKET'?'连接被中断':code==='ENOTFOUND'||code==='EAI_AGAIN'?'域名解析失败':code?.includes('TIMEOUT')||code==='ETIMEDOUT'?'连接超时':code==='ECONNREFUSED'?'连接被拒绝':'网络连接失败';
    throw Object.assign(new Error('模型服务'+reason+'（已尝试'+attempt+'次），请检查网络或稍后重试'),{code:'model_network',attempts:attempt,cause:error});
   }
   const delayMs=1000*2**(attempt-1);
   onRetry({attempt:attempt+1,maxAttempts,delayMs});
   try{await wait(delayMs,options.signal);}catch(error){checkSignal(options.signal);throw error;}
  }
 }
}
