import {createHash} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {remote} from './market-request.mjs';
import {createMarketCache} from './market-cache.mjs';
import {providerConfig,redactProviderError} from './data-provider-config.mjs';
import {dataArchive} from './data-archive.mjs';

// All Tushare collectors share pacing, successful reads and permission cooldowns.
export function createTushareClient({request=remote,token=()=>providerConfig().tushare.token,clock=Date.now,wait=pause,archive}={}){
 const cache=createMarketCache({maxEntries:128,clock}),cooldown=new Map();let queue=Promise.resolve();
 const read=async(api,params,{fields='',signal,archiveScope,validate}={})=>{
  signal?.throwIfAborted();const credential=token();
  if(!credential)throw new Error('Tushare尚未配置');
  const account=createHash('sha256').update(credential).digest('hex'),scope=`${account}:${api}`;
  const cacheKey=`${scope}:${JSON.stringify(params)}:${fields}`;
  const archiveKey=archiveScope?`${scope}:window:${archiveScope}:${fields}`:cacheKey;
  return cache(cacheKey,async shared=>{
   const block=cooldown.get(scope);if(block?.until>clock())throw new Error(block.message);
   const slot=queue.then(()=>wait(600,undefined,{signal:shared}));queue=slot.catch(()=>{});await slot;shared.throwIfAborted();
   let data;
   try{
    const bytes=await request('https://api.tushare.pro/',{signal:shared,method:'POST',contentType:'application/json',
     body:JSON.stringify({api_name:api,token:credential,params,fields}),maxBytes:12_000_000,timeoutMs:12000,totalTimeoutMs:26000,retries:1});
    data=JSON.parse(bytes.toString('utf8'));
   }catch(error){
    shared.throwIfAborted();
    // A failed refresh can use an explicitly dated archive. Permission errors
    // never enter this path; revoked access must not look like a successful call.
    if(archive&&!/HTTP (401|403)|格式|JSON|允许列表/.test(error.message)){
     const maxAgeMs=(api==='daily_basic'?2:30)*86400000;
     const previous=await archive.get(archiveKey,{maxAgeMs}).catch(()=>null);
     shared.throwIfAborted();
     if(previous)return {...previous,stale:true,fromCache:true,warning:`Tushare ${api} 暂不可用，使用 ${previous.fetchedAt} 留存数据，未确认最新披露。`};
    }
    throw new Error(redactProviderError(error,[credential]));
   }
   if(data?.code!==0){
    const message=`Tushare ${api}：${redactProviderError(data?.msg||'接口请求失败',[credential])}（代码${data?.code??'未知'}）`;
    if(cooldown.size>=64)cooldown.delete(cooldown.keys().next().value);
    cooldown.set(scope,{until:clock()+60000,message});throw new Error(message);
   }
   if(validate)validate(data);
   const result={data,fetchedAt:new Date(clock()).toISOString()};
   if(archive){
    try{await archive.put(archiveKey,result);}catch{result.warning='本次数据已读取，但持久缓存写入失败，故障时可能无法回用。';}
   }
   return result;
  },{signal,ttlMs:300000,shouldCache:value=>!value.stale});
 };
 read.configured=()=>Boolean(token());return read;
}
export const tushareClient=createTushareClient({archive:dataArchive});
