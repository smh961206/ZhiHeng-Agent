import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReviewResponse,reviewJsonSchema,reviewResponseFormat,unsupportedReviewFormat} from '../server/review-format.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {completion,runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const input={mode:'B',question:'合成审计格式测试',depth:'Deep',sources:[{id:'S1',title:'合成资料',text:'仅用于测试的证据'}]};
const plan=createResearchPlan(input,'B');
const response=content=>Response.json({choices:[{message:{role:'assistant',content}}]});

test('review schema uses the actual mode, enum values, required keys and nullable scores',()=>{
 for(const mode of ['A','B','C','D','E','F']){
  const current=createResearchPlan({...input,mode},mode),schema=reviewJsonSchema(current);
  assert.deepEqual(schema.properties.decision.properties.action.enum,current.output.actions);
  assert.deepEqual(schema.properties.sections.items.properties.id.enum,current.output.sections.map(item=>item.id));
  const check=value=>{
   if(value.type==='object'){assert.equal(value.additionalProperties,false);assert.deepEqual(value.required,Object.keys(value.properties));Object.values(value.properties).forEach(check);}
   if(value.type==='array')check(value.items);
  };check(schema);
 }
 assert.deepEqual(reviewJsonSchema(plan).properties.decision.properties.scores.items.properties.score.type,['number','null']);
 assert.equal(reviewResponseFormat(plan,'auto').json_schema.strict,true);
 assert.equal(reviewResponseFormat(plan,'json_object').type,'json_object');
 assert.equal(reviewResponseFormat(plan,'text'),undefined);
 assert.throws(()=>reviewResponseFormat(plan,'invalid'),/LLM_REVIEW_FORMAT/);
});

test('JSON normalization preserves Markdown, values and references without inventing content',()=>{
 const value={sections:[{id:'valuation',text:'中文标题\n\n| 指标 | 值 |\n|---|---|\n| 现金 | 1.25 [S1] |\n引用"原文"，符号 }, ]，路径 C:\\reports'}],score:null,number:-1.25e3};
 assert.deepEqual(parseReviewResponse({content:JSON.stringify(value)}).value,value);
 const fenced=parseReviewResponse({content:' \n```JSON\n'+JSON.stringify(value)+'\n```\n'});
 assert.deepEqual(fenced.value,value);assert.deepEqual(fenced.normalizations,['code_fence']);
 const repaired=parseReviewResponse({content:'{"text":"第一行\n第二行\t[S1]，字符 }, ]", "items":[1,2,],}'});
 assert.deepEqual(repaired.value,{text:'第一行\n第二行\t[S1]，字符 }, ]',items:[1,2]});
 assert.deepEqual(repaired.normalizations,['string_whitespace','trailing_comma']);
});

test('truncated, ambiguous, non-object and refused responses cannot become published reviews',()=>{
 for(const content of ['','{"audit":"未完成','{"audit":"未转义的"引号""}','{"audit":"one"} {"audit":"two"}','说明：{"audit":"正文"}','[]','null','"string"','{"score":NaN}']){
  assert.throws(()=>parseReviewResponse({content}),error=>error.code==='review_json'&&error.validationIssues[0].code==='invalid_review_json');
 }
 assert.throws(()=>parseReviewResponse({refusal:'no',content:'{}'}),error=>error.code==='model_refusal');
 try{parseReviewResponse({content:'{\n"a": 1 "b":2}'});}catch(error){assert.equal(error.validationIssues[0].line,2);assert.ok(error.validationIssues[0].column>0);}
});

test('only explicit provider format incompatibility permits fallback',()=>{
 const format=reviewResponseFormat(plan,'auto');
 assert.equal(unsupportedReviewFormat(400,{error:{param:'response_format',message:'json_schema is not supported'}},format),true);
 assert.equal(unsupportedReviewFormat(422,{error:{param:'response_format',code:'unsupported_parameter'}},format),true);
 assert.equal(unsupportedReviewFormat(400,{error:{message:'This response_format type is unavailable now',type:'invalid_request_error',param:null,code:'invalid_request_error'}},format),true);
 assert.equal(unsupportedReviewFormat(400,{error:{message:'Model is unavailable now'}},format),false);
 assert.equal(unsupportedReviewFormat(503,{error:{message:'This response_format type is unavailable now'}},format),false);
 for(const [status,message] of [[401,'json_schema is not supported'],[429,'json_schema is not supported'],[400,'Invalid schema: additionalProperties is required'],[400,'context length exceeded']]){
  assert.equal(unsupportedReviewFormat(status,{error:{message}},format),false);
 }
});

test('structured output falls back on capability rejection only and keeps the same evidence',async()=>{
 const old=global.fetch,seen=[],fallbacks=[];
 try{
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);seen.push(body);
   if(body.response_format)return Response.json({error:{message:body.response_format.type+' response_format is not supported'}},{status:400});
   return response('{"audit":"正文"}');
  };
  const messages=[{role:'user',content:'JSON审计资料[S1]'}];
  await completion(messages,undefined,new AbortController().signal,undefined,{responseFormat:reviewResponseFormat(plan,'auto'),allowFormatFallback:true,onFormatFallback:format=>fallbacks.push(format?.type||'text')});
  assert.deepEqual(seen.map(body=>body.response_format?.type||'text'),['json_schema','json_object','text']);
  assert.deepEqual(fallbacks,['json_object','text']);assert.ok(seen.every(body=>JSON.stringify(body.messages)===JSON.stringify(messages)));
  seen.length=0;
  global.fetch=async()=>{seen.push(1);return Response.json({error:{message:'Invalid schema: required field missing'}},{status:400});};
  await assert.rejects(completion(messages,undefined,new AbortController().signal,undefined,{responseFormat:reviewResponseFormat(plan,'auto'),allowFormatFallback:true}),/HTTP 400/);
  assert.equal(seen.length,1);
 }finally{global.fetch=old;}
});

