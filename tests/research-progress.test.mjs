import test from 'node:test';
import assert from 'node:assert/strict';
import {researchProgress} from '../shared/research-progress.mjs';

const stages = statuses => ({stages: ['task', 'evidence', 'research', 'calculation', 'review'].map((id, index) => ({id, label: id, status: statuses[index]}))});
const job = (status = 'running', extra = {}) => ({status, mode: 'B', workflow: stages(['completed', 'completed', 'running', 'pending', 'pending']), ...extra});
const call = (toolCallId, error) => ({type: 'tool_result', toolName: 'calculate_p2', toolCallId, result: error ? {error} : {value: 10}});

test('queue never animates stale running stages or invents a waiting time', () => {
  const progress = researchProgress(job('queued'));
  assert.equal(progress.status, 'queued');
  assert.equal(progress.busy, false);
  assert.equal(progress.currentIndex, undefined);
  assert.equal(progress.stages[2].status, 'pending');
  assert.match(progress.description, /暂无可靠的等待时长/);
  assert.match(progress.next, /预计.*验证逻辑与反证/);
});

test('running state uses actual stages and distinguishes parallel calculation attempts', () => {
  const progress = researchProgress(job());
  assert.equal(progress.title, '正在验证逻辑与反证');
  assert.match(progress.next, /预计进入“估值与敏感性计算”/);
  assert.equal(progress.currentIndex, 2);
  assert.equal(progress.completedStages, 2);
  const concurrent = researchProgress(job('running', {workflow: stages(['completed', 'completed', 'running', 'running', 'pending'])}));
  assert.equal(concurrent.currentIndex, 3);
  assert.equal(concurrent.stages.filter(stage => stage.status === 'running').length, 2);
  assert.equal(concurrent.title, '正在估值与敏感性计算');
  assert.equal(Object.hasOwn(progress, 'percentage'), false);
});

test('mode names survive automatic routing and custom historical stages', () => {
  for (const [mode, expected] of [['A', '核对关键计算'], ['B', '估值与敏感性计算'], ['C', '核算单季与参数变化'], ['D', '核算可比指标与适用性']]) {
    const progress = researchProgress(job('running', {mode: 'auto', plan: {mode}}));
    assert.equal(progress.stages[3].label, expected);
  }
  const custom = researchProgress(job('running', {mode: 'E', workflow: {stages: [{id: 'custom', label: '组合风险核对', description: '核对组合约束。', status: 'running'}]}}));
  assert.equal(custom.title, '正在组合风险核对');
  assert.equal(custom.description, '核对组合约束。');
});

test('followup is real work inside review and completion means re-review, not delivery', () => {
  const current = job('running', {workflow: stages(['completed', 'completed', 'completed', 'skipped', 'running']), liveReport: {phase: 'supplement'}, evidenceFollowup: {status: 'running', checks: [{status: 'evidence-located'}, {status: 'unresolved'}]}});
  const progress = researchProgress(current);
  assert.equal(progress.status, 'followup');
  assert.equal(progress.currentIndex, 4);
  assert.match(progress.followupSummary, /2 项补证检查，1 项定位到证据，1 项尚未定位到证据/);
  assert.match(progress.next, /补证结束后复核/);
  current.evidenceFollowup.status = 'completed';
  current.liveReport.phase = 'audit';
  assert.equal(researchProgress(current).title, '正在进行补证后复核');
  assert.equal(researchProgress(current).status, 'running');
});

test('live supplement works without followup snapshots and audit overrides stale followup', () => {
  const current = job('running', {liveReport: {phase: 'supplement'}});
  assert.equal(researchProgress(current).status, 'followup');
  current.evidenceFollowup = {status: 'running'};
  current.liveReport.phase = 'audit';
  assert.equal(researchProgress(current).status, 'running');
  assert.match(researchProgress(current).title, /复核/);
  current.delivery = {status: 'saving', targetStatus: 'completed'};
  assert.equal(researchProgress(current).status, 'saving');
});

