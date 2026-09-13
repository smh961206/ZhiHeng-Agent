import {ChevronDown,Workflow} from 'lucide-react';

const stages=[
 ['input','问题理解'],['vision','原页读取'],['researcher','研究分析'],['writer','报告整理'],
 ['evidenceVerifier','证据核验'],['auditor','交付复核'],['criticalReviewer','关键复核'],['judge','分歧裁决'],
];

export default function ResearchModelSummary({job}){
 const routing=job.modelRouting;
 if(!routing)return null;
 return <details className="rd-model-assignment">
  <summary><span className="rd-document-icon"><Workflow size={18}/></span><span className="rd-document-heading"><strong>处理环节记录</strong><span>查看创建研究时保存的服务分工；有记录不表示实际执行</span></span><span className="rd-document-label">按需查看</span><ChevronDown size={16} className="rd-document-chevron"/></summary>
  <div className="rd-document-body">
   <p>这里用于排查处理环节。研究结论仍须结合证据、计算与复核记录判断，资料缺失不会自动提高处理强度。</p>
   {routing.stageModels?<dl className="rd-model-records rd-stage-models" aria-label="本次八个研究环节的模型记录">{stages.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{routing.stageModels[key]||(['criticalReviewer','judge'].includes(key)?'未启用':'未记录')}</dd></div>)}</dl>:<dl className="rd-model-records" aria-label="本次历史模型记录"><div><dt>研究配置</dt><dd>{routing.analysisModel||'未记录'}</dd></div><div><dt>原页读取配置</dt><dd>{routing.visionModel||'未记录'}</dd></div></dl>}
   <p className="rd-model-record-note">实际完成了哪些处理，请查看下方“服务调用与用量”和右侧“执行轨迹”。历史任务只显示当时保存的内容。</p>
  </div>
 </details>;
}
