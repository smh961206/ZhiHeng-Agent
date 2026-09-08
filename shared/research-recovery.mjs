import {deliveryProgress, isSavingResult, needsSaveRetry} from './research-delivery.mjs';

export const researchRetryNotice = '重试研究会优先从最近保存的执行进度继续，保留已采集资料、工具结果与执行记录。未完整返回的模型请求会重新发起；若尚无可恢复进度，则沿用原输入重新采集并研究。';
export const saveRetryNotice = '重试保存仅保存当前服务暂存的原结果或执行记录，不重新采集资料、不调用模型，也不改变原研究结论。暂存内容仅保留在当前服务中，服务重启可能丢失。';

export function researchContinuation(job = {}) {
  if (!job.resume?.available) return null;
  const phase = job.resume.phase === 'review' ? '复核' : '研究';
  const counts = [['sourceCount', '条资料'], ['toolCount', '项工具结果'], ['calculationCount', '项成功计算']]
    .filter(([key]) => Number.isSafeInteger(job.resume[key]) && job.resume[key] > 0)
    .map(([key, unit]) => `${job.resume[key]} ${unit}`);
  return {phase, title: `从${phase}阶段继续`, retained: counts.length ? `已保留 ${counts.join(' · ')}` : '已有执行记录将保留'};
}

export function researchRestart(job={}){
 if(job.resume?.available!==false||!['failed','cancelled'].includes(job.status))return null;
 const changed=['framework_changed','rules_changed'].includes(job.resume.reason);
 return {title:changed?'按当前规则重新研究':'本次需要重新研究',reason:job.resume.reason||'no_checkpoint',text:changed?'原问题与补充资料可继续使用，本轮将重新采集、分析和复核。':'未找到可用的续跑进度，可沿用原输入重新采集并研究。'};
}

export function retryNotice(job = {}) {
  if(job.resume?.reason==='rules_changed')return '本任务采用的研究规则内容已更新。重试将沿用原输入，按当前规则重新研究，避免混用更新前的计算与模型对话。';
  if(job.resume?.reason==='framework_changed')return `研究规则已从 V${job.resume.fromVersion} 更新为 V${job.resume.toVersion}。重试将沿用原输入，按新版本重新研究；旧版本的计算与模型对话不作为续跑进度。`;
  const continuation = researchContinuation(job);
  if (continuation) return job.resume.origin === 'history'
    ? `将利用已保存的资料和工具结果继续${continuation.phase}。这条旧任务未保存完整的执行现场，恢复时可能补充核对；行情沿用原采集时点。`
    : `从最近保存的${continuation.phase}进度继续，沿用已有资料与工具结果。中断时尚未完整返回的请求会重新发起；行情沿用原采集时点。`;
  return job.resume?.available === false
    ? '本次尚无可恢复的执行进度。重试将沿用原输入，重新采集资料并研究。'
    : researchRetryNotice;
}

// Delivery takes precedence over execution: a failed write can contain either a
// completed report or a failed/cancelled execution record.
export function researchRecovery(job = {}) {
  if (isSavingResult(job) || needsSaveRetry(job)) {
    const completed = job.delivery.targetStatus === 'completed';
    return {
      kind: isSavingResult(job) ? 'saving' : 'save',
      retryKind: needsSaveRetry(job) ? 'save' : null,
      title: completed ? deliveryProgress(job).title : isSavingResult(job) ? '正在保存执行记录' : '执行记录待保存',
      text: completed ? '报告与复核已完成，保存成功后才能查看和导出正式结果。' : '当前待保存的是执行记录，保存成功不代表研究完成；之后仍需处理原研究问题。',
      notice: saveRetryNotice,
      error: job.delivery.executionError || '',
    };
  }
  if (job.delivery?.status === 'failed') return {
    kind: 'save-unavailable', retryKind: null, title: '待保存内容暂不可恢复',
    text: '当前记录未提供可恢复的暂存内容。请刷新详情确认最新保存状态；若仍无正式报告，可复用输入发起新的研究。',
    notice: '重新研究会重新采集和复核，不能找回原来的未保存结果。', error: job.error || '',
  };
  if (['failed', 'cancelled'].includes(job.status)) return {
    kind: job.status, retryKind: 'research',
    title: job.status === 'failed' ? '本次研究未完成' : '研究已取消',
    text: researchRestart(job)?.text || (researchContinuation(job) ? `点击“重试研究”可从${researchContinuation(job).phase}阶段继续，已完成的进度会保留。` : job.status === 'failed' ? '输入与执行记录已保留。先查看失败原因，再决定直接重试还是修改研究输入。' : '输入与执行记录已保留。取消后的任务不会自动继续，可在准备好后重新研究。'),
    restart:researchRestart(job),continuation: researchContinuation(job), notice: retryNotice(job), error: job.error || '',
  };
  return null;
}

export function researchDraftState(job = {}) {
  if (!['queued', 'running'].includes(job.status) || job.result || job.delivery?.status === 'saving') return null;
  const phase = job.liveReport?.phase;
  const followup = job.evidenceFollowup;
  if (phase === 'supplement' || (phase !== 'audit' && followup?.status === 'running')) return {
    kind: 'supplement', title: '初轮复核已发现缺口，正在补证',
    text: '正在定向核对已有资料，必要时补查公开来源。当前草稿尚非最终结论，补证后仍需再次复核；未解决的缺口会保留在正式报告中。',
    auditTitle: '正在补证，等待再次复核',
  };
  if (phase === 'audit') return {
    kind: 'audit', title: followup?.status === 'completed' ? '补证已结束，正在再次复核' : '草稿已生成，正在审计',
    text: '正在核对证据、数据口径与结论。定位到证据不等于缺口已解决，请等待正式报告与复核记录。',
    auditTitle: followup?.status === 'completed' ? '正在复核补证后的研究内容' : '正在复核研究草稿',
  };
  return {kind: 'draft', title: '实时草稿 · 尚未审计', text: '内容可能继续调整，请以最终报告为准。正式报告生成并保存后方可导出。', auditTitle: '等待研究进入审计阶段'};
}
