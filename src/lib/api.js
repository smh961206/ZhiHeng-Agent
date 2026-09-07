export async function api(url,options){
 let res;
 try{res=await fetch(url,options);}catch(error){if(options?.signal?.aborted||error.name==='AbortError')throw error;throw Object.assign(new Error('网络连接失败，请检查连接后重试；已提交的研究可先到研究记录确认状态。'),{code:'network'});}
 let data;try{data=await res.json();}catch{throw Object.assign(new Error(res.ok?'服务返回内容异常，请刷新后重试。':`服务暂不可用（HTTP ${res.status}），请稍后重试。`),{code:'invalid_response',status:res.status});}
 if(!res.ok)throw Object.assign(new Error(typeof data?.error==='string'?data.error:res.status===429?'当前请求较多，请稍后重试。':res.status===401||res.status===403?'请求未获允许，请检查访问权限。':`请求失败（HTTP ${res.status}），请稍后重试。`),{code:'http',status:res.status});
 return data;
}
export const post=value=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
