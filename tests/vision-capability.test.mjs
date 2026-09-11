import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGatewayBoundary,readSource} from '../scripts/check-model-call-inventory.mjs';
import {visionStatus,readVisionImages} from '../server/vision-model.mjs';
test('all Vision business owners reject concrete model and thinking branches',()=>{
 for(const file of ['server/vision-model.mjs','server/document-reader.mjs','server/material-vision.mjs','server/visual-reading.mjs','server/agent-page-reader.mjs','server/pdf-extractor.mjs','server/pdf-processing.mjs']){
  for(const suffix of ["\nif(model==='custom-image'){}", "\nconst thinking={type:'disabled'};"]){
   assert.throws(()=>validateGatewayBoundary({read:p=>readSource(p)+(p===file?suffix:'')}),/Vision business capability/);
  }
 }
});
test('opaque configured image model uses explicit capability while adapter keeps compatible wire defaults',async()=>{
 const env={LLM_VISION_MODEL:'opaque-model',LLM_VISION_INPUT:'images',LLM_VISION_API_KEY:'synthetic',LLM_VISION_BASE_URL:'https://vision.invalid'};
 assert.equal(visionStatus({...env,LLM_VISION_INPUT:'auto'}).enabled,false);
 assert.equal(visionStatus(env).enabled,true);
 const text=await readVisionImages([{page:1,dataUrl:'data:image/jpeg;base64,AA=='}],{env,prompt:'read',fetcher:async(_url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.model,'opaque-model');assert.equal(body.thinking,undefined);
  return Response.json({choices:[{finish_reason:'stop',message:{content:'unverified'}}]});
 }});
 assert.equal(text,'unverified');
});
