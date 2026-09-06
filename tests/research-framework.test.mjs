import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchPlan,researchStages} from '../shared/research-framework.mjs';
import {route,validateInput} from '../server/router.mjs';
import {updateStage,interruptWorkflow} from '../server/research-workflow.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
const input=question=>validateInput({question,securities:[{market:'CN',symbol:'600519'}],historyYears:3});
test('研究计划使用实际路由与历史范围，组合缺口不被忽略',()=>{
 const payout=input('研究分红');const plan=createResearchPlan(payout,route(payout));
 assert.equal(plan.mode,'F');assert.equal(plan.historyYears,8);
 const portfolio=input('分析组合风险');assert.match(createResearchPlan(portfolio,route(portfolio)).constraints.join(' '),/不输出具体仓位/);
 assert.equal(createResearchPlan({...payout,mode:'B'},route({...payout,mode:'B'})).historyYears,3);
});
test('失败和取消只结束实际正在执行的阶段，不伪造后续完成状态',()=>{
 for(const status of ['failed','cancelled']){
  const job={},snapshots=[];updateStage(job,'task','completed',(...args)=>snapshots.push(args[2].workflow));
  updateStage(job,'evidence','running',()=>{});interruptWorkflow(job,status);
  assert.equal(job.workflow.stages[1].status,status);assert.equal(job.workflow.stages[2].status,'pending');
  assert.equal(snapshots[0].stages[1].status,'pending');
 }
});
test('无需估值的研究标记未使用，并且仅在审计引用校验后完成交付',async()=>{
 const old=global.fetch;
 const makeJob=()=>({mode:'B',input:{question:'测试研究',depth:'Standard',sources:[{id:'S1',title:'测试证据',text:'仅用于测试。'}]}});
 try{
  for(const valid of [true,false]){
   let calls=0;
   global.fetch=async()=>Response.json({choices:[{message:{role:'assistant',content:++calls===1?'测试草稿[S1]':JSON.stringify(reviewFixture(makeJob().input,valid?'S1':'S99'))}}]});
   const job=makeJob();
   if(valid){const result=await runAgent(job,()=>{},new AbortController().signal);assert.deepEqual(result.validation.citedSourceIds,['S1']);assert.equal(job.workflow.stages.find(s=>s.id==='review').status,'completed');}
   else{await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/不存在/);assert.equal(job.workflow.stages.find(s=>s.id==='review').status,'running');}
   assert.equal(job.workflow.stages.find(s=>s.id==='calculation').status,'skipped');
   assert.deepEqual(job.plan.stages,researchStages);
  }
 }finally{global.fetch=old;}
});
