import {Workflow} from 'lucide-react';

const stages=[
 ['input','问题理解'],['vision','原页读取'],['researcher','研究分析'],['writer','报告整理'],
 ['evidenceVerifier','证据核验'],['auditor','交付复核'],['criticalReviewer','关键复核'],['judge','分歧裁决'],
];

export default function ResearchModelSummary({job}){
 const routing=job.modelRouting;
 if(!routing)return null;
 return <section className="rd-model-assignment" aria-label="处理环节记录">
  <header className="rd-document-summary"><span className="rd-document-icon"><Workflow size={18}/></span><span className="rd-document-heading"><strong>创建时配置</strong><span>研究启动时保存的模型分工</span></span><span className="rd-document-label">配置快照</span></header>
  <div className="rd-document-body">
   <p>用于确认各处理环节原本分配给哪个模型，不代表这些环节都已实际执行。</p>
   {routing.stageModels?<dl className="rd-model-records rd-stage-models" aria-label="本次八个研究环节的模型记录">{stages.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{routing.stageModels[key]||(['criticalReviewer','judge'].includes(key)?'未启用':'未记录')}</dd></div>)}</dl>:<dl className="rd-model-records" aria-label="本次历史模型记录"><div><dt>研究配置</dt><dd>{routing.analysisModel||'未记录'}</dd></div><div><dt>原页读取配置</dt><dd>{routing.visionModel||'未记录'}</dd></div></dl>}
   <p className="rd-model-record-note">实际执行情况请继续查看下方“实际调用”，详细过程可在“执行轨迹”中核对。</p>
  </div>
 </section>;
}
