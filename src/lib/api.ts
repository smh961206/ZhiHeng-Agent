export interface ClientApiError extends Error{
 code:'network'|'invalid_response'|'http';
 status?:number;
}

function clientError(message:string,code:ClientApiError['code'],status?:number):ClientApiError{
 return Object.assign(new Error(message),{code,...(status===undefined?{}:{status})});
}

function hasErrorMessage(value:unknown):value is {error:string}{
 return typeof value==='object'&&value!==null&&'error' in value&&typeof value.error==='string';
}

export async function api<T=unknown>(url:string,options:RequestInit={}):Promise<T>{
 let response:Response;
 try{response=await fetch(url,options);}catch(error){
  if(options.signal?.aborted||(error instanceof Error&&error.name==='AbortError'))throw error;
  throw clientError('网络连接失败，请检查连接后重试；已提交的研究可先到研究记录确认状态。','network');
 }
 let data:unknown;
 try{data=await response.json();}catch{
  throw clientError(response.ok?'服务返回内容异常，请刷新后重试。':`服务暂不可用（HTTP ${response.status}），请稍后重试。`,'invalid_response',response.status);
 }
 if(!response.ok){
  const message=hasErrorMessage(data)?data.error:response.status===429?'当前请求较多，请稍后重试。':response.status===401||response.status===403?'请求未获允许，请检查访问权限。':`请求失败（HTTP ${response.status}），请稍后重试。`;
  throw clientError(message,'http',response.status);
 }
 return data as T;
}

export const post=(value:unknown):RequestInit=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
