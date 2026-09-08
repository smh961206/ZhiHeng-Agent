import test from 'node:test';
import assert from 'node:assert/strict';
import {researchRecovery, researchDraftState} from '../shared/research-recovery.mjs';

test('recovery distinguishes research restart from saving either a report or a failed execution', () => {
  for (const status of ['failed', 'cancelled']) {
    const execution = {status, error: '原执行问题'};
    const retry = researchRecovery(execution);
    assert.equal(retry.retryKind, 'research');
    assert.match(retry.notice, /重新采集/);
    assert.match(retry.notice, /最近保存的执行进度继续/);
    const delivery = researchRecovery({...execution, delivery: {status: 'failed', recoverable: true, targetStatus: status, executionError: execution.error}});
    assert.equal(delivery.retryKind, 'save');
    assert.match(delivery.text, /保存成功不代表研究完成/);
    assert.equal(delivery.error, execution.error);
    assert.match(delivery.notice, /不重新采集资料、不调用模型/);
  }
  const job = {status: 'failed', delivery: {status: 'failed', recoverable: true, targetStatus: 'completed'}};
  const original = structuredClone(job);
  assert.match(researchRecovery(job).text, /报告与复核已完成/);
  assert.deepEqual(job, original);
});

test('saving blocks restart and missing retained content never becomes a research retry', () => {
  for (const status of ['completed', 'failed', 'cancelled']) {
    const state = researchRecovery({status: 'running', delivery: {status: 'saving', targetStatus: status}});
    assert.equal(state.retryKind, null);
    assert.equal(state.kind, 'saving');
    if (status !== 'completed') assert.equal(state.title, '正在保存执行记录');
  }
  assert.equal(researchRecovery({status: 'failed', delivery: {status: 'failed', recoverable: false}}).retryKind, null);
  for (const status of ['running', 'queued', 'completed']) assert.equal(researchRecovery({status}), null);
  assert.equal(researchRecovery({status: 'failed', delivery: {status: 'saved'}}).retryKind, 'research');
});

test('recovery explains the actual continuation phase and retained progress without promising exact legacy replay',()=>{
 const job={status:'failed',resume:{available:true,phase:'review',origin:'checkpoint',sourceCount:12,toolCount:8,calculationCount:3}};
 const state=researchRecovery(job);
 assert.equal(state.continuation.title,'从复核阶段继续');
 assert.equal(state.continuation.retained,'已保留 12 条资料 · 8 项工具结果 · 3 项成功计算');
 assert.match(state.text,/从复核阶段继续/);assert.doesNotMatch(state.notice,/重新采集/);
 assert.match(researchRecovery({...job,resume:{...job.resume,origin:'history'}}).notice,/未保存完整的执行现场/);
 const fresh=researchRecovery({...job,resume:{available:false}});
 assert.equal(fresh.continuation,null);assert.match(fresh.notice,/尚无可恢复/);
 assert.equal(researchRecovery({...job,resume:{available:true,sourceCount:-1,toolCount:NaN}}).continuation.retained,'已有执行记录将保留');
});

test('known rule changes distinguish a fresh research run from a checkpoint continuation',()=>{
 for(const reason of ['framework_changed','rules_changed']){
  const state=researchRecovery({status:'failed',resume:{available:false,reason,fromVersion:'4.2',toVersion:'4.3'}});
  assert.equal(state.restart.title,'按当前规则重新研究');assert.equal(state.continuation,null);
  assert.match(state.text,/重新采集、分析和复核/);assert.match(state.notice,/规则/);
 }
 assert.equal(researchRecovery({status:'failed',resume:{available:false}}).restart.title,'本次需要重新研究');
});

test('supplement and subsequent review cannot be described as an unaudited first draft', () => {
  const job = {status: 'running', liveReport: {phase: 'supplement', text: '# 草稿'}};
  const supplement = researchDraftState(job);
  assert.equal(supplement.kind, 'supplement');
  assert.match(supplement.title, /初轮复核/);
  assert.match(supplement.text, /再次复核/);
  assert.doesNotMatch(supplement.title, /尚未审计/);
  const review = researchDraftState({...job, liveReport: {phase: 'audit'}, evidenceFollowup: {status: 'completed'}});
  assert.match(review.title, /补证已结束/);
  assert.match(review.auditTitle, /补证后/);
  assert.equal(researchDraftState({...job, liveReport: {phase: 'audit'}}).title, '草稿已生成，正在审计');
  assert.equal(researchDraftState({...job, liveReport: {phase: 'research'}}).title, '实时草稿 · 尚未审计');
});

test('live phase wins over stale supplementation state; terminal and saving records are never live drafts', () => {
  assert.equal(researchDraftState({status: 'running', liveReport: {phase: 'audit'}, evidenceFollowup: {status: 'running'}}).kind, 'audit');
  assert.equal(researchDraftState({status: 'running', evidenceFollowup: {status: 'running'}}).kind, 'supplement');
  for (const status of ['failed', 'cancelled', 'completed']) assert.equal(researchDraftState({status, liveReport: {phase: 'supplement'}}), null);
  assert.equal(researchDraftState({status: 'running', delivery: {status: 'saving'}, liveReport: {phase: 'supplement'}}), null);
});
