// Configuration-only prices. Unknown is distinct from an explicitly free rate.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {estimateBilling,normalizeUsageProvenance} from './model-gateway-result.mjs';
const invalid=()=>{throw new TypeError('Invalid model pricing configuration');};
export const pricingTime=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
export function pricingRecord(value,keys){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)invalid();
 const result={};
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);if(!d?.enumerable||!Object.hasOwn(d,'value'))invalid();result[key]=d.value;}
 return result;
}
export function createModelPricing(value){
 if(value===null)return null;
 const dated=Object.hasOwn(value??{},'schemaVersion');
 const tiered=Object.getOwnPropertyDescriptor(value??{},'schemaVersion')?.value===2;
 const p=pricingRecord(value,dated?['schemaVersion','version','effectiveFrom','effectiveTo','currency','unit','input','output','cacheRead',...(tiered?['timezone','tiers']:[])]:['currency','unit','input','output','cacheRead']);
 if(typeof p.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||p.unit!=='per-million-tokens'||['input','output','cacheRead'].some(k=>p[k]!==null&&!(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0)))invalid();
 if(dated&&(![1,2].includes(p.schemaVersion)||typeof p.version!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(p.version)||!pricingTime(p.effectiveFrom)||p.effectiveTo!==null&&(!pricingTime(p.effectiveTo)||p.effectiveTo<=p.effectiveFrom)))invalid();
 if(tiered){
  if(typeof p.timezone!=='string'||p.timezone.length>80||!Array.isArray(p.tiers)||!p.tiers.length||p.tiers.length>24)invalid();
  try{new Intl.DateTimeFormat('en-GB',{timeZone:p.timezone}).format(0);}catch{invalid();}
  const covered=new Set(),ids=new Set();
  p.tiers=Object.freeze(Array.from(p.tiers,raw=>{
   const t=pricingRecord(raw,['id','startMinute','endMinute','input','output','cacheRead']);
   if(typeof t.id!=='string'||!/^[a-zA-Z0-9._-]{1,80}$/.test(t.id)||ids.has(t.id)||!Number.isInteger(t.startMinute)||t.startMinute<0||t.startMinute>=1440||!Number.isInteger(t.endMinute)||t.endMinute<0||t.endMinute>1440||t.startMinute===t.endMinute)invalid();
   createModelPricing({currency:p.currency,unit:p.unit,input:t.input,output:t.output,cacheRead:t.cacheRead});ids.add(t.id);
   for(let m=0;m<1440;m++)if(t.startMinute<t.endMinute?m>=t.startMinute&&m<t.endMinute:m>=t.startMinute||m<t.endMinute){if(covered.has(m))invalid();covered.add(m);}
   return Object.freeze(t);
  }));
 }
 return Object.freeze(p);
}

export function createPricingRegistry(value){
 const registry=pricingRecord(value,['schemaVersion','entries']);
 if(registry.schemaVersion!==1||!Array.isArray(registry.entries)||registry.entries.length>10000)invalid();
 const versions=new Set();
 const entries=Array.from(registry.entries,raw=>{
  const entry=pricingRecord(raw,['profileId','connectionIdentity','recordedAt','pricing']);
  if(typeof entry.profileId!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(entry.profileId)||typeof entry.connectionIdentity!=='string'||! /^[a-f0-9]{64}$/.test(entry.connectionIdentity)||!pricingTime(entry.recordedAt))invalid();
  const pricing=createModelPricing(entry.pricing);if(![1,2].includes(pricing?.schemaVersion))invalid();
  const key=JSON.stringify([entry.profileId,entry.connectionIdentity,pricing.version]);if(versions.has(key))invalid();versions.add(key);
  return Object.freeze({...entry,pricing});
 });
 for(let i=0;i<entries.length;i++)for(let j=0;j<i;j++){
  const a=entries[i],b=entries[j];
  if(a.profileId===b.profileId&&a.connectionIdentity===b.connectionIdentity&&a.pricing.effectiveFrom<(b.pricing.effectiveTo??'9999')&&b.pricing.effectiveFrom<(a.pricing.effectiveTo??'9999'))invalid();
 }
 return Object.freeze({schemaVersion:1,entries:Object.freeze(entries)});
}
// Read-only administrative input, validated on every load. Never fetch prices.
export function loadPricingRegistry(file){
 if(!file)return createPricingRegistry({schemaVersion:1,entries:[]});
 try{const bytes=fs.readFileSync(file);if(bytes.length>2_000_000)invalid();return createPricingRegistry(JSON.parse(bytes.toString('utf8')));}catch{invalid();}
}
export function resolveModelPricing(registry,{profileId,connectionIdentity,at}){
 if(!pricingTime(at))invalid();
 const rows=createPricingRegistry(registry).entries.filter(e=>e.profileId===profileId&&e.connectionIdentity===connectionIdentity&&e.recordedAt<=at&&e.pricing.effectiveFrom<=at&&(e.pricing.effectiveTo===null||at<e.pricing.effectiveTo));
 if(rows.length!==1)return null;
 const entry=rows[0];
 return Object.freeze({pricing:entry.pricing,recordedAt:entry.recordedAt,at,entryHash:createHash('sha256').update(JSON.stringify(entry)).digest('hex')});
}
export function normalizePricingResolution(value){
 if(value===null||value===undefined)return null;
 try{
  const r=pricingRecord(value,['pricing','recordedAt','at','entryHash']);
  const pricing=createModelPricing(r.pricing);
  if(![1,2].includes(pricing?.schemaVersion)||!pricingTime(r.at)||!pricingTime(r.recordedAt)||r.recordedAt>r.at||pricing.effectiveFrom>r.at||pricing.effectiveTo!==null&&r.at>=pricing.effectiveTo||typeof r.entryHash!=='string'||!/^[a-f0-9]{64}$/.test(r.entryHash))return null;
  return {pricing,recordedAt:r.recordedAt,at:r.at,entryHash:r.entryHash};
 }catch{return null;}
}
export function calculateModelCost(usage,resolution,tokenSources={}){
 const source=normalizePricingResolution(resolution),d=normalizeUsageProvenance(usage,tokenSources);
 const selected=source?pricingAt(source.pricing,source.at):null;
 const bill=selected?estimateBilling(d.usage,selected.pricing):null;
 return {schemaVersion:1,formulaVersion:'token-cost-1',pricing:source,currency:source?.pricing.currency??null,estimatedCost:bill?.estimatedCost??null,
  timeTier:selected?.timeTier??null,
  confidence:bill?(Object.values(d.tokenSources).includes('estimated')?'estimated-usage':'provider-usage'):'unknown',
  reason:bill?null:source?'usage_or_rate_unknown':'pricing_unknown'};
}
export function pricingAt(value,at){
 const p=createModelPricing(value);if(!p||!pricingTime(at))return null;
 if(p.effectiveFrom&&(at<p.effectiveFrom||p.effectiveTo!==null&&at>=p.effectiveTo))return null;
 if(p.schemaVersion!==2)return {pricing:p,timeTier:null};
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:p.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));
 const minute=Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);
 const tier=p.tiers.find(t=>t.startMinute<t.endMinute?minute>=t.startMinute&&minute<t.endMinute:minute>=t.startMinute||minute<t.endMinute);
 return {pricing:tier?{...p,input:tier.input,output:tier.output,cacheRead:tier.cacheRead}:p,timeTier:{id:tier?.id??'base',timezone:p.timezone}};
}
