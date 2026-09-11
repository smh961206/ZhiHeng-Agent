import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisionModelCatalog} from '../server/model-catalog.mjs';
import {readVisionResult} from '../server/vision-model.mjs';
import {createJobModelState,withJobModelState} from '../server/model-state.mjs';
import {visionSimulationEnv} from '../scripts/vision-benchmark.mjs';
const env=visionSimulationEnv,catalog=createVisionModelCatalog(env),images=[{page:1,dataUrl:'data:image/png;base64,AA=='}];
const base={env,catalog,profileId:'vision-challenger',fallbackProfileId:'legacy-vision',qualityApproved:true,prompt:'read'};
const good=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'unreadable; values remain missing'}}]});
test('Vision provider/format failures permit one independent same-image fallback with actual attribution',async()=>{
 for(const primary of [()=>new Response('private',{status:503}),()=>new Response('private',{status:429}),()=>Response.json({choices:[]}),()=>{throw new TypeError('network');}]){
  const requests=[];
  const result=await readVisionResult(images,{...base,fetcher:async(url,options)=>{requests.push({host:url.hostname,body:JSON.parse(options.body)});return requests.length===1?primary():good();}});
  assert.equal(requests.length,2);assert.equal(result.profile,'legacy-vision');assert.equal(result.extraction.needsReview,true);
  assert.deepEqual(requests[0].body.messages,requests[1].body.messages);assert.equal(result.attempts.length,2);
  assert.equal(result.attempts[0].status,'failed');assert.doesNotMatch(JSON.stringify(result),/private/);
 }
});
test('unreadable completed output, refusal, partial output, auth, cancellation and repeated outage never cycle',async()=>{
 for(const [response,expectedCalls] of [[good,1],[()=>new Response('secret',{status:401}),1],[()=>Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]}),1],[()=>Response.json({choices:[{finish_reason:'stop',message:{refusal:'no'}}]}),1],[()=>new Response('outage',{status:503}),2]]){
  let calls=0;try{await readVisionResult(images,{...base,fetcher:async()=>{calls++;return response();}});}catch{}
  assert.equal(calls,expectedCalls);
 }
 let calls=0;const control=new AbortController();
 await assert.rejects(readVisionResult(images,{...base,signal:control.signal,fetcher:async()=>{calls++;control.abort();return new Response('',{status:503});}}));assert.equal(calls,1);
 await assert.rejects(readVisionResult(images,{...base,qualityApproved:false,fetcher:async()=>assert.fail('unapproved')}),{category:'configuration'});
});
test('saved job Vision pins prevent fallback or a candidate request before dispatch',async()=>{
 // withJobModelState uses process configuration; preserve it exactly around this isolated test.
 const saved={...process.env};Object.assign(process.env,env);
 try{
  const job={modelState:createJobModelState(process.env)};let calls=0;
  await withJobModelState(job,async()=>{
   await assert.rejects(readVisionResult(images,{...base,fetcher:async()=>{calls++;return good();}}),{code:'model_state_incompatible'});
   await assert.rejects(readVisionResult(images,{...base,profileId:'legacy-vision',fallbackProfileId:'vision-challenger',fetcher:async()=>{calls++;return new Response('',{status:503});}}),{category:'provider_unavailable'});
  });assert.equal(calls,1);
 }finally{for(const key of Object.keys(process.env))if(!Object.hasOwn(saved,key))delete process.env[key];Object.assign(process.env,saved);}
});
