import {createHash} from 'node:crypto';
import {uniqueModelCalls} from './model-telemetry.mjs';

// Hash only the stable leading system text and request configuration. User
// bodies, tool results, images and private assistant reasoning never persist.
export function modelPrefixFingerprint(request,profile,connectionIdentity){
 const textOnly=Array.isArray(request.messages)&&request.messages.every(m=>typeof m.content==='string'||m.content===null||Array.isArray(m.content)&&m.content.every(p=>p.type==='text'&&typeof p.text==='string'));
 const prefix=[];
 for(const message of request.messages??[]){if(message.role!=='system')break;if(typeof message.content!=='string')return null;prefix.push(message.content);}
 if(!textOnly||!prefix.length)return null;
 const dimensions={version:1,connectionIdentity,profile:profile.id,model:profile.model,protocol:profile.protocol,purpose:request.purpose,reasoningEffort:request.reasoningEffort??null,prefix,tools:request.tools??null,responseFormat:request.responseFormat??null};
 return {schemaVersion:1,prefixFingerprint:createHash('sha256').update(JSON.stringify(dimensions)).digest('hex'),textOnly:true};
}

export function modelCacheAnalytics(records,{asOf=new Date().toISOString(),windowMs=7*86400000}={}){
 const cutoff=Date.parse(asOf);if(!Number.isFinite(cutoff)||!Number.isSafeInteger(windowMs)||windowMs<=0)throw new TypeError('Invalid cache observation window');
 const groups=new Map();
 for(const c of uniqueModelCalls(records)){
  const finished=Date.parse(c.finishedAt);
  if(!c.cache||!c.profile||!Number.isFinite(finished)||finished>cutoff||finished<=cutoff-windowMs)continue;
  const key=JSON.stringify([c.profile,c.cache.prefixFingerprint]);
  const group=groups.get(key)??{schemaVersion:1,profile:c.profile,prefixFingerprint:c.cache.prefixFingerprint,textOnly:true,asOf,windowMs,calls:0,samples:0,hitCalls:0,inputTokens:0,cachedInputTokens:0,jobs:new Set()};
  group.calls++;
  if(c.status==='succeeded'&&c.transportAttempts===1&&c.usage.inputTokens>0&&c.usage.cachedInputTokens!==null&&c.tokenSources.inputTokens==='provider'&&c.tokenSources.cachedInputTokens==='provider'){
   group.samples++;group.hitCalls+=c.usage.cachedInputTokens>0?1:0;group.inputTokens+=c.usage.inputTokens;group.cachedInputTokens+=c.usage.cachedInputTokens;if(c.jobId)group.jobs.add(c.jobId);
  }
  groups.set(key,group);
 }
 return [...groups.values()].map(({jobs,...g})=>({...g,uniqueJobs:jobs.size,unknownCalls:g.calls-g.samples,
  inputTokens:Number.isSafeInteger(g.inputTokens)&&g.samples?g.inputTokens:null,cachedInputTokens:Number.isSafeInteger(g.cachedInputTokens)&&g.samples?g.cachedInputTokens:null,
  observedHitRatio:g.samples?g.hitCalls/g.samples:null,observedTokenRatio:g.samples&&Number.isSafeInteger(g.inputTokens)&&Number.isSafeInteger(g.cachedInputTokens)?g.cachedInputTokens/g.inputTokens:null}));
}
export const cacheEligibilityPolicy=Object.freeze({version:'cache-eligibility-1',minSamples:30,minUniqueJobs:5,minCoverage:0.9,minTokenRatio:0.5,windowMs:7*86400000});
export function cacheEligibility(records,{request,profile,connectionIdentity,asOf=new Date().toISOString()}={}){
 const fingerprint=modelPrefixFingerprint(request,profile,connectionIdentity),reasons=[];
 if(!fingerprint)reasons.push('text_prefix_required');
 const stats=fingerprint?modelCacheAnalytics(records,{asOf,windowMs:cacheEligibilityPolicy.windowMs}).find(g=>g.profile===profile.id&&g.prefixFingerprint===fingerprint.prefixFingerprint):null;
 if(!stats||stats.samples<cacheEligibilityPolicy.minSamples)reasons.push('observations_required');
 if(!stats||stats.uniqueJobs<cacheEligibilityPolicy.minUniqueJobs)reasons.push('independent_jobs_required');
 if(!stats||stats.samples/stats.calls<cacheEligibilityPolicy.minCoverage)reasons.push('observed_coverage_required');
 if(stats?.observedTokenRatio===null||stats?.observedTokenRatio===undefined||stats.observedTokenRatio<cacheEligibilityPolicy.minTokenRatio)reasons.push('observed_ratio_required');
 return {policyVersion:cacheEligibilityPolicy.version,eligible:reasons.length===0,reasons,stats:stats??null};
}