test('only ordinary delivered reports collapse; important execution limits stay visible', () => {
  const current = job('completed', {result: {report: '合成正式报告'}, workflow: stages(['completed', 'completed', 'completed', 'skipped', 'completed'])});
  assert.equal(researchProgress(current).collapseByDefault, true);
  const variants = [
    {...current, result: null},
    {...current, events: [call('failed', '计算失败')]},
    {...current, marketData: {coverage: [{read: 0, listed: 5}]}},
    {...current, marketData: {warnings: ['读取限制仍待核对'] }},
    {...current, evidenceFollowup: {checks: [{status: 'unresolved'}]}},
    ...['queued', 'running', 'failed', 'cancelled'].map(status => ({...current, status})),
    {...current, delivery: {status: 'saving', targetStatus: 'completed'}},
    {...current, delivery: {status: 'failed', recoverable: true, targetStatus: 'completed'}},
  ];
  for (const value of variants) assert.equal(researchProgress(value).collapseByDefault, false);
});

test('formatting and audit signals explain progress without creating stage records', () => {
  for (const [phase, title] of [['formatting', '正在整理研究报告'], ['audit', '正在复核研究内容']]) {
    const progress = researchProgress(job('running', {workflow: undefined, liveReport: {phase}}));
    assert.equal(progress.title, title);
    assert.equal(progress.stages.length, 0);
    assert.equal(progress.currentIndex, undefined);
    assert.match(progress.next, /保存成功/);
  }
});

test('save lifecycle overrides stale job, report, audit and followup state', () => {
  const current = job('running', {result: {report: '尚未保存的正文'}, evidenceFollowup: {status: 'running'}, liveReport: {phase: 'audit'}, delivery: {status: 'saving', targetStatus: 'completed'}});
  let progress = researchProgress(current);
  assert.equal(progress.status, 'saving');
  assert.equal(progress.busy, true);
  assert.equal(progress.currentIndex, undefined);
  assert.equal(progress.stages.some(stage => stage.status === 'running'), false);
  assert.equal(progress.stages[2].status, 'stopped');
  assert.equal(progress.completedStages, 2, 'saving cannot certify unfinished stages');
  assert.match(progress.next, /等待保存确认/);
  current.status = 'failed';
  current.delivery = {status: 'failed', targetStatus: 'completed', recoverable: true};
  progress = researchProgress(current);
  assert.equal(progress.status, 'save-pending');
  assert.equal(progress.busy, false);
  assert.match(progress.title, /研究已复核，结果待保存/);
  assert.match(progress.next, /重试保存.*无须重新取数或调用模型/);
  assert.match(progress.description, /服务重启可能丢失/);
  assert.doesNotMatch(progress.next, /导出/);
  current.delivery.recoverable = false;
  progress = researchProgress(current);
  assert.equal(progress.status, 'save-failed');
  assert.doesNotMatch(progress.next, /重试保存/);
});

test('saving interrupted jobs retains execution outcome and does not promise a report', () => {
  for (const targetStatus of ['failed', 'cancelled']) {
    for (const deliveryStatus of ['saving', 'failed']) {
      const progress = researchProgress(job('running', {delivery: {status: deliveryStatus, targetStatus, recoverable: true, executionError: '原执行问题'}}));
      assert.match(progress.title, targetStatus === 'failed' ? /研究未完成/ : /研究已取消/);
      assert.match(progress.title, /执行记录/);
      assert.equal(progress.stages[2].status, targetStatus);
      assert.equal(progress.error, '原执行问题');
      assert.doesNotMatch(progress.next, /提供正式报告|导出报告/);
    }
  }
});

test('failure and cancellation stop pending work and ignore stale followup activity', () => {
  for (const status of ['failed', 'cancelled']) {
    const progress = researchProgress(job(status, {error: '合成错误', liveReport: {phase: 'audit'}, evidenceFollowup: {status: 'running'}, delivery: {status: 'saved', targetStatus: status}}));
    assert.equal(progress.status, status);
    assert.equal(progress.busy, false);
    assert.equal(progress.stages[2].status, status);
    assert.equal(progress.stages[3].status, 'stopped');
    assert.equal(progress.currentIndex, undefined);
    assert.match(progress.next, /重试研究/);
  }
});

