import test from 'node:test';
import assert from 'node:assert/strict';
import {readVisionResult,readVisionImages} from '../server/vision-model.mjs';
const env={LLM_API_KEY:'synthetic-secret',LLM_BASE_URL:'https://model.invalid'};
const images=[{page:3,region:'crop',dataUrl:'data:image/png;base64,AA=='}];
const reply=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'  unverified  ',reasoning_content:'hidden-private'}}],usage:{prompt_tokens:12,completion_tokens:5,total_tokens:17}});
test('canonical Vision response reports actual identity, nullable usage and unverified extraction without private payload',async()=>{
 const result=await readVisionResult(images,{env,prompt:'secret prompt',fetcher:async()=>reply()});
 assert.equal(result.text,'unverified');assert.equal(result.profile,'legacy-vision');assert.equal(result.provider,null);
 assert.equal(result.usage.totalTokens,17);assert.equal(result.billing,null);
 assert.deepEqual(result.extraction.pages,[3]);assert.equal(result.extraction.trust,'unverified');assert.equal(result.extraction.needsReview,true);
 assert.match(result.extraction.images[0].sha256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(JSON.stringify(result),/base64|hidden-private|synthetic-secret|secret prompt|model\.invalid/);
 assert.equal(await readVisionImages(images,{env,prompt:'read',fetcher:async()=>reply()}),result.text);
});
test('Vision response captures image identity before caller mutation and never fabricates absent counters',async()=>{
 const input=structuredClone(images);
 const result=await readVisionResult(input,{env,prompt:'read',fetcher:async()=>{input[0].page=9;input[0].dataUrl='changed';return Response.json({choices:[{finish_reason:'stop',message:{content:'read'}}]});}});
 assert.deepEqual(result.extraction.pages,[3]);assert.equal(result.extraction.images[0].page,3);
 assert.equal(result.usage.totalTokens,null);assert.equal(result.billing,null);
});
test('canonical Vision errors are normalized and never return a partial extraction',async()=>{
 for(const [fetcher,category] of [[async()=>new Response('private provider',{status:429}),'rate_limit'],[async()=>Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]}),'truncated']]){
  await assert.rejects(readVisionResult(images,{env,prompt:'read',fetcher}),error=>error.category===category&&!JSON.stringify(error).includes('private provider'));
 }
 await assert.rejects(readVisionResult([],{env,prompt:'read'}),{category:'invalid_request'});
 await assert.rejects(readVisionResult(images,{env:{},prompt:'read'}),{category:'configuration'});
});
