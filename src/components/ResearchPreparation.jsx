import {ChevronDown,ArrowUpRight,FileText,Layers,Target} from 'lucide-react';
import {Button} from './ui/button';
import ResearchScopeSummary from './ResearchScopeSummary';
import {researchDataCopy} from '../../shared/research-data-copy.mjs';
import './research-preparation.css';

export default function ResearchPreparation({preparation,materialCount=0,automatic,awaitingMode=false,pathPending=false,showMaterials=true,onNavigate}){
 const {plan,issues,notes,securities}=preparation;
 const checkpoints=[['question','你想研究什么？'],['path','研究路径'],['securities',researchDataCopy.title],...(showMaterials?[['materials','补充资料']]:[]),['settings','研究设置']];
 return <section className="research-preparation" aria-label="本次研究范围">
  <div className="preparation-heading"><div><span className="preparation-eyebrow">本次研究范围</span><h3>{awaitingMode?'等待输入研究问题':plan.name}</h3></div><span className="preparation-mode">{awaitingMode?'待匹配':pathPending?'匹配中':automatic?'自动匹配':'已选路径'}</span></div>
  <p className="preparation-goal">{awaitingMode?'写下你想研究的问题后，这里会展示匹配的研究路径、范围与报告结构。也可以手动选择研究路径。':plan.goal}</p>
  <dl className="preparation-facts"><div><dt><Target size={14}/>研究对象</dt><dd>{securities.length?`${securities.length} 个标的`:'等待核对标的'}</dd></div><div><dt><Layers size={14}/>历史窗口</dt><dd>{awaitingMode?'匹配后确认':<>近 {plan.historyYears} 年{['A','F'].includes(plan.mode)?' · 固定':''}</>}</dd></div><div><dt><FileText size={14}/>交付内容</dt><dd>{awaitingMode?'匹配后展示':'报告、复核与证据'}</dd></div></dl>
  <div className="preparation-check-heading"><h4>开始前检查</h4><span>按表单顺序 · 点击定位</span></div>
  <div className="preparation-checks" aria-label="输入检查">{checkpoints.map(([id,label],index)=>{
   const pending=issues.some(issue=>issue.id===(id==='settings'?'context':id));
   const optional=id==='materials'&&!materialCount&&!pending;
   const waiting=(id==='path'||id==='settings')&&awaitingMode;
   const status=id==='path'?(awaitingMode?'待输入':pathPending?'匹配中':automatic?'自动匹配':'已选择'):waiting?'待匹配':pending?'待处理':optional?'选填':id==='materials'?`${materialCount} 份`:id==='settings'?'可调整':'已就绪';
   return <Button type="button" variant="ghost" size="sm" key={id} onClick={()=>onNavigate(id)} className={waiting||optional?'input-optional':pending?'needs-input':'input-ready'} aria-label={`${label}：${status}，定位修改`}><span className="preparation-check-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span className="preparation-check-label">{label}</span><small>{status}</small><ArrowUpRight size={14} className="preparation-check-arrow" aria-hidden="true"/></Button>;
  })}</div>
  {issues.filter(issue=>issue.id==='service').map(issue=><p className="preparation-issue" key={issue.id} role="status">{issue.message}。输入可以继续编辑并暂存。</p>)}
  {notes.length>0&&<ul className="preparation-notes">{notes.map(note=><li key={note}>{note}</li>)}</ul>}
  {!awaitingMode&&<details className="preparation-outline"><summary><span>交付预览<small>{plan.output.sections.length} 项内容</small></span><span className="preparation-outline-action"><span className="preparation-expand">展开</span><span className="preparation-collapse">收起</span><ChevronDown size={15}/></span></summary><div className="preparation-delivery"><ResearchScopeSummary plan={plan}/><p className="preparation-delivery-note">实际资料覆盖与数据缺口会在报告中列明，结论可回查审计记录与证据来源。</p></div></details>}
 </section>;
}
