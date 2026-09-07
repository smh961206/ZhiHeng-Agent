import {deliveryProgress, isSavingResult, needsSaveRetry} from './research-delivery.mjs';

export const researchRetryNotice = '重试研究会沿用本次输入，重新采集资料、分析并复核；不会从中断处续跑。启动成功后，当前记录的旧进度、采集资料、草稿与报告会由新一轮内容替换。';
export const saveRetryNotice = '重试保存仅保存当前服务暂存的原结果或执行记录，不重新采集资料、不调用模型，也不改变原研究结论。暂存内容仅保留在当前服务中，服务重启可能丢失。';

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
    text: job.status === 'failed' ? '输入与执行记录已保留。先查看失败原因，再决定直接重试还是修改研究输入。' : '输入与执行记录已保留。取消后的任务不会自动继续，可在准备好后重新研究。',
    notice: researchRetryNotice, error: job.error || '',
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
