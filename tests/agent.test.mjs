import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
const job={mode:'B',input:{question:'研究测试企业',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'测试资料',text:'测试参数：PE=12.5，ROE=25%。仅测试。',url:'',date:''}]}};
test('模型→工具→结果回传→审计报告闭环（模拟接口）',async()=>{
 const old=global.fetch;let call=0;const events=[];
 global.fetch=async(_url,opts)=>{const body=JSON.parse(opts.body);call++;
  if(call===1)return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'calculate_p2',arguments:JSON.stringify({pe:12.5,roe:.25,qualityVerified:true,basisVerified:true,basis:{currency:'CNY',period:'2025 FY',shareBasis:'普通股一致口径',assumptions:'合成参数，仅测试',sourceIds:['S1']}})}}]}}]});
  if(call===2){const tool=body.messages.find(m=>m.role==='tool');assert.equal(JSON.parse(tool.content).ordinary,.5);return Response.json({choices:[{message:{role:'assistant',content:'测试报告[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 try{const result=await runAgent(job,(...e)=>events.push(e),new AbortController().signal);assert.match(result.report,/经审计/);assert.equal(call,3);assert.ok(events.some(e=>e[0]==='tool_result'));const request=events.find(e=>e[0]==='tool');const response=events.find(e=>e[0]==='tool_result');assert.equal(request[2].toolCallId,response[2].toolCallId);assert.equal(request[2].toolName,'calculate_p2');assert.equal(job.workflow.stages.find(s=>s.id==='calculation').status,'completed');}finally{global.fetch=old;}
});
test('不存在的引用ID阻止发布',async()=>{
 const old=global.fetch;let calls=0;
 global.fetch=async()=>Response.json({choices:[{message:{role:'assistant',content:++calls===1?'草稿':JSON.stringify(reviewFixture(job.input,'S99'))}}]});
 try{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/不存在/);}finally{global.fetch=old;}
});
test('空审计阻止发布，API错误明确返回',async()=>{
 const old=global.fetch;global.fetch=async()=>new Response('',{status:401});
 try{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/HTTP 401/);}finally{global.fetch=old;}
});
