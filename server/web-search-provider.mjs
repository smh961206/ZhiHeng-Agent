import {redactProviderError} from './data-provider-config.mjs';

export function webSearchConfig(env=process.env){
 return {enabled:env.WEB_SEARCH_ENABLED!=='false',tavily:env.TAVILY_API_KEY?.trim()||'',brave:env.BRAVE_SEARCH_API_KEY?.trim()||''};
}
export function webSearchStatus(env=process.env){
 const config=webSearchConfig(env);
 return {enabled:config.enabled,configured:config.enabled&&Boolean(config.tavily||config.brave),providers:[...(config.tavily?['Tavily']:[]),...(config.brave?['Brave']:[])],strategy:'先查已有资料，按缺口搜索，读取正文后纳入证据',limits:{searches:6,documents:8,seconds:180}};
}
export function validateSearchQuery(query,env=process.env){
 if(typeof query!=='string'||query.trim().length<2||query.length>300||query.trim().split(/\s+/).length>45)throw new Error('搜索词须为2—300字、最多45个词的公开资料关键词');
 if(/[\u0000-\u001f]|https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:api[_ -]?key|access[_ -]?token|bearer|password)\s*[:=]/i.test(query))throw new Error('搜索词包含链接、联系方式或凭证形式；请仅使用公开研究关键词');
 const secrets=Object.entries(env).filter(([key,value])=>/TOKEN|SECRET|API_KEY/.test(key)&&typeof value==='string'&&value.length>=8).map(([,value])=>value);
 if(secrets.some(secret=>query.includes(secret)))throw new Error('搜索词包含本地凭证，未发送');
 return query.trim();
}
async function limitedJSON(response){
 if(!response.ok){await response.body?.cancel();throw new Error(`HTTP ${response.status}`);}
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>2_000_000)throw new Error('搜索响应超过大小上限');chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('搜索响应格式无效');}
}
// Provider summaries, generated answers and dates are intentionally discarded.
// Only a URL/title can leave this module; body evidence has a separate reader.
export function createWebSearchProvider({fetchImpl=(...args)=>fetch(...args),config=webSearchConfig,clock=Date.now}={}){
 const cooldown=new Map();
 return async(query,{signal}={})=>{
  query=validateSearchQuery(query);signal?.throwIfAborted();const settings=config();
  if(!settings.enabled)return {status:'disabled',candidates:[],warnings:['主动网页搜索已关闭']};
  if(!settings.tavily&&!settings.brave)return {status:'unconfigured',candidates:[],warnings:['未配置 TAVILY_API_KEY 或 BRAVE_SEARCH_API_KEY，网页缺口尚未联网补充']};
  const warnings=[];
  for(const provider of ['tavily','brave']){
   const key=settings[provider];if(!key)continue;
   if(cooldown.get(provider)>clock()){warnings.push(`${provider} 暂在访问失败冷却期`);continue;}
   try{
    const url=provider==='tavily'?new URL('https://api.tavily.com/search'):new URL('https://api.search.brave.com/res/v1/web/search');
    if(provider==='brave'){url.searchParams.set('q',query);url.searchParams.set('count','6');url.searchParams.set('safesearch','moderate');}
    const response=await fetchImpl(url,{method:provider==='tavily'?'POST':'GET',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(18000)].filter(Boolean)),
     headers:provider==='tavily'?{'Content-Type':'application/json',Authorization:`Bearer ${key}`}:{Accept:'application/json','X-Subscription-Token':key},
     ...(provider==='tavily'?{body:JSON.stringify({query,topic:'general',search_depth:'basic',max_results:6,include_answer:false,include_raw_content:false,include_images:false,auto_parameters:false})}:{})});
    if([401,403,429,432,433].includes(response.status)){
     const retry=response.headers.get('retry-after'),seconds=Number(retry);
     const until=Number.isFinite(seconds)&&seconds>0?clock()+seconds*1000:Date.parse(retry);
     cooldown.set(provider,Math.max(clock()+60000,Number.isFinite(until)?until:0));
    }
    const data=await limitedJSON(response),rows=provider==='tavily'?data.results:data.web?.results??[];
    if(!Array.isArray(rows))throw new Error('搜索候选列表格式无效');
    const candidates=[];
    for(const row of rows.slice(0,6)){
     if(typeof row?.url!=='string'||typeof row.title!=='string')continue;
     try{const url=new URL(row.url);if(url.protocol!=='https:'||url.username||url.password)continue;url.hash='';
      if(!candidates.some(candidate=>candidate.url===url.href))candidates.push({url:url.href,title:row.title.slice(0,300),searchProvider:provider==='tavily'?'Tavily':'Brave'});
     }catch{/* Invalid candidate is not evidence. */}
    }
    if(candidates.length)return {status:'found',candidates,warnings};
    warnings.push(`${provider} 未找到可用候选链接`);
   }catch(error){signal?.throwIfAborted();warnings.push(`${provider} 搜索失败：${redactProviderError(error,[settings.tavily,settings.brave])}`);}
  }
  return {status:'unavailable',candidates:[],warnings};
 };
}
export const searchWebCandidates=createWebSearchProvider();
