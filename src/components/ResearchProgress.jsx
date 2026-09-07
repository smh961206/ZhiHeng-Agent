import {Check, LoaderCircle, CircleAlert, Clock3, Minus, Square} from 'lucide-react';
import {researchProgress} from '../../shared/research-progress.mjs';
import {Card} from './ui/card';
import './research-progress.css';

const calculationNames={calculate_comparison:'多公司可比性核算',calculate_p2:'市赚率计算',calculate_dividend:'股息收益率锚计算',calculate_normalized_earnings:'正常化盈利估值',calculate_screen_metrics:'财务指标计算',calculate_dcf:'现金流折现计算'};
const stageIcons = {completed: Check, running: LoaderCircle, partial: CircleAlert, failed: CircleAlert, cancelled: Square, skipped: Minus, stopped: Minus, unknown: CircleAlert};

export default function ResearchProgress({job,expanded=false}) {
  const progress = researchProgress(job);
  const {stages, calculation} = progress;
  const Icon = progress.busy ? LoaderCircle : progress.status === 'queued' ? Clock3
    : progress.status === 'completed' ? Check : progress.status === 'cancelled' ? Square : CircleAlert;
  const content = <>
    <div className="rp-status" role="status" aria-live="polite" aria-atomic="true">
      <div className="rp-heading">
        <span className="rp-eyebrow">执行与交付</span>
        <span className="rp-badge"><Icon size={15} aria-hidden="true" className={progress.busy ? 'rp-spin' : undefined}/>{progress.label}</span>
      </div>
      <p className="rp-current-label">当前环节</p>
      <p className="rp-title">{progress.title}</p>
      <p className="rp-description">{progress.description}</p>
      <div className="rp-next"><strong>下一步</strong><p>{progress.next}</p></div>
    </div>
    {progress.error && <p className="rp-error"><strong>执行问题</strong>{progress.error}</p>}
    {stages.length > 0 ? <div className="rp-stage-section" role="group" aria-label="实际阶段记录">
      <div className="rp-stage-heading"><strong>阶段记录</strong><span>已完成 {progress.completedStages} / {stages.length} 个已记录阶段</span></div>
      <ol className="rp-stages" aria-label="研究执行阶段">{stages.map(stage => {
        const StageIcon = stageIcons[stage.status];
        return <li key={`${stage.id || 'stage'}-${stage.index}`} className={`stage-${stage.status}`} aria-current={stage.index === progress.currentIndex ? 'step' : undefined}>
          <span aria-hidden="true">{StageIcon ? <StageIcon size={15} className={stage.status === 'running' ? 'rp-spin' : undefined}/> : stage.index + 1}</span>
          <div><strong>{stage.label}</strong><small>{stage.statusLabel}</small></div>
        </li>;
      })}</ol>
      <p className="rp-stage-note">仅按实际记录展示；阶段可能交叉或回到补证，不代表耗时比例。</p>
    </div> : <p className="rp-legacy">{progress.legacy}</p>}
    {progress.collectionNote && <p className="rp-evidence-note">{progress.collectionNote}</p>}
    {progress.collectionDetails.length > 0 && <details className="rp-details rp-coverage">
      <summary>查看资料覆盖与采集提示（{progress.collectionDetails.length} 条）</summary>
      <ul>{progress.collectionDetails.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </details>}
    {progress.followupSummary && <p className="rp-evidence-note">{progress.followupSummary}</p>}
    {calculation.failed > 0 && <details className="calculation-issues rp-details">
      <summary>查看计算记录：{calculation.succeeded} 次返回结果，{calculation.failed} 次调用失败</summary>
      <p>以下保留本次执行中的失败调用，包含重试前的失败。工具返回结果不代表数据已核实或模型适用，请结合报告中的数据缺口与限制核对。</p>
      <ul>{calculation.failures.map((failure, index) => <li key={`${failure.toolCallId || 'call'}-${index}`}><strong>{calculationNames[failure.toolName] || failure.toolName}</strong><p>{failure.error}</p></li>)}</ul>
    </details>}
    {stages.length > 0 && <details className="rp-details rp-stage-guide">
      <summary>查看阶段说明与交付条件</summary>
      <dl>{stages.map(stage => <div key={`${stage.id || 'stage'}-${stage.index}`}><dt>{stage.label}</dt><dd>{stage.description}</dd></div>)}</dl>
      <p>计算按研究需要执行；“未使用”不等于计算通过。正式报告须在复核结束且保存成功后交付，已有草稿不能替代正式结果。</p>
    </details>}
  </>;
  return <Card className="research-progress rp-progress gap-0" role="region" aria-label="研究框架执行情况" data-progress-state={progress.status}>
    {progress.collapseByDefault&&!expanded ? <details className="rp-completion">
      <summary>
        <span className="rp-completion-heading"><Check size={17} aria-hidden="true"/><strong>{progress.title}</strong><span>查看执行详情</span></span>
        <span className="rp-completion-note">阶段完成不代表资料完整或假设已证实；阅读时仍需核对报告限制。</span>
      </summary>
      {content}
    </details> : content}
  </Card>;
}
