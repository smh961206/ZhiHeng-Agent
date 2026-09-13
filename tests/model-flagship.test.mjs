import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlagshipModelCatalog,createLegacyModelCatalog,createModelProfile} from '../server/model-catalog.mjs';
import {flagshipEligibility,classifiedReviewFailure} from '../server/model-flagship.mjs';
const caps={textInput:true,imageInput:false,streaming:false,toolCalling:false,jsonObject:true,jsonSchema:true,reasoningControl:false};
export const flagshipEnv={LLM_FLAGSHIP_REVIEW_MODEL:'explicit-review',LLM_FLAGSHIP_REVIEW_BASE_URL:'https://review.invalid/v1',LLM_FLAGSHIP_REVIEW_API_KEY:'test',LLM_FLAGSHIP_REVIEW_CAPABILITIES:JSON.stringify(caps),LLM_FLAGSHIP_JUDGE_MODEL:'explicit-judge',LLM_FLAGSHIP_JUDGE_BASE_URL:'https://judge.invalid/v1',LLM_FLAGSHIP_JUDGE_API_KEY:'test',LLM_FLAGSHIP_JUDGE_CAPABILITIES:JSON.stringify(caps)};
test('V5.2.0 explicit flagship roles stay outside normal eligibility and default off',()=>{
 assert.equal(createFlagshipModelCatalog({}).profiles.length,0);
 const catalog=createFlagshipModelCatalog(flagshipEnv);assert.equal(catalog.profiles.length,2);
 for(const p of catalog.profiles){assert.equal(p.tier,'FLAGSHIP');assert.ok(Object.isFrozen(p.allow));assert.deepEqual(p.allow,{criticalReview:false,judge:false});assert.deepEqual(createModelProfile(JSON.parse(JSON.stringify(p))),p);assert.ok(!p.purposes.includes('research'));}
 assert.equal(createLegacyModelCatalog(flagshipEnv).profiles.some(p=>p.tier==='FLAGSHIP'),false);
 assert.equal(createFlagshipModelCatalog({...flagshipEnv,FEATURE_JUDGE:'true'}).profiles[1].allow.judge,true);
});
test('V5.2.1 only repeated validated review failures qualify; gaps and provider errors never upgrade',()=>{
 const input={purpose:'critical-review',mode:'B',evidenceSufficient:true,missingData:false,providerFailure:false,toolsPending:false,failures:[0,1].map(attempt=>({attempt,kind:'format',validated:true}))};
 assert.equal(flagshipEligibility(input).eligible,true);
 for(const change of [{mode:'A'},{mode:null},{missingData:true},{missingData:undefined},{evidenceSufficient:false},{providerFailure:true},{toolsPending:true},{failures:[input.failures[0],input.failures[0]]},{failures:[]},{failures:[0,1].map(attempt=>({attempt,kind:'provider',validated:true}))}])assert.equal(flagshipEligibility({...input,...change}).eligible,false);
 assert.equal(flagshipEligibility({...input,failures:[],complexity:'exceptional'}).eligible,false);
 for(const code of ['model_timeout','model_provider_unavailable','model_output_truncated','model_refusal'])assert.equal(classifiedReviewFailure({code},0),null);
 assert.equal(classifiedReviewFailure({code:'review_validation',validationIssues:[{code:'invalid_review_field',path:'decision.dataAsOf'}]},1),null);
 assert.equal(classifiedReviewFailure({code:'review_json'},1).kind,'format');
});
test('V5.2.0 profile shape rejects default-role injection, undeclared capabilities and secret fields',()=>{
 const p=JSON.parse(JSON.stringify(createFlagshipModelCatalog(flagshipEnv).profiles[1]));
 for(const mutate of [p=>p.purposes=['research'],p=>p.allow.criticalReview=true,p=>p.apiKey='secret',p=>p.capabilities.toolCalling=true,p=>p.capabilities.textInput=null,p=>p.id='main']){const copy=structuredClone(p);mutate(copy);assert.throws(()=>createModelProfile(copy));}
 assert.throws(()=>createFlagshipModelCatalog({LLM_FLAGSHIP_JUDGE_MODEL:'not-a-capability-declaration'}));
});
