import test from 'node:test';
import assert from 'node:assert/strict';
import {createModelHealth} from '../server/model-health.mjs';
import {modelConnectionIdentity} from '../server/model-adapter.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';

const env={LLM_API_KEY:'synthetic',LLM_BASE_URL:'https://primary.invalid',LLM_MODEL:'primary'};
const primary=createLegacyModelCatalog(env).profiles[0];
const alternate={...primary,id:'approved-alternate',model:'alternate',connectionRef:'legacy-vision'};
const catalog={profiles:[primary,alternate]};
const request={purpose:'research',messages:[{role:'user',content:'synthetic'}]};
const json=()=>new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'answer'},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});
const fallback={mode:'fallback',fallbacks:[{primary:primary.id,fallback:alternate.id,qualityApproved:true}]};
const error=category=>({category});

for(const category of ['rate_limit','provider_unavailable','network','timeout'])test(`health bounds recent ${category} failures and recovers`,()=>{
 let clock=0;const health=createModelHealth({now:()=>clock});
 health.finish(health.begin('a'),error(category));assert.equal(health.cooling('a'),false);
 clock=60000;health.finish(health.begin('a'),error(category));assert.equal(health.cooling('a'),false);
 health.finish(health.begin('a'),error(category));assert.equal(health.cooling('a'),true);
 clock+=30000;assert.equal(health.cooling('a'),false);
 health.finish(health.begin('a'));assert.equal(health.cooling('a'),false);
 clock+=300000;assert.equal(health.size,0);
});

test('older concurrent outcomes cannot clear or reopen a newer health result; bounded state stays isolated',()=>{
 let clock=0;const h=createModelHealth({now:()=>clock,threshold:1,maxEntries:1});
 const old=h.begin('a'),recent=h.begin('a');h.finish(recent,error('rate_limit'));h.finish(old);
 assert.equal(h.cooling('a'),true);assert.equal(h.begin('b'),null);assert.equal(h.size,1);
 clock+=300000;const fresh=h.begin('a');h.finish(old,error('rate_limit'));assert.equal(h.cooling('a'),false);
 h.finish(fresh);assert.equal(h.size,1);
 const pending=h.begin('a'),newest=h.begin('a');h.finish(newest);h.finish(pending,error('provider_unavailable'));assert.equal(h.cooling('a'),false);
});

test('non-health failures never trigger cooldown and keys separate endpoints/models without credentials',()=>{
 const h=createModelHealth({threshold:1});
 for(const category of ['aborted','authentication','configuration','refusal','malformed_response','callback_error','invalid_request'])h.finish(h.begin('a'),error(category));
 assert.equal(h.cooling('a'),false);
 const key=modelConnectionIdentity(primary,env);
 assert.match(key,/^[a-f0-9]{64}$/);assert.equal(key,modelConnectionIdentity(primary,{...env,LLM_API_KEY:'rotated'}));
 assert.notEqual(key,modelConnectionIdentity(primary,{...env,LLM_BASE_URL:'https://other.invalid'}));
 assert.notEqual(key,modelConnectionIdentity(alternate,env));
 assert.equal(key,modelConnectionIdentity(primary,{...env,LLM_BASE_URL:env.LLM_BASE_URL+'/'}));
});

test('Gateway observes failed calls then selects an approved same-tier candidate only before the next call',async()=>{
 let clock=0;const h=createModelHealth({now:()=>clock,threshold:1}),wires=[],records=[];
 const g=createModelGateway({env,catalog,health:h,healthRouting:fallback,onModelCall:r=>records.push(r),fetchImpl:async(url,o)=>{
  const body=JSON.parse(o.body);wires.push(body);return body.model==='primary'&&clock===0?new Response('',{status:503}):json();
 }});
 await assert.rejects(g.complete(request),e=>e.category==='provider_unavailable');assert.equal(wires.length,1);
 const result=await g.complete(request);assert.equal(result.profile,alternate.id);assert.equal(result.tier,'legacy');
 assert.deepEqual(wires.map(b=>b.model),['primary','alternate']);assert.equal(records.at(-1).profile,alternate.id);
 clock=30000;assert.equal((await g.complete(request)).profile,primary.id);assert.equal(wires.length,3);
});

