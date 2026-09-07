import {calculationProgress} from './calculation-progress.mjs';
import {deliveryProgress, isSavingResult, needsSaveRetry} from './research-delivery.mjs';
import {deepResearchCopy} from './deep-research.mjs';
import {earningsUpdateCopy} from './earnings-update.mjs';
import {comparisonCopy} from './company-comparison.mjs';

const stageNames = {
  A: {task: '明确筛选问题', evidence: '读取研究资料', research: '查证变化与红旗', calculation: '核对关键计算', review: '复核筛选判断'},
  B: deepResearchCopy.stages, C: earningsUpdateCopy.stages, D: comparisonCopy.stages,
};
const stageDescriptions = {
  task: '确认研究问题、对象与本次交付范围。',
  evidence: '读取披露与数据，核对来源、期间和口径，记录资料缺口。',
  research: '查证关键判断，同时寻找支持证据、反证与未解问题。',
  calculation: '按需调用计算工具，核对输入口径、模型适用性与结果限制。',
  review: '复核证据、计算与判断；发现关键缺口时补证，再检查对结论的影响。',
};
const labels = {pending: '待执行', running: '进行中', completed: '已完成', partial: '部分完成', skipped: '未使用', failed: '未通过', cancelled: '已取消', stopped: '未执行', unknown: '状态未记录'};
const terminal = new Set(['completed', 'failed', 'cancelled']);
const text = value => typeof value === 'string' ? value.trim() : '';
const records = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') : [];
const strings = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
const count = value => Number.isSafeInteger(value) && value >= 0;

function collectionProgress(marketData, evidenceComplete) {
  const details = [];
  let hasGaps = false;
  for (const item of records(marketData?.coverage)) {
    const notes = [];
    if (count(item.listed)) notes.push(`目录列出 ${item.listed} 份报告`);
    if (count(item.read)) notes.push(`取得可读内容 ${item.read} 份（可能包含结构化事实，不等于全文）`);
    if (count(item.fullTextRead)) notes.push(`取得正文 ${item.fullTextRead} 份`);
    if (count(item.coreFactsRead)) notes.push(`取得核心财务事实 ${item.coreFactsRead} 份`);
    const years = value => Array.isArray(value) ? value.filter(year => typeof year === 'string' || Number.isInteger(year)).join('、') : '';
    const missingDirectory = years(item.periodCoverage?.missingAnnualYears);
    const missingText = years(item.readPeriodCoverage?.missingAnnualYears);
    if (missingDirectory) notes.push(`目录缺少年份：${missingDirectory}`);
    if (missingText) notes.push(`年报正文未完整取得：${missingText}`);
    if (item.limited === true) notes.push('采集或解析范围受限');
    if (item.stale === true) notes.push('使用留存目录，可能缺少新披露');
    notes.push(...strings(item.failed));
    if (strings(item.parsing?.needsReviewDocuments).length) notes.push(`解析待核对：${strings(item.parsing.needsReviewDocuments).join('、')}`);
    hasGaps ||= Boolean(missingDirectory || missingText || item.limited === true || item.stale === true || strings(item.failed).length || strings(item.parsing?.needsReviewDocuments).length
      || count(item.read) && (item.read === 0 || count(item.listed) && item.read < item.listed));
    if (notes.length) details.push(`${text(item.security) || text(item.name) || '研究标的'}：${notes.join('；')}。`);
  }
  details.push(...strings(marketData?.warnings));
  return {
    collectionDetails: [...new Set(details)], collectionHasGaps: hasGaps,
    collectionNote: evidenceComplete ? `资料采集已结束，不代表资料完整或数字已核实。${hasGaps ? '覆盖记录仍有缺口或读取限制，请展开核对。' : details.length ? '本次覆盖范围与采集提示可在下方查看。' : '完整性须结合证据来源与报告限制核对。'}`
      : details.length ? '以下为已记录的资料覆盖与采集提示，不代表资料已完整取得。' : '',
  };
}

