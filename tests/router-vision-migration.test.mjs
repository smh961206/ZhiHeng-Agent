import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setImmediate as nextTick} from 'node:timers/promises';
import {createPathResolver} from '../server/research-path.mjs';
import {createSecurityIntentExtractor} from '../server/security-intent.mjs';
import {readVisionImages} from '../server/vision-model.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {cases,routerVisionScenario} from './fixtures/router-vision-migration-scenario.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/router-vision-migration-baseline.json',import.meta.url)));
assert.deepEqual(baseline.cases.map(c=>c.name),cases);
for(const expected of baseline.cases)test('V4.8.4 preserves legacy wire and results: '+expected.name,async()=>{
 assert.deepEqual(await routerVisionScenario({createPathResolver,createSecurityIntentExtractor,readVisionImages},expected.name),expected);
});
for(const expected of baseline.cases)test('V4.8.4 router/Vision wire, results and cache remain legacy with V4.8.6 dry-run: '+expected.name,async()=>{
 const oldInfo=console.info,decisions=[];
 console.info=text=>decisions.push(JSON.parse(text));
 const dry=options=>({...options,env:{...options.env,MODEL_ROUTING_MODE:'dry-run'}});
 try{
  const owners={createPathResolver:options=>createPathResolver(dry(options)),
   createSecurityIntentExtractor:options=>createSecurityIntentExtractor(dry(options)),
   readVisionImages:(images,options)=>readVisionImages(images,dry(options))};
  assert.deepEqual(await routerVisionScenario(owners,expected.name),expected);
  assert.equal(decisions.length,1,'cache hits must not create model-call observations');
  assert.equal(decisions[0].executionProfile,expected.name.startsWith('vision')?'legacy-vision':'legacy-router');
  assert.equal(decisions[0].candidate,null);assert.deepEqual(decisions[0].reasons,['purpose_not_scored']);
  assert.doesNotMatch(JSON.stringify(decisions),/synthetic|invalid|贵州茅台|营业收入|image_url/);
 }finally{console.info=oldInfo;}
});
const env={LLM_API_KEY:'synthetic',LLM_BASE_URL:'https://model.invalid'};
const image={page:1,dataUrl:'data:image/png;base64,AA=='};
const reply=(content='answer',extra={})=>Response.json({choices:[{finish_reason:'stop',message:{content},...extra}]});
const owner=(kind,options)=>kind==='path'?createPathResolver(options).recommend:createSecurityIntentExtractor(options);
const content=kind=>kind==='path'?'{"mode":"B","reason":"公司研究"}':'{"targets":[{"mention":"茅台"}]}';

test('router/Vision missing-role compatibility is isolated and never accepts incomplete or refused output',async()=>{
 for(const purpose of ['router','vision']){
  const request={purpose,messages:[{role:'user',content:purpose==='router'?'test':[{type:'image_url',image_url:{url:image.dataUrl}}]}]};
  const options={env,fetchImpl:async()=>reply()};
  await assert.rejects(createModelGateway(options).complete(request),{category:'malformed_response'});
  const gateway=createModelGateway({...options,compatibility:'legacy-router-vision'});
  assert.equal((await gateway.complete(request)).message.role,'assistant');
  for(const response of [
   ()=>reply('answer',{finish_reason:null}),()=>reply('answer',{finish_reason:'length'}),
   ()=>reply('answer',{message:{role:'user',content:'answer'}}),
   ()=>reply('answer',{message:{refusal:'private refusal'}}),
   ()=>Response.json({choices:[{finish_reason:'stop',message:{content:'a'}},{finish_reason:'stop',message:{content:'b'}}]}),
  ])await assert.rejects(createModelGateway({...options,compatibility:'legacy-router-vision',fetchImpl:async()=>response()}).complete(request));
  await assert.rejects(gateway.complete({purpose:'research',messages:[{role:'user',content:'test'}]}),{category:'unsupported_capability'});
 }
});

test('both router owners preserve failure TTL, model/base cache identity and no provider retries',async()=>{
 for(const kind of ['path','intent']){
  let calls=0,time=0,failing=true;const localEnv={...env};
  const resolve=owner(kind,{env:localEnv,now:()=>time,fetchImpl:async()=>{calls++;return failing?Response.json({error:'private'},{status:429}):reply(content(kind));}});
  assert.equal((await resolve('研究茅台')).source,'rules');assert.equal(calls,1);
  time=29999;await resolve('研究茅台');assert.equal(calls,1);
  failing=false;time=30000;assert.equal((await resolve('研究茅台')).source,'semantic');assert.equal(calls,2);
  time=629999;await resolve('研究茅台');assert.equal(calls,2);
  time=630000;await resolve('研究茅台');assert.equal(calls,3);
  localEnv.LLM_ROUTER_MODEL='new-router';await resolve('研究茅台');assert.equal(calls,4);
  localEnv.LLM_BASE_URL='https://other.invalid';await resolve('研究茅台');assert.equal(calls,5);
  for(const status of [401,500]){
   let failures=0;const failed=owner(kind,{env,fetchImpl:async()=>{failures++;return new Response('private',{status});}});
   assert.equal((await failed('研究茅台')).source,'rules');assert.equal(failures,1);
  }
 }
});

