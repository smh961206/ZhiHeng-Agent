import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.mjs';
const job={mode:'B',input:{question:'研究测试企业',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'测试资料',text:'测试参数：PE=12.5，ROE=25%。仅测试。',url:'',date:''}]}};
test('模型→工具→结果回传→审计报告闭环（模拟接口）',async()=>{
 const old=global.fetch;let call=0;const events=[];
 global.fetch=async(_url,opts)=>{const body=JSON.parse(opts.body);call++;
  if(call===1)return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'calculate_p2',arguments:JSON.stringify({pe:12.5,roe:.25,qualityVerified:true,basisVerified:true})}}]}}]});
  if(call===2){const tool=body.messages.find(m=>m.role==='tool');assert.equal(JSON.parse(tool.content).ordinary,.5);return Response.json({choices:[{message:{role:'assistant',content:'测试报告[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify({report:'经审计测试报告[S1]，数据不足。',audit:'仅模拟测试。'})}}]});
 };
 try{const result=await runAgent(job,(...e)=>events.push(e),new AbortController().signal);assert.match(result.report,/经审计/);assert.equal(call,3);assert.ok(events.some(e=>e[0]==='tool_result'));}finally{global.fetch=old;}
});
test('不存在的引用ID阻止发布',async()=>{
 const old=global.fetch;let calls=0;
 global.fetch=async()=>Response.json({choices:[{message:{role:'assistant',content:++calls===1?'草稿':JSON.stringify({report:'虚假引用[S99]',audit:'通过'})}}]});
 try{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/不存在/);}finally{global.fetch=old;}
});
test('空审计阻止发布，API错误明确返回',async()=>{
 const old=global.fetch;global.fetch=async()=>new Response('',{status:401});
 try{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/HTTP 401/);}finally{global.fetch=old;}
});
