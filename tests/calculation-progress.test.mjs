import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCalculations,calculationProgress} from '../shared/calculation-progress.mjs';
import {deepResearchProgress} from '../shared/deep-research.mjs';
import {updateStage} from '../server/research-workflow.mjs';

const result=(id,error)=>({type:'tool_result',toolName:'calculate_normalized_earnings',toolCallId:id,result:error?{error}:{value:[10,20]}});
test('mixed calculation results are partial regardless of which call finishes last',()=>{
 const events=[result('success'),result('failure','原文待核对')];
 for(const calls of [events,[...events].reverse()]){
  const summary=summarizeCalculations(calls);
  assert.equal(summary.status,'partial');assert.equal(summary.succeeded,1);assert.equal(summary.failed,1);
  for(const recorded of ['completed','failed']){
   const job={status:'completed',events:calls,workflow:{stages:[{id:'calculation',status:recorded}]}};
   assert.equal(calculationProgress(job).status,'partial');
   assert.match(deepResearchProgress(job,true).title,/计算部分完成/);
   assert.match(deepResearchProgress(job,false).title,/未找到/);
   assert.equal(job.workflow.stages[0].status,recorded,'Historical data is not mutated');
  }
 }
});
test('calculation summaries distinguish all failures, success, absent evidence and duplicate events',()=>{
 assert.equal(summarizeCalculations([result('fail','OCR待核对')]).status,'failed');
 assert.equal(summarizeCalculations([result('ok'),result('ok')]).total,1);
 assert.equal(summarizeCalculations([result('ok')]).status,'completed');
 assert.equal(summarizeCalculations([{type:'tool',toolName:'calculate_p2'}, {type:'tool_result',toolName:'search_evidence',result:{error:'搜索失败'}}]).total,0);
 assert.equal(calculationProgress({workflow:{stages:[{id:'calculation',status:'failed'}]}}).status,'failed');
 assert.equal(summarizeCalculations([]).status,'skipped');
});
test('running and interrupted calculations retain their actual state',()=>{
 for(const status of ['running','cancelled','stopped'])assert.equal(calculationProgress({status:'running',events:[result('ok')],workflow:{stages:[{id:'calculation',status}]}}).status,status);
 const job={};updateStage(job,'calculation','partial',()=>{});
 assert.ok(job.workflow.stages.find(stage=>stage.id==='calculation').finishedAt);
 updateStage(job,'calculation','running',()=>{});
 assert.equal(job.workflow.stages.find(stage=>stage.id==='calculation').finishedAt,undefined);
});
