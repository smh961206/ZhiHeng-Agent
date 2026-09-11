import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisionRequest,readVisionImages} from '../server/vision-model.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
const image={page:2,region:'whole',dataUrl:'data:image/png;base64,AA=='};
const env={LLM_API_KEY:'synthetic',LLM_BASE_URL:'https://vision.invalid'};
test('canonical Vision requests preserve page/crop identity without sharing caller mutations',()=>{
 const images=[{...image}],request=createVisionRequest(images,{prompt:'read'});
 images[0].page=9;images[0].dataUrl='changed';
 assert.equal(request.purpose,'vision');assert.deepEqual(request.requiredCapabilities,['imageInput']);
 assert.deepEqual(request.messages[1].content.slice(1),[{type:'text',text:'原件第 2 页 · whole'},{type:'image_url',image_url:{url:image.dataUrl,detail:'high'}}]);
 assert.equal(request.maxOutputTokens,6000);assert.equal(request.stream,false);
});
test('invalid original image metadata and remote image URLs fail before model dispatch',async()=>{
 let calls=0;
 for(const images of [null,[],Array(13).fill(image),[{...image,page:0}],[{...image,page:1.5}],[{...image,region:4}],[{...image,dataUrl:'https://external.invalid/private'}],Array(1)]){
  await assert.rejects(readVisionImages(images,{env,prompt:'read',fetcher:async()=>{calls++;}}));
 }
 assert.equal(calls,0);
});
test('Gateway explicit required capabilities reject unknown, false and malformed requirements before dispatch',async()=>{
 let calls=0;const catalog=createLegacyModelCatalog(env);
 const gateway=createModelGateway({env,catalog,fetchImpl:async()=>{calls++;}});
 for(const requiredCapabilities of [[],['imageInput','imageInput'],['other'],[null],Array(1),null])await assert.rejects(gateway.complete({...createVisionRequest([image],{prompt:'read'}),requiredCapabilities}),{category:'invalid_request'});
 for(const capability of ['jsonSchema','toolCalling'])await assert.rejects(gateway.complete({...createVisionRequest([image],{prompt:'read'}),requiredCapabilities:[capability]}),{category:'unsupported_capability'});
 assert.equal(calls,0);
});
test('Vision Gateway disallows assistant/tool continuations and images outside user messages',async()=>{
 const gateway=createModelGateway({env,fetchImpl:async()=>assert.fail('must not dispatch')});
 const base=createVisionRequest([image],{prompt:'read'});
 for(const message of [{role:'assistant',content:'private'},{role:'tool',content:'value'}, {...base.messages[1],role:'system'},{...base.messages[1],reasoning_content:'private'}])await assert.rejects(gateway.complete({...base,messages:[message]}),{category:'invalid_request'});
});
