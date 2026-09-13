import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIndependentContext} from '../server/research-context.mjs';
import {executeFlagshipSession} from '../server/model-flagship.mjs';
import {createFlagshipModelCatalog} from '../server/model-catalog.mjs';
const source={id:'S1',text:'Synthetic known evidence. Counter evidence stays present.',publishedAt:'2026-09-01T00:00:00Z',documentBlocks:[{id:'b1',text:'Synthetic known evidence. Counter evidence stays present.'}]};
const input=()=>buildIndependentContext({cutoff:'2026-09-02T00:00:00Z',sources:[source],evidence:[{id:'S1',blockId:'b1',text:source.text,reasoning_content:'PRIVATE'}],conclusions:['Completed draft.']});
const profile=createFlagshipModelCatalog({FEATURE_FLAGSHIP_REVIEW:'true',LLM_FLAGSHIP_REVIEW_MODEL:'configured',LLM_FLAGSHIP_REVIEW_CAPABILITIES:JSON.stringify({textInput:true,imageInput:false,streaming:false,toolCalling:false,jsonObject:true,jsonSchema:true,reasoningControl:false})}).profiles[0];
test('V5.2.2 independent context retains both sides and rejects unknown/future/forged evidence',()=>{
 assert.ok(!JSON.stringify(input()).includes('PRIVATE'));
 for(const s of [{...source,publishedAt:null},{...source,publishedAt:'2026-09-03T00:00:00Z'},{...source,truncated:true},{...source,documentBlocks:[{id:'b1',text:'unrelated'}]}])assert.throws(()=>buildIndependentContext({cutoff:'2026-09-02',sources:[s],evidence:[{id:'S1',blockId:'b1',text:source.text}],conclusions:['Draft']}));
});
test('V5.2.2 durable independent review completes once and revalidates saved conclusion on resume',async()=>{
 const job={modelState:{original:true}},events=[];
 const options={job,purpose:'critical-review',input:input(),profile,connectionIdentity:'a'.repeat(64),reason:'repeated_review_failure',complete:async packet=>{events.push('dispatch');assert.ok(!packet.messages);return {answer:'completed',reasoning_content:'PRIVATE'};},validate:v=>{assert.equal(v.answer,'completed');return v;},persist:async()=>events.push(job.flagshipState.sessions.review.status)};
 await executeFlagshipSession(options);await executeFlagshipSession({...options,job:JSON.parse(JSON.stringify(job))});
 assert.deepEqual(events,['reserved','dispatch','completed']);assert.deepEqual(job.modelState,{original:true});assert.ok(!JSON.stringify(job).includes('PRIVATE'));
 await assert.rejects(executeFlagshipSession({...options,input:{...input(),cutoff:'2026-09-04'}}),{code:'flagship_state_incompatible'});
 await assert.rejects(executeFlagshipSession({...options,job:{...structuredClone(job),id:'other-job'}}),{code:'flagship_state_incompatible'});
});
test('V5.2.2 interrupted, rejected and unacknowledged saves cannot replay a completed request',async()=>{
 for(const stage of ['reserve','call','validate','settle']){
  let calls=0;const job={};const options={job,purpose:'critical-review',input:input(),profile,connectionIdentity:'a'.repeat(64),reason:'repeated_review_failure',complete:async()=>{calls++;if(stage==='call')throw Error('transport');return {answer:'completed'};},validate:v=>{if(stage==='validate')throw Error('invalid');return v;},persist:async()=>{if(stage==='reserve'||stage==='settle'&&job.flagshipState.sessions.review.status==='completed')throw Error('save');}};
  await assert.rejects(executeFlagshipSession(options));
  const recovered=JSON.parse(JSON.stringify(job));if(stage==='settle'){recovered.flagshipState.sessions.review={...recovered.flagshipState.sessions.review,status:'reserved'};}
  await assert.rejects(executeFlagshipSession({...options,job:recovered,persist:async()=>{}}));assert.equal(calls,stage==='reserve'?0:1);
 }
});