test('DeepSeek unavailable format response recovers quick-screen review without restarting research',async()=>{
 const old=global.fetch,seen=[],events=[];
 const quickInput={...structuredClone(input),mode:'A',depth:'Quick'},job={mode:'A',input:quickInput};
 try{
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);seen.push(body);
   if(seen.length===1)return response('合成快筛草稿[S1]');
   if(seen.length===2)return Response.json({error:{message:'This response_format type is unavailable now',type:'invalid_request_error',param:null,code:'invalid_request_error'}},{status:400});
   assert.equal(body.response_format.type,'json_object');
   assert.deepEqual(body.messages,seen[1].messages,'Fallback must preserve the original review evidence and draft');
   return response(JSON.stringify(reviewFixture(quickInput)));
  };
  const result=await runAgent(job,(type,message,details)=>events.push({type,message,...details}),new AbortController().signal);
  assert.ok(result.report);assert.equal(seen.length,3);
  assert.equal(job.workflow.stages.find(stage=>stage.id==='review').status,'completed');
  assert.equal(events.filter(event=>event.type==='audit_format'&&event.format==='json_object').length,1);
  assert.equal(events.filter(event=>event.type==='audit_validation').length,0,'Transport fallback must not spend evidence repair attempts');
 }finally{global.fetch=old;}
});

test('format recovery does not consume the one evidence-validation repair',async()=>{
 const old=global.fetch,events=[];let calls=0;
 const job={mode:'B',input:structuredClone(input)};
 try{
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);calls++;
   if(calls===1){assert.equal(body.response_format,undefined);return response('合成草稿[S1]');}
   assert.equal(body.response_format.type,'json_schema');
   if(calls===2)return response('{"audit":"截断');
   if(calls===3){
    assert.match(body.messages.at(-1).content,/格式或传输问题/);
    const invalid=reviewFixture(input);invalid.decision.dataAsOf='2026/09/07';return response(JSON.stringify(invalid));
   }
   assert.match(body.messages.at(-1).content,/数据截止日期无效/);
   return response(JSON.stringify(reviewFixture(input)));
  };
  const result=await runAgent(job,(type,message,details)=>events.push({type,message,...details}),new AbortController().signal);
  assert.ok(result.report);assert.equal(calls,4);
  assert.deepEqual(events.filter(e=>e.type==='audit_validation').map(e=>e.category),['format','validation']);
 }finally{global.fetch=old;}
});

test('repeated invalid JSON stops within budget and never publishes a partial object',async()=>{
 const old=global.fetch,events=[];let calls=0;const job={mode:'B',input:structuredClone(input)};
 try{
  global.fetch=async()=>response(++calls===1?'草稿[S1]':'{"audit":"截断');
  await assert.rejects(runAgent(job,(type,message,details)=>events.push({type,message,...details}),new AbortController().signal),/审计输出格式处理失败，报告未发布/);
  assert.equal(calls,4);assert.equal(job.result,undefined);assert.equal(job.draft,'草稿[S1]');
  assert.equal(events.filter(e=>e.type==='audit_validation').length,3);assert.equal(events.at(-1).retryable,false);
 }finally{global.fetch=old;}
});

test('normalizing JSON punctuation still enforces source and decision checks',async()=>{
 const old=global.fetch;let calls=0;const job={mode:'B',input:structuredClone(input)};
 const invalid=reviewFixture(input);invalid.audit+=' [S99]';
 try{
  global.fetch=async()=>response(++calls===1?'草稿[S1]':JSON.stringify(invalid).replace(/}$/,',}'));
  await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/审计未通过.*不存在/);
  assert.equal(calls,3);assert.equal(job.result,undefined);
 }finally{global.fetch=old;}
});

test('truncated audit transport retries only audit, authentication failures and refusals stop',async()=>{
 const old=global.fetch;
 try{
  for(const failure of ['length','http','refusal']){
   let calls=0;const job={mode:'B',input:structuredClone(input)};
   global.fetch=async()=>{
    calls++;
    if(calls===1)return response('草稿[S1]');
    if(calls===2){
     if(failure==='http')return new Response('',{status:401});
     if(failure==='refusal')return Response.json({choices:[{message:{role:'assistant',refusal:'no'}}]});
     return Response.json({choices:[{message:{role:'assistant',content:'{"audit":'},finish_reason:'length'}]});
    }
    return response(JSON.stringify(reviewFixture(input)));
   };
   if(failure==='length'){assert.ok((await runAgent(job,()=>{},new AbortController().signal)).report);assert.equal(calls,3);}
   else{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),failure==='http'?/HTTP 401/:/未能完成审计/);assert.equal(calls,2);}
  }
 }finally{global.fetch=old;}
});
