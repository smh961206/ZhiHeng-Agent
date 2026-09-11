import {ModelGatewayError} from './model-gateway-result.mjs';

/** Availability observations only. Never consumes complexity or model reasoning. */
export function createModelHealth({now=Date.now,threshold=2,windowMs=60000,cooldownMs=30000,ttlMs=300000,maxEntries=256}={}){
 for(const n of [threshold,windowMs,cooldownMs,ttlMs,maxEntries])if(!Number.isSafeInteger(n)||n<=0)throw new TypeError('Invalid health bounds');
 if(ttlMs<Math.max(windowMs,cooldownMs))throw new TypeError('Invalid health bounds');
 const entries=new Map();let sequence=0;
 const prune=time=>{for(const [key,entry] of entries)if(time-entry.touched>=ttlMs)entries.delete(key);};
 return Object.freeze({
  begin(key){
   const time=now();prune(time);let entry=entries.get(key);
   if(!entry){
    // Full state is conservative: do not evict another connection's cooldown.
    if(entries.size>=maxEntries)return null;
    entry={failures:[],until:0,touched:time,last:0};entries.set(key,entry);
   }
   entry.touched=time;return {key,entry,sequence:++sequence};
  },
  finish(token,error){
   if(!token||entries.get(token.key)!==token.entry)return;
   const entry=token.entry,time=now();
   if(token.sequence<=entry.last)return; // An older success cannot clear a newer failure.
   entry.last=token.sequence;entry.touched=time;
   if(!error){entry.failures=[];entry.until=0;return;}
   if(!['rate_limit','provider_unavailable','network','timeout'].includes(error.category))return;
   entry.failures=entry.failures.filter(t=>time-t<windowMs);entry.failures.push(time);
   if(entry.failures.length>=threshold){entry.until=time+cooldownMs;entry.failures=entry.failures.slice(-threshold);}
  },
  cooling(key){const time=now();prune(time);return (entries.get(key)?.until??0)>time;},
  get size(){prune(now());return entries.size;},
 });
}
export const modelHealth=createModelHealth();

// Operator-owned ordered allowlist, separate from health and price. No inferred quality.
export function healthConfiguration(input,catalog){
 if(input===undefined)return {mode:'observe',fallbacks:[]};
 if(!input||!['observe','fallback'].includes(input.mode)||!Array.isArray(input.fallbacks)||input.mode==='fallback'&&!input.fallbacks.length)throw new ModelGatewayError('configuration');
 const fallbacks=input.fallbacks.map(pair=>{
  const primary=catalog?.profiles.find(p=>p.id===pair?.primary),fallback=catalog?.profiles.find(p=>p.id===pair?.fallback);
  if(!primary||!fallback||primary.id===fallback.id||primary.tier!==fallback.tier||pair.qualityApproved!==true)throw new ModelGatewayError('configuration');
  return Object.freeze({primary:primary.id,fallback:fallback.id});
 });
 if(fallbacks.some(p=>fallbacks.some(q=>p.primary===q.fallback)))throw new ModelGatewayError('configuration');
 return Object.freeze({mode:input.mode,fallbacks:Object.freeze(fallbacks)});
}

export function canUseHealthFallback(request){
 // Any continuation remains on its original model, including completed tool history.
 return request.messages.every(m=>['system','user'].includes(m.role)&&!Object.hasOwn(m,'reasoning_content')&&!Object.hasOwn(m,'tool_calls')&&!Object.hasOwn(m,'tool_call_id'));
}
