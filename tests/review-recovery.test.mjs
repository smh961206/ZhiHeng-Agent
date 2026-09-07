import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {validateReview} from '../server/research-output.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const input={mode:'B',question:'合成交付修正测试',depth:'Deep',sources:[{id:'S1',title:'合成证据',text:'仅用于软件测试。'}]};
const context={input,plan:createResearchPlan(input),sources:input.sources};
const reply=content=>Response.json({choices:[{message:{role:'assistant',content}}]});

test('independent action, date, score and citation failures are returned together without mutating the review',()=>{
 const value=reviewFixture(input);value.decision.action='观察或买入';value.decision.dataAsOf='2026-02-30';
 value.decision.scores[0].score=999;value.audit+=' [S99]';const original=structuredClone(value);
 assert.throws(()=>validateReview(value,context),error=>{
  for(const path of ['decision.action','decision.dataAsOf','decision.scores','audit'])assert.ok(error.validationIssues.some(issue=>issue.path===path),path);
  assert.equal(error.code,'review_validation');return true;
 });
 assert.deepEqual(value,original);
});

test('malformed dependent fields produce actionable validation errors and no partial report',()=>{
 for(const value of [null,[],{}, {audit:'测试',sections:[null],decision:{gates:[null],scores:[null]}}, {...reviewFixture(input),researchSummary:{checks:[null,null,null]}}]){
  assert.throws(()=>validateReview(value,context),error=>error.code==='review_validation'&&error.validationIssues.every(issue=>typeof issue.path==='string'&&!/Cannot read/.test(issue.message)));
 }
});

test('limited evidence can be delivered conservatively, while failed gates and unsupported confidence still block',()=>{
 const value=reviewFixture(input);assert.ok(validateReview(value,context).report);
 value.decision.gates[0].status='failed';value.decision.confidence='高';
 assert.throws(()=>validateReview(value,context),error=>/未通过/.test(error.message)&&/降低置信度/.test(error.message));
 assert.equal(value.decision.gates[0].status,'failed');assert.equal(value.decision.confidence,'高');
});

test('one repair receives every independent issue and retains the structured output constraint',async()=>{
 const old=global.fetch,events=[];let calls=0;
 try{
  global.fetch=async(_url,options)=>{
   calls++;const body=JSON.parse(options.body);
   if(calls===1)return reply('合成草稿[S1]');
   assert.equal(body.response_format.type,'json_schema');
   const value=reviewFixture(input);
   if(calls===2){value.decision.action='不在选项中';value.decision.dataAsOf='2026/09/07';value.audit+=' [S99]';}
   else for(const pattern of [/研究动作/,/数据截止日期/,/不存在的资料ID/])assert.match(body.messages.at(-1).content,pattern);
   return reply(JSON.stringify(value));
  };
  const result=await runAgent({mode:'B',input:structuredClone(input)},(type,message,details)=>events.push({type,message,...details}),new AbortController().signal);
  assert.ok(result.report);assert.equal(calls,3);assert.equal(events.filter(event=>event.type==='audit_validation').length,1);
 }finally{global.fetch=old;}
});

test('a progressing correction gets a second repair; repeated identical problems stop early',async()=>{
 const old=global.fetch;
 try{
  for(const repeated of [false,true]){
   let calls=0;const events=[];
   global.fetch=async()=>{
    calls++;if(calls===1)return reply('合成草稿[S1]');const value=reviewFixture(input);
    if(calls===2||repeated)value.decision.action='不在选项中';
    else if(calls===3)value.decision.dataAsOf='2026/09/07';
    return reply(JSON.stringify(value));
   };
   const task=runAgent({mode:'B',input:structuredClone(input)},(type,message,details)=>events.push({type,message,...details}),new AbortController().signal);
   if(repeated){await assert.rejects(task,/审计未通过/);assert.equal(calls,3);assert.match(events.at(-1).stopReason,/相同问题/);}
   else{assert.ok((await task).report);assert.equal(calls,4);}
  }
 }finally{global.fetch=old;}
});

test('changing failures also stop at the validation budget, never publishing an invalid report',async()=>{
 const old=global.fetch;let calls=0;const events=[];
 try{
  global.fetch=async()=>{
   calls++;if(calls===1)return reply('草稿[S1]');const value=reviewFixture(input);
   if(calls===2)value.decision.action='无效';else if(calls===3)value.decision.dataAsOf='日期未知';else value.audit+=' [S99]';
   return reply(JSON.stringify(value));
  };
  await assert.rejects(runAgent({mode:'B',input:structuredClone(input)},(type,message,details)=>events.push({type,message,...details}),new AbortController().signal),/不存在/);
  assert.equal(calls,4);assert.match(events.at(-1).stopReason,/次数已用完/);
 }finally{global.fetch=old;}
});