test('delivery requires report text and keeps partial calculation evidence visible', () => {
  const current = job('completed', {workflow: stages(['completed', 'completed', 'completed', 'completed', 'completed']), result: {report: '# 合成正式报告'}, events: [call('ok'), call('bad', 'OCR数字待核对'), call('ok')]});
  const before = structuredClone(current);
  const progress = researchProgress(current);
  assert.equal(progress.status, 'completed');
  assert.match(progress.title, /仍有执行限制/);
  assert.equal(progress.stages[3].status, 'partial');
  assert.equal(progress.completedStages, 4);
  assert.equal(progress.calculation.succeeded, 1);
  assert.equal(progress.calculation.failed, 1);
  assert.match(progress.next, /研究报告.*审计记录.*证据来源.*导出报告/);
  assert.deepEqual(current, before, 'derive without mutating the shared job');
  for (const report of [undefined, '', ' \n ']) {
    const missing = researchProgress({...current, result: {report}});
    assert.equal(missing.status, 'report-missing');
    assert.doesNotMatch(missing.next, /导出报告/);
  }
});

test('collection completion preserves its status with real coverage gaps and warnings', () => {
  const current = job('running', {marketData: {coverage: [{security: 'US:TEST', listed: 5, read: 3, fullTextRead: 1, coreFactsRead: 3, limited: true, periodCoverage: {missingAnnualYears: [2022]}, readPeriodCoverage: {missingAnnualYears: [2023, 2024]}, failed: ['合成报告读取失败']}], warnings: ['行情快照可能延迟', '行情快照可能延迟']}});
  const before = structuredClone(current);
  const progress = researchProgress(current);
  assert.equal(progress.status, 'running');
  assert.equal(progress.stages[1].status, 'completed');
  assert.match(progress.collectionNote, /采集已结束，不代表资料完整/);
  assert.match(progress.collectionDetails.join('\n'), /目录列出 5 份.*可读内容 3 份.*取得正文 1 份.*核心财务事实 3 份/);
  assert.match(progress.collectionDetails.join('\n'), /目录缺少年份：2022.*年报正文未完整取得：2023、2024/);
  assert.equal(progress.collectionDetails.filter(note => note === '行情快照可能延迟').length, 1);
  assert.deepEqual(current, before);
});

test('complete reads never certify full coverage; warnings alone do not invent a failure', () => {
  const progress = researchProgress(job('completed', {result: {report: '合成正文'}, workflow: stages(['completed', 'completed', 'completed', 'skipped', 'completed']), marketData: {coverage: [{security: 'CN:TEST', listed: 5, read: 5, fullTextRead: 5, coreFactsRead: 0}], warnings: ['来源最新可得快照，可能延迟']}}));
  assert.equal(progress.collectionHasGaps, false);
  assert.equal(progress.status, 'completed');
  assert.equal(progress.stages[1].status, 'completed');
  assert.equal(progress.stages[3].status, 'skipped');
  assert.match(progress.collectionNote, /不代表资料完整或数字已核实/);
  assert.equal(progress.title, '研究报告已交付');
});

test('legacy, missing and unknown records remain explicit without fabricated stages', () => {
  for (const value of [undefined, null, {}, {workflow: {stages: 'invalid'}}, {workflow: {stages: [null]}}]) {
    const progress = researchProgress(value);
    assert.equal(progress.status, 'unknown');
    assert.equal(progress.stages.length, 0);
    assert.equal(progress.completedStages, 0);
    assert.equal(progress.busy, false);
  }
  const progress = researchProgress(job('running', {workflow: {stages: [{id: 'future', status: 'future-status'}]}}));
  assert.equal(progress.stages[0].statusLabel, '状态未记录');
  assert.equal(progress.currentIndex, undefined);
  assert.match(progress.title, /等待阶段更新/);
});