test('router stalled bodies time out and release capacity; cancellation preserves reason without caching',async()=>{
 for(const kind of ['path','intent']){
  let calls=0,cancelled=0;
  const resolve=owner(kind,{env,timeoutMs:15,maxConcurrent:1,fetchImpl:async()=>{
   calls++;return calls===1?new Response(new ReadableStream({cancel(){cancelled++;}})):reply(content(kind));
  }});
  assert.equal((await resolve('首个茅台问题')).source,'rules');assert.equal(cancelled,1);
  assert.equal((await resolve('第二个茅台问题')).source,'semantic');assert.equal(calls,2);
  let fetched,attempts=0;const ready=new Promise(r=>{fetched=r;});
  const next=owner(kind,{env,fetchImpl:async()=>{
   attempts++;if(attempts>1)return reply(content(kind));fetched();return new Response(new ReadableStream({cancel(){cancelled++;}}));
  }});
  const control=new AbortController(),reason=new Error('caller cancellation');
  const pending=next('研究茅台',{signal:control.signal});const rejected=assert.rejects(pending,e=>e===reason);
  await ready;control.abort(reason);await rejected;assert.equal(cancelled,2);
  assert.equal((await next('研究茅台')).source,'semantic');assert.equal(attempts,2);
 }
});

test('Vision keeps image/request/response bounds and safe failures without retries',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return reply();};
 for(const images of [[],Array(13).fill(image),[{...image,dataUrl:'data:image/png;base64,'+'a'.repeat(16*1024*1024)}]])await assert.rejects(readVisionImages(images,{env,prompt:'read',fetcher}));
 assert.equal(calls,0);
 assert.equal(await readVisionImages(Array(12).fill(image),{env,prompt:'read',fetcher}),'answer');assert.equal(calls,1);
 for(const [response,pattern] of [
  [()=>new Response('private-key-image',{status:401}),/HTTP 401/],
  [()=>reply('x'.repeat(18001)),/未完整完成/],
  [()=>reply('partial',{finish_reason:'length'}),/未完整完成/],
 ]){
  let attempts=0;await assert.rejects(readVisionImages([image],{env,prompt:'read',fetcher:async()=>{attempts++;return response();}}),e=>pattern.test(e.message)&&!e.message.includes('private-key-image'));
  assert.equal(attempts,1);
 }
 let cancelled=false;
 await assert.rejects(readVisionImages([image],{env,prompt:'read',fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(Buffer.alloc(512001));},cancel(){cancelled=true;}}))}),/返回过大/);
 assert.equal(cancelled,true);
});

test('Vision bounds non-cooperative fetch by 60 seconds and closes late responses',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let resolveFetch,calls=0,cancelled=false;
 const pending=readVisionImages([image],{env,prompt:'read',fetcher:()=>{calls++;return new Promise(r=>{resolveFetch=r;});}});
 const rejected=assert.rejects(pending,{category:'timeout'});await nextTick();t.mock.timers.tick(60000);await rejected;
 resolveFetch(new Response(new ReadableStream({cancel(){cancelled=true;}})));await nextTick();
 assert.equal(calls,1);assert.equal(cancelled,true);
 const control=new AbortController(),reason=new Error('cancel image');control.abort(reason);
 await assert.rejects(readVisionImages([image],{env,prompt:'read',signal:control.signal,fetcher:async()=>{calls++;return reply();}}),e=>e===reason);
 assert.equal(calls,1);
});

test('synthetic dual-model diagnostic uses Gateway for both Vision and analysis without real networking',async()=>{
 const directory=fs.mkdtempSync(join(tmpdir(),'zhiheng-v484-diagnostic-'));
 const values={LLM_MODEL:'deepseek-fixture',LLM_API_KEY:'synthetic',LLM_BASE_URL:'https://model.invalid',LLM_VISION_MODEL:'deepseek-flash',LLM_VISION_INPUT:'images',LLM_VISION_API_KEY:'synthetic-vision',LLM_VISION_BASE_URL:'https://vision.invalid'};
 const before=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]])),oldFetch=globalThis.fetch,requests=[];
 Object.assign(process.env,values);
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);requests.push(body);assert.equal(options.redirect,'error');
  const vision=requests.length===1;
  assert.equal(url.origin,vision?'https://vision.invalid':'https://model.invalid');
  const content=vision?{pages:[{page:1,text:'ZH42 Revenue 100 USD Cost 60 USD',uncertainties:[]}]}:{code:'ZH42',revenue:100,cost:60,subtraction:40};
  return reply(JSON.stringify(content),{message:{role:'assistant',content:JSON.stringify(content)}});
 };
 try{
  const script=new URL('../scripts/dual-model-diagnostics.mjs',import.meta.url);
  // Execute the real script, relocating only imports and generated output.
  const source=fs.readFileSync(script,'utf8').replace(/from '([^']+)'/g,(_match,specifier)=>'from '+JSON.stringify(specifier.startsWith('.')?new URL(specifier,script).href:import.meta.resolve(specifier)))
   .replace("new URL('../artifacts/',import.meta.url)",JSON.stringify(directory))
   .replace("new URL('../artifacts/dual-model-live.json',import.meta.url)",JSON.stringify(join(directory,'result.json')));
  await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.equal(JSON.parse(fs.readFileSync(join(directory,'result.json'))).ok,true);
  assert.equal(requests.length,2);assert.equal(requests[0].max_tokens,6000);assert.equal(requests[1].max_tokens,256);
  assert.equal(requests[1].stream,false);assert.deepEqual(requests[1].thinking,{type:'disabled'});
  assert.deepEqual(requests[1].response_format,{type:'json_object'});
  assert.ok(!JSON.stringify(requests[1]).includes('image_url'));
 }finally{
  globalThis.fetch=oldFetch;for(const key of Object.keys(values))if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];
  fs.rmSync(directory,{recursive:true,force:true});
 }
});