// Delivery takes precedence: saving temporarily sets even failed/cancelled jobs
// to running. Never infer completed stages from the job or delivery status.
export function researchProgress(job = {}, mode) {
  job ??= {};
  const rawStages = records(job.workflow?.stages);
  const calculation = calculationProgress({...job, workflow: {stages: rawStages}, events: records(job.events)});
  const saving = isSavingResult(job), retrySave = needsSaveRetry(job);
  const delivering = saving || job.delivery?.status === 'failed';
  const executing = job.status === 'running' && !delivering;
  const executionStatus = delivering ? job.delivery.targetStatus : job.status;
  const resolvedMode = mode || [job.mode, job.plan?.mode, job.input?.mode].find(value => ['A', 'B', 'C', 'D', 'E', 'F'].includes(value));
  const stages = rawStages.map((stage, index) => {
    const recordedStatus = stage.id === 'calculation' ? calculation.status : stage.status;
    let status = Object.hasOwn(labels, recordedStatus) ? recordedStatus : 'unknown';
    let statusLabel = labels[status];
    if (status === 'running' && !executing) {
      status = !delivering && job.status === 'queued' ? 'pending'
        : ['failed', 'cancelled'].includes(executionStatus) ? executionStatus : 'stopped';
      statusLabel = status === 'stopped' ? '已停止，完成情况未记录' : labels[status];
    } else if (status === 'pending' && !executing && (delivering || job.status !== 'queued')) {
      status = 'stopped';
      statusLabel = '未执行';
    }
    return {
      id: stage.id, index, label: stageNames[resolvedMode]?.[stage.id] || text(stage.label) || `阶段 ${index + 1}`,
      description: stageDescriptions[stage.id] || text(stage.description) || '此阶段未记录说明，可在执行轨迹中核对实际过程。',
      recordedStatus, status, statusLabel,
    };
  });
  const followup = job.evidenceFollowup || job.result?.evidenceFollowup;
  const collection = collectionProgress(job.marketData, stages.some(stage => stage.id === 'evidence' && stage.status === 'completed'));
  const checks = records(followup?.checks);
  const located = checks.filter(check => check.status === 'evidence-located').length;
  const followupSummary = checks.length ? `记录 ${checks.length} 项补证检查，${located} 项定位到证据，${checks.length - located} 项尚未定位到证据。定位到证据仍需结合最终复核判断。` : '';
  const running = stages.filter(stage => stage.status === 'running');
  const review = running.find(stage => stage.id === 'review');
  const current = (job.liveReport?.phase === 'audit' ? review : null)
    || running.find(stage => stage.id === 'calculation') || running[0];
  const limited = calculation.failed > 0 || collection.collectionHasGaps
    || stages.some(stage => ['partial', 'failed', 'cancelled', 'stopped', 'unknown'].includes(stage.status))
    || checks.some(check => check.status !== 'evidence-located');
  let state;
  if (delivering) {
    const copy = deliveryProgress(job);
    const interrupted = ['failed', 'cancelled'].includes(executionStatus);
    const outcome = executionStatus === 'cancelled' ? '研究已取消' : '研究未完成';
    state = {
      status: saving ? 'saving' : retrySave ? 'save-pending' : 'save-failed', label: copy?.label || '保存失败',
      title: interrupted ? `${outcome}，${saving ? '正在保存执行记录' : retrySave ? '执行记录待保存' : '执行记录保存失败'}` : copy?.title || '研究结果保存失败',
      description: interrupted && saving ? '正在保存本次执行记录；保存成功不会将本次研究标记为完成。' : copy?.text || '当前未确认可恢复的暂存结果，尚不能提供正式交付。',
      next: saving ? interrupted ? '等待执行记录保存后，再根据原执行问题决定是否重新研究。' : '等待保存确认；保存成功后提供正式报告与执行记录。'
        : retrySave ? '使用本页“重试保存”保存当前内容，无须重新取数或调用模型。' : '查看执行轨迹与错误信息，刷新详情确认记录状态后再决定是否重新研究。',
    };
  } else if (job.status === 'queued') {
    const first = stages.find(stage => stage.status === 'pending');
    state = {status: 'queued', label: '排队中', title: '任务已排队，等待开始', description: '本次任务尚未开始执行，暂无可靠的等待时长。', next: first ? `轮到本任务后，预计从“${first.label}”开始；以实际阶段更新为准。` : '等待研究引擎开始执行，阶段信息将在收到记录后更新。'};
  } else if (job.status === 'failed' || job.status === 'cancelled') {
    const cancelled = job.status === 'cancelled';
    state = {status: job.status, label: cancelled ? '已取消' : '执行失败', title: cancelled ? '研究已取消' : '研究未完成', description: '本次执行已停止，后续阶段不会自动继续；已有草稿不代表正式交付。', next: '查看执行轨迹与已读资料；如需继续，可在本页重试研究，或修改研究输入后重新提交。'};
  } else if (job.status === 'completed') {
    const hasReport = Boolean(text(job.result?.report));
    state = {
      status: hasReport ? 'completed' : 'report-missing', label: hasReport ? '已交付' : '正文缺失',
      title: hasReport ? limited ? '报告已交付，仍有执行限制需核对' : '研究报告已交付' : '执行已结束，未找到正式报告正文',
      description: hasReport ? limited ? '报告可阅读，但不代表所有阶段、计算或证据缺口都已通过。请结合下方记录与报告限制阅读。' : '可阅读正式报告、审计记录与证据来源；阶段完成不代表所有假设都已证实。' : '完成状态不等于存在可读报告，本记录未包含正式正文。',
      next: hasReport ? '先读“研究报告”的判断与限制，再核对“审计记录”和“证据来源”；需要留存时使用“导出报告”。' : '查看审计、来源与执行轨迹；需要完整报告时，可复用研究输入重新研究。',
    };
  } else if (executing) {
    const nextStage = current && stages.slice(current.index + 1).find(stage => stage.status === 'pending');
    state = {
      status: 'running', label: '运行中', title: current ? `正在${current.label}` : '研究运行中，等待阶段更新',
      description: current?.description || '尚未收到可确认的当前阶段，执行轨迹会记录实际调用。',
      next: current?.id === 'review' ? '完成复核后保存结果；保存成功后提供正式报告。'
        : nextStage ? `完成当前环节后，预计进入“${nextStage.label}”；如发现证据缺口，可能返回补查。` : '等待下一条阶段记录；报告须经过复核和保存后才能正式交付。',
      currentIndex: current?.index,
    };
    // Recovery can retain a running followup snapshot after returning to audit.
    // The live phase is authoritative; supplement also works without a snapshot.
    if (job.liveReport?.phase === 'audit') {
      Object.assign(state, {title: followup && followup.status !== 'pending' ? '正在进行补证后复核' : `正在${review?.label || '复核研究内容'}`, description: stageDescriptions.review, next: '复核完成后保存结果；保存成功后提供正式报告。', currentIndex: review?.index});
    } else if (job.liveReport?.phase === 'supplement' || followup?.status === 'running') {
      Object.assign(state, {status: 'followup', label: '补证中', title: '正在补查关键证据', description: '先定向核对已有原文，必要时补查网页；未解决的缺口会保留在最终判断中。', next: '补证结束后复核新增证据及其对判断的影响，再保存结果。', currentIndex: review?.index});
    } else if (job.liveReport?.phase === 'formatting') {
      Object.assign(state, {title: '正在整理研究报告', description: '正在将返回内容整理为可读正文，尚未形成正式交付。', next: '整理后复核证据与判断；复核完成并保存成功后提供正式报告。', currentIndex: undefined});
    } else if (review) {
      Object.assign(state, {title: followup?.status === 'completed' ? '正在进行补证后复核' : `正在${review?.label || '复核研究内容'}`, description: followup?.status === 'completed' ? '补证检查已结束，正在核对新增证据、未解缺口与判断是否一致。' : stageDescriptions.review, next: '复核完成后保存结果；保存成功后提供正式报告。', currentIndex: review?.index});
    }
  } else {
    state = {status: 'unknown', label: '状态未记录', title: '暂无法确认研究执行状态', description: '保留已记录的阶段，不推测任务正在运行或已经完成。', next: '查看执行轨迹，或刷新详情获取最新记录。'};
  }
  return {
    ...state, ...collection, busy: ['running', 'followup', 'saving'].includes(state.status), stages, calculation,
    collapseByDefault: state.status === 'completed' && !limited && strings(job.marketData?.warnings).length === 0,
    completedStages: stages.filter(stage => stage.status === 'completed').length,
    followupSummary, error: text(job.delivery?.executionError) || (terminal.has(job.status) && !delivering ? text(job.error) : ''),
    legacy: stages.length ? '' : executing || job.status === 'queued' ? '尚未收到结构化阶段记录，收到后会在此显示。' : '此记录未包含结构化阶段，可在执行轨迹中回看实际过程。',
  };
}
