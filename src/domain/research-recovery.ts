import {deliveryProgress, isSavingResult, needsSaveRetry} from './research-delivery.ts';

export const researchRetryNotice = '重试研究会优先从最近保存的执行进度继续，保留已采集资料、工具结果与执行记录。未完整返回的模型请求会重新发起；若尚无可恢复进度，则沿用原输入重新采集并研究。';
export const saveRetryNotice = '重试保存仅保存当前服务暂存的原结果或执行记录，不重新采集资料、不调用模型，也不改变原研究结论。暂存内容仅保留在当前服务中，服务重启可能丢失。';

export function researchFailurePresentation(value=''){
 const message=typeof value==='string'?value.trim():'';
 if(/^(?:KeyError\s*:\s*)?["']researchCutoff["']$/i.test(message))return {
  title:'历史记录缺少明确的研究截止时间',
  detail:'这条研究由旧版本创建。重试时会沿用原创建时间作为截止时间，避免使用创建之后的信息。',
  trace:'旧版记录未单独保存研究截止时间；当前版本会在重试时沿用原创建时间。',
 };
 if(!message)return {title:'研究执行未完成',detail:'系统未保存具体原因，可查看执行轨迹，或修改输入后重新研究。',trace:'研究执行未完成，未保存具体原因。'};
 if(/^(?:KeyError\s*:\s*)?["'][A-Za-z_][\w.-]*["']$/.test(message))return {
  title:'研究记录存在兼容问题',detail:'当前版本无法直接读取旧记录中的一项必要信息。请重试；若仍未完成，可修改输入后新建研究。',trace:'旧版研究记录缺少当前流程需要的信息。',
 };
 return {title:'研究执行遇到问题',detail:message,trace:message};
}

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
 const executionChanged=['execution_changed','framework_changed'].includes(job.resume.reason);
 const modelChanged=job.resume.reason==='model_configuration_changed';
 const changed=executionChanged||modelChanged||job.resume.reason==='rules_changed';
 return {title:executionChanged?'按当前流程重新研究':modelChanged?'按当前配置重新研究':changed?'按当前规则重新研究':'本次需要重新研究',reason:job.resume.reason||'no_checkpoint',text:changed?'原问题与补充资料可继续使用，本轮将重新采集、分析和复核。':'未找到可用的续跑进度，可沿用原输入重新采集并研究。'};
}

export function retryNotice(job = {}) {
  const reason=job.resume?.available===false?job.resume.reason:null;
  if(reason==='rules_changed')return '本任务的研究规则暂不满足继续执行的条件。可将原输入带回工作台，确认后按当前规则重新研究；本记录仍保留，旧计算与模型对话不会混入新任务。';
  if(['execution_changed','framework_changed'].includes(reason))return '执行流程已更新，需要重新开始研究。可将原输入带回工作台，确认后重新采集、分析和复核；本记录仍保留，旧计算与模型对话不作为续跑进度。';
  if(reason==='model_configuration_changed')return '本任务固定的模型配置暂不满足继续执行的条件。可将原输入带回工作台，确认后按当前配置新建研究；本记录与已有执行依据仍保留。';
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
  const requiresNewResearch=job.resume?.available===false&&['rules_changed','execution_changed','framework_changed','model_configuration_changed'].includes(job.resume.reason);
  if (['failed', 'cancelled'].includes(job.status)) return {
    kind: job.status, retryKind: requiresNewResearch?null:'research',requiresNewResearch,
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
