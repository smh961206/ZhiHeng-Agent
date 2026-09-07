import test from 'node:test';
import assert from 'node:assert/strict';
import {researchRecovery, researchDraftState} from '../shared/research-recovery.mjs';

test('recovery distinguishes research restart from saving either a report or a failed execution', () => {
  for (const status of ['failed', 'cancelled']) {
    const execution = {status, error: '原执行问题'};
    const retry = researchRecovery(execution);
    assert.equal(retry.retryKind, 'research');
    assert.match(retry.notice, /重新采集/);
    assert.match(retry.notice, /替换/);
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
