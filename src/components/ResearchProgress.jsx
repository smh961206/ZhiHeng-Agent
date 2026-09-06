import {deepResearchCopy} from '../../shared/deep-research.mjs';
import {Check, LoaderCircle, CircleAlert, Minus, Square} from 'lucide-react';
import {Card} from './ui/card';
import {modeOf} from '../lib/research-mode';

const labels = {pending: '待执行', running: '进行中', completed: '已完成', skipped: '未使用', failed: '未通过', cancelled: '已取消', stopped: '未执行'};
const screenStages={task:'明确筛选问题',evidence:'读取研究资料',research:'查证变化与红旗',calculation:'核对关键计算',review:'复核筛选判断'};

export default function ResearchProgress({job}) {
  const stages = Array.isArray(job?.workflow?.stages) ? job.workflow.stages : [];
  const active = ['queued', 'running'].includes(job?.status);
  return <Card className="research-progress gap-0" aria-label="研究框架执行情况">
    {stages.length ? <ol>{stages.map((stage, index) => {
      // Interrupted jobs retain pending later stages on the server. They must
      // not look queued for future execution, nor keep a stale spinner running.
      const status = !active && stage.status === 'pending' ? 'stopped'
        : !active && stage.status === 'running' ? (['failed', 'cancelled'].includes(job.status) ? job.status : 'stopped') : stage.status;
      const Icon = status === 'completed' ? Check : status === 'running' ? LoaderCircle
        : status === 'failed' ? CircleAlert : status === 'cancelled' ? Square : ['skipped', 'stopped'].includes(status) ? Minus : null;
      return <li key={stage.id || index} className={`stage-${status}`} aria-current={status === 'running' ? 'step' : undefined}>
        <span aria-hidden="true">{Icon ? <Icon size={15} className={status === 'running' ? 'animate-spin' : undefined}/> : index + 1}</span>
        <div><strong>{modeOf(job)==='A'?screenStages[stage.id]||stage.label:modeOf(job)==='B'?deepResearchCopy.stages[stage.id]||stage.label:stage.label}</strong><small>{labels[status] || '状态未记录'}</small></div>
      </li>;
    })}</ol> : <p className="legacy-progress">{active ? '等待执行阶段更新…' : '此历史研究未记录结构化阶段，可在执行轨迹中回看过程。'}</p>}
  </Card>;
}
