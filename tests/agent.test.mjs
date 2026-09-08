import test from 'node:test';
import assert from 'node:assert/strict';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
const job={mode:'B',input:{question:'研究测试企业',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'测试资料',text:'合成参数：权益100，股本10；正常化ROE假设10%–20%，PE假设10–15倍。仅测试。',url:'',date:''}]}};
test('模型→工具→结果回传→审计报告闭环（模拟接口）',async()=>{
 const old=global.fetch;let call=0;const events=[];
 global.fetch=async(_url,opts)=>{const body=JSON.parse(opts.body);call++;
  if(call===1)return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'calculate_normalized_earnings',arguments:JSON.stringify({equity:100,shares:10,roeLow:.1,roeHigh:.2,peLow:10,peHigh:15,basis:{currency:'CNY',period:'2025 FY',shareBasis:'普通股一致口径',assumptions:'合成参数，仅测试',sourceIds:['S1']}})}}]}}]});
  if(call===2){const tool=body.messages.find(m=>m.role==='tool');assert.deepEqual(JSON.parse(tool.content).value,[10,30]);return Response.json({choices:[{message:{role:'assistant',content:'测试报告[S1]'}}]});}
  const audit=JSON.parse(body.messages[1].content);
  assert.ok(Array.isArray(audit.initialEvidence));assert.ok(Array.isArray(audit.toolEvidence));
  assert.equal(audit.toolEvidence[0].arguments.equity,100);assert.deepEqual(audit.toolEvidence[0].result.value,[10,30]);
  assert.equal(audit.contextWindow.toolsIncluded,1);
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 try{const result=await runAgent(job,(...e)=>events.push(e),new AbortController().signal);assert.match(result.report,/经审计/);assert.equal(call,3);assert.ok(events.some(e=>e[0]==='tool_result'));const request=events.find(e=>e[0]==='tool');const response=events.find(e=>e[0]==='tool_result');assert.equal(request[2].toolCallId,response[2].toolCallId);assert.equal(request[2].toolName,'calculate_normalized_earnings');assert.equal(job.workflow.stages.find(s=>s.id==='calculation').status,'completed');}finally{global.fetch=old;}
});
test('计算阶段汇总全部调用，最后的成功或失败不覆盖其他结果',async()=>{
 const old=global.fetch;
 try{
  for(const failLast of [true,false]){
   const mixedJob={mode:'B',input:structuredClone(job.input)};let call=0;
   const good={dps:2,basis:{currency:'CNY',period:'2025 FY',shareBasis:'普通股',assumptions:'合成参数',sourceIds:['S1']}};
   const bad={...good,dps:-1};
   global.fetch=async(_url,opts)=>{
    const body=JSON.parse(opts.body);call++;
    if(call===1)return Response.json({choices:[{message:{role:'assistant',tool_calls:(failLast?[good,bad]:[bad,good]).map((args,index)=>({id:`dividend-${index}`,type:'function',function:{name:'calculate_dividend',arguments:JSON.stringify(args)}}))}}]});
    if(call===2)return Response.json({choices:[{message:{role:'assistant',content:'测试草稿，部分计算失败[S1]'}}]});
    const summary=JSON.parse(body.messages[1].content).calculationSummary;
    assert.equal(summary.succeeded,1);assert.equal(summary.failed,1);assert.equal(summary.status,'partial');
    return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(mixedJob.input))}}]});
   };
   const result=await runAgent(mixedJob,()=>{},new AbortController().signal);
   assert.ok(result.report);assert.equal(mixedJob.workflow.stages.find(s=>s.id==='calculation').status,'partial');
  }
 }finally{global.fetch=old;}
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
