import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {deepResearchProgress,deepResearchCopy} from '../shared/deep-research.mjs';
import {normalizedEarnings} from '../server/normalized-earnings.mjs';
import {runAgent,toolsForMode} from '../server/agent.mjs';
import {validateReview} from '../server/research-output.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const input={mode:'B',question:'合成深度研究',depth:'Deep',securities:[],sources:[{id:'S1',type:'financial-report',title:'合成资料',text:'测试普通股权益与股本口径。'}]};
const args={equity:1000,shares:100,roeLow:.1,roeHigh:.2,peLow:10,peHigh:20,price:15};
test('正常化盈利工具计算区间与负安全边际，缺价格不猜测',()=>{
 const result=normalizedEarnings(args);
 assert.deepEqual(result.profit,[100,200]);assert.deepEqual(result.eps,[1,2]);assert.deepEqual(result.value,[10,40]);assert.deepEqual(result.margin,[-.5,.625]);
 assert.equal(normalizedEarnings({...args,price:undefined}).margin,null);
 for(const bad of [{equity:0},{shares:0},{roeHigh:20},{roeLow:.3},{peLow:30},{price:NaN},{shares:Number.MIN_VALUE}])assert.throws(()=>normalizedEarnings({...args,...bad}));
 assert.ok(toolsForMode('B').some(t=>t.function.name==='calculate_normalized_earnings'));
 assert.ok(!toolsForMode('A').some(t=>t.function.name==='calculate_normalized_earnings'));
});
test('MODE B计划要求问题、模型分歧及跟踪，摘要拒绝伪来源并兼容旧协议',()=>{
 const plan=createResearchPlan(input);
 for(const id of ['thesis','synthesis','monitoring'])assert.ok(plan.output.sections.some(s=>s.id===id));
 assert.match(plan.researchApproach.scope.period,/完整年度.*单季/);
 assert.match(plan.constraints.join(' '),/汇率.*来源和日期/);
 assert.match(deepResearchCopy.example,/比亚迪A股.*普通股权益/);
 const review=reviewFixture(input);
 const validate=value=>validateReview(value,{input,plan,sources:input.sources});
 assert.ok(validate(review).researchSummary.checks.length);
 const absent=structuredClone(review);delete absent.researchSummary;
 assert.throws(()=>validate(absent),/判断摘要/);
 assert.doesNotThrow(()=>validateReview(absent,{input,plan:{...plan,contractVersion:3},sources:input.sources}));
 const wrong=structuredClone(review);wrong.researchSummary.checks[0].sourceIds=['S99'];assert.throws(()=>validate(wrong),/无效证据来源/);
 const ungrounded=structuredClone(review);ungrounded.researchSummary.checks[0]={topic:'盈利',assessment:'确定增长',unresolved:'无',sourceIds:[]};assert.throws(()=>validate(ungrounded),/没有来源/);
});
test('深度研究状态不把失败、取消和缺正文记录包装为已完成报告',()=>{
 assert.match(deepResearchProgress({status:'failed'},true).text,/尚未形成/);
 assert.match(deepResearchProgress({status:'cancelled'},true).text,/未交付/);
 assert.match(deepResearchProgress({status:'completed'},false).title,/未找到/);
 assert.match(deepResearchProgress({status:'running',workflow:{stages:[{id:'research',status:'running'},{id:'calculation',status:'running'}]}}).title,/计算/);
});
test('模型实际调用正常化工具，审计收到真实返回，导出三段记录',async()=>{
 const previous=global.fetch,job={mode:'B',status:'running',input:structuredClone(input),events:[]};let calls=0;
 try{
  global.fetch=async(_url,options)=>{
   const request=JSON.parse(options.body);calls++;
   if(calls===1){assert.match(request.messages[0].content,/MODE B 深度研究执行要求/);return Response.json({choices:[{message:{role:'assistant',tool_calls:[{id:'normalized-1',type:'function',function:{name:'calculate_normalized_earnings',arguments:JSON.stringify({...args,basis:{currency:'CNY',period:'合成FY',shareBasis:'普通股，金额及股本均为实际单位',assumptions:'合成ROE与PE假设',sourceIds:['S1']}})}}]}}]});}
   if(calls===2){const result=JSON.parse(request.messages.find(m=>m.role==='tool').content);assert.deepEqual(result.value,[10,40]);assert.equal(result.basis.currency,'CNY');return Response.json({choices:[{message:{role:'assistant',content:'合成草稿[S1]'}}]});}
   assert.match(request.messages[0].content,/MODE B 深度研究执行要求/);
   assert.match(request.messages[1].content,/normalized-1/);
   return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(input))}}]});
  };
  job.result=await runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),new AbortController().signal);job.status='completed';
  const exported=exportResearchMarkdown(job);
  assert.match(exported,/# 一、研究计划与证据判断[\s\S]*# 二、实际工具调用与资料获取[\s\S]*# 三、完整研究结果/);
  assert.match(exported,/calculate_normalized_earnings/);assert.match(exported,/文件指纹/);assert.ok(job.result.researchSummary);
  assert.equal(calls,3);
 }finally{global.fetch=previous;}
});
