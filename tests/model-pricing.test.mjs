import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelPricing} from '../server/model-pricing.mjs';
import {createPricingRegistry,resolveModelPricing,loadPricingRegistry} from '../server/model-pricing.mjs';
import {calculateModelCost} from '../server/model-pricing.mjs';
import {pricingAt} from '../server/model-pricing.mjs';
import {createModelProfile,createLegacyModelCatalog} from '../server/model-catalog.mjs';
export const price={schemaVersion:1,version:'test-1',effectiveFrom:'2026-01-01T00:00:00.000Z',effectiveTo:null,currency:'USD',unit:'per-million-tokens',input:2,output:8,cacheRead:0.2};
test('dated pricing is immutable, round-trippable and accepted by existing Catalog',()=>{
 const p=createModelPricing(price);assert.ok(Object.isFrozen(p));assert.deepEqual(p,price);
 const profile=createModelProfile({...createLegacyModelCatalog({}).profiles[0],pricing:p});assert.deepEqual(profile.pricing,price);
 assert.deepEqual(createModelProfile(JSON.parse(JSON.stringify(profile))),profile);
 assert.equal(createModelPricing(null),null);assert.equal(createModelPricing({...price,input:0}).input,0);assert.equal(createModelPricing({...price,input:null}).input,null);
});
test('time tiers select the same instant using explicit timezone, midnight and DST rules',()=>{
 const p={...price,schemaVersion:2,timezone:'Asia/Shanghai',tiers:[{id:'offpeak',startMinute:22*60,endMinute:8*60,input:1,output:4,cacheRead:0.1}]};
 assert.equal(pricingAt(p,'2026-01-01T13:59:59.000Z').timeTier.id,'base');assert.equal(pricingAt(p,'2026-01-01T14:00:00.000Z').pricing.input,1);
 assert.equal(pricingAt(p,'2026-01-02T00:00:00.000Z').timeTier.id,'base');
 const ny={...p,timezone:'America/New_York',tiers:[{...p.tiers[0],startMinute:60,endMinute:120}]};
 assert.equal(pricingAt(ny,'2026-11-01T05:30:00.000Z').timeTier.id,'offpeak');assert.equal(pricingAt(ny,'2026-11-01T06:30:00.000Z').timeTier.id,'offpeak');
 assert.throws(()=>createModelPricing({...p,timezone:'invalid'}));assert.throws(()=>createModelPricing({...p,tiers:[p.tiers[0],{...p.tiers[0],id:'overlap'}]}));
 const resolution={pricing:p,recordedAt:price.effectiveFrom,at:'2026-01-01T14:00:00.000Z',entryHash:'a'.repeat(64)};
 assert.equal(calculateModelCost({inputTokens:1000000,outputTokens:0,cachedInputTokens:0},resolution).estimatedCost,1);
 assert.equal(calculateModelCost({inputTokens:1000000,outputTokens:0,cachedInputTokens:0},resolution).timeTier.timezone,'Asia/Shanghai');
});
test('per-call arithmetic preserves unknowns, explicit zero, provenance and overflow',()=>{
 const resolution={pricing:price,recordedAt:price.effectiveFrom,at:price.effectiveFrom,entryHash:'a'.repeat(64)};
 const usage={inputTokens:1000000,outputTokens:100000,cachedInputTokens:500000,reasoningTokens:50000};
 const c=calculateModelCost(usage,resolution);assert.equal(c.estimatedCost,1.9);assert.equal(c.formulaVersion,'token-cost-1');assert.equal(c.pricing.pricing.version,price.version);
 assert.equal(calculateModelCost({...usage,cachedInputTokens:null},resolution).estimatedCost,null);
 assert.equal(calculateModelCost(usage,null).estimatedCost,null);
 assert.equal(calculateModelCost(usage,resolution,{inputTokens:'estimated'}).confidence,'estimated-usage');
 assert.equal(calculateModelCost({inputTokens:0,outputTokens:0,cachedInputTokens:0},resolution).estimatedCost,0);
 assert.equal(calculateModelCost(usage,{...resolution,pricing:{...price,input:Number.MAX_VALUE}}).estimatedCost,null);
});
test('registry resolves effective windows and known-at history against exact connection identity',()=>{
 const identity='a'.repeat(64),entry={profileId:'legacy-analysis',connectionIdentity:identity,recordedAt:'2025-12-01T00:00:00.000Z',pricing:{...price,effectiveTo:'2026-06-01T00:00:00.000Z'}};
 const registry=createPricingRegistry({schemaVersion:1,entries:[entry,{...entry,pricing:{...price,version:'test-2',effectiveFrom:entry.pricing.effectiveTo}}]});
 const resolve=at=>resolveModelPricing(registry,{profileId:entry.profileId,connectionIdentity:identity,at});
 assert.equal(resolve(price.effectiveFrom).pricing.version,'test-1');assert.equal(resolve(entry.pricing.effectiveTo).pricing.version,'test-2');
 assert.equal(resolve('2025-11-01T00:00:00.000Z'),null);
 assert.equal(resolveModelPricing(registry,{profileId:entry.profileId,connectionIdentity:'b'.repeat(64),at:price.effectiveFrom}),null);
 assert.throws(()=>createPricingRegistry({schemaVersion:1,entries:[entry,{...entry,pricing:{...price,version:'overlap'}}]}));
 assert.throws(()=>createPricingRegistry({schemaVersion:1,entries:[entry,entry]}));
 assert.equal(loadPricingRegistry().entries.length,0);assert.throws(()=>loadPricingRegistry('missing-prices.json'),/Invalid model pricing configuration/);
 const late=createPricingRegistry({schemaVersion:1,entries:[{...entry,recordedAt:'2026-02-01T00:00:00.000Z'}]});
 assert.equal(resolveModelPricing(late,{profileId:entry.profileId,connectionIdentity:identity,at:price.effectiveFrom}),null);
});
test('pricing rejects invalid dates, rates and accessors without executing them',()=>{
 for(const patch of [{effectiveFrom:'2026-02-30T00:00:00.000Z'},{effectiveTo:price.effectiveFrom},{input:-1},{output:Infinity},{cacheRead:'0'},{currency:'usd'},{schemaVersion:2},{version:''}])assert.throws(()=>createModelPricing({...price,...patch}));
 let read=false;const value={...price};Object.defineProperty(value,'input',{enumerable:true,get(){read=true;return 1;}});assert.throws(()=>createModelPricing(value));assert.equal(read,false);
});