test('legacy/dry-run never switch and safe continuation/profile pins never transfer private state',async()=>{
 for(const mode of ['legacy','dry-run']){
  const h=createModelHealth({threshold:1}),models=[];
  h.finish(h.begin(modelConnectionIdentity(primary,env)),error('rate_limit'));
  const g=createModelGateway({env:{...env,MODEL_ROUTING_MODE:mode},health:h,onRoutingDecision:()=>{},fetchImpl:async(u,o)=>{models.push(JSON.parse(o.body).model);return json();}});
  await g.complete(request);assert.deepEqual(models,['primary']);
 }
 const h=createModelHealth({threshold:1});h.finish(h.begin(modelConnectionIdentity(primary,env)),error('timeout'));
 const models=[],g=createModelGateway({env,catalog,health:h,healthRouting:fallback,fetchImpl:async(u,o)=>{models.push(JSON.parse(o.body).model);return json();}});
 for(const extra of [{routingContext:{profileId:primary.id}},{messages:[...request.messages,{role:'assistant',content:'private',reasoning_content:'secret'}]},{messages:[...request.messages,{role:'assistant',content:null,tool_calls:[{id:'t',type:'function',function:{name:'x',arguments:'{}'}}]}]},{messages:[...request.messages,{role:'tool',tool_call_id:'t',content:'result'}]}])await g.complete({...request,...extra});
 assert.deepEqual(models,['primary','primary','primary','primary']);
});

test('unapproved, cross-tier, chained or absent candidates fail closed',()=>{
 for(const healthRouting of [{mode:'fallback',fallbacks:[]},{mode:'fallback',fallbacks:[{primary:primary.id,fallback:alternate.id}]},{mode:'fallback',fallbacks:[{primary:'absent',fallback:alternate.id,qualityApproved:true}]},{mode:'fallback',fallbacks:[...fallback.fallbacks,{primary:alternate.id,fallback:primary.id,qualityApproved:true}]}])assert.throws(()=>createModelGateway({env,catalog,healthRouting}),e=>e.category==='configuration');
 assert.throws(()=>createModelGateway({env,catalog:{profiles:[primary,{...alternate,tier:'PRO'}]},healthRouting:fallback}),e=>e.category==='configuration');
});

test('capability and known context limits precede health; no safe alternate gives availability failure without dispatch',async()=>{
 for(const candidate of [{...alternate,capabilities:{...alternate.capabilities,toolCalling:false}},{...alternate,capabilities:{...alternate.capabilities,jsonObject:null}},{...alternate,contextWindow:null}]){
  const p={...primary,contextWindow:1000},h=createModelHealth({threshold:1});h.finish(h.begin(modelConnectionIdentity(p,env)),error('rate_limit'));
  const g=createModelGateway({env,catalog:{profiles:[p,candidate]},health:h,healthRouting:fallback,fetchImpl:()=>assert.fail('must not dispatch')});
  await assert.rejects(g.complete({...request,tools:[{type:'function',function:{name:'x'}}],responseFormat:{type:'json_object'}}),e=>e.category==='provider_unavailable');
 }
});

test('partial streamed output is never replayed through an alternate',async()=>{
 let calls=0;const h=createModelHealth({threshold:1}),deltas=[];
 const g=createModelGateway({env,catalog,health:h,healthRouting:fallback,fetchImpl:async()=>{
  calls++;return new Response('data: {"choices":[{"index":0,"delta":{"content":"partial"}}]}\n\n',{headers:{'content-type':'text/event-stream'}});
 }});
 await assert.rejects(g.complete({...request,onDelta:t=>deltas.push(t)}),e=>e.category==='truncated');
 assert.equal(calls,1);assert.deepEqual(deltas,['partial']);assert.equal(h.cooling(modelConnectionIdentity(primary,env)),false);
});
