import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisionModelCatalog,createModelProfile} from '../server/model-catalog.mjs';
import {readVisionResult} from '../server/vision-model.mjs';
const env={LLM_VISION_CHALLENGER_MODEL:'opaque-candidate',LLM_VISION_CHALLENGER_PROVIDER:'operator-declared',LLM_VISION_CHALLENGER_INPUT:'images',LLM_VISION_CHALLENGER_BASE_URL:'https://challenger.invalid',LLM_VISION_CHALLENGER_API_KEY:'candidate-secret'};
const images=[{page:1,dataUrl:'data:image/png;base64,AA=='}];
test('Vision challenger has an independent explicit capability/connection and cannot inherit analysis secrets',async()=>{
 const catalog=createVisionModelCatalog(env);assert.equal(catalog.profiles.at(-1).tier,'VISION');
 assert.doesNotMatch(JSON.stringify(catalog),/candidate-secret|challenger\.invalid/);
 for(const thinking of ['omit','disabled']){
  const configured={...env,LLM_VISION_CHALLENGER_THINKING:thinking};
  const response=await readVisionResult(images,{env:configured,catalog:createVisionModelCatalog(configured),profileId:'vision-challenger',prompt:'read',fetcher:async(url,options)=>{
   assert.equal(url.hostname,'challenger.invalid');assert.equal(options.headers.Authorization,'Bearer candidate-secret');
   const body=JSON.parse(options.body);assert.equal(body.model,'opaque-candidate');assert.deepEqual(body.thinking,thinking==='omit'?undefined:{type:'disabled'});
   return Response.json({choices:[{finish_reason:'stop',message:{content:'read'}}]});
  }});assert.equal(response.profile,'vision-challenger');assert.equal(response.extraction.needsReview,true);
 }
 await assert.rejects(readVisionResult(images,{env:{...env,LLM_VISION_CHALLENGER_API_KEY:'',LLM_API_KEY:'analysis-secret'},catalog,profileId:'vision-challenger',prompt:'read',fetcher:async()=>assert.fail('no key fallback')}),{category:'configuration'});
});
test('candidate image support is explicit and version-3 profiles reject other purposes or wire options',async()=>{
 const catalog=createVisionModelCatalog({...env,LLM_VISION_CHALLENGER_INPUT:'auto'});
 await assert.rejects(readVisionResult(images,{env,catalog,profileId:'vision-challenger',prompt:'read',fetcher:async()=>assert.fail('unknown capability')}),{category:'unsupported_capability'});
 for(const change of [p=>p.purposes=['research'],p=>p.adapterOptions.thinking='enabled',p=>p.connectionRef='legacy-analysis']){
  const profile=structuredClone(createVisionModelCatalog(env).profiles.at(-1));change(profile);assert.throws(()=>createModelProfile(profile));
 }
});
