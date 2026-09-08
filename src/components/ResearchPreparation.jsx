import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './ui/sheet';
import './research-method.css';
import {ArrowUpRight,FileText,Layers,Target} from 'lucide-react';
import {Button} from './ui/button';
import ResearchScopeSummary from './ResearchScopeSummary';
import {researchDataCopy} from '../../shared/research-data-copy.mjs';
import './research-preparation.css';
import './execution-ui.css';

export default function ResearchPreparation({preparation,materialCount=0,automatic,awaitingMode=false,pathPending=false,showMaterials=true,onNavigate}){
 const {plan,issues,notes,securities}=preparation;
 const checkpoints=[['question','你想研究什么？'],['path','研究路径'],['securities',researchDataCopy.title],...(showMaterials?[['materials','补充资料']]:[]),['settings','研究设置']];
 return <section className="research-preparation" aria-label="本次研究范围">
  <div className="preparation-heading"><div><span className="preparation-eyebrow">本次研究范围</span><h3>{awaitingMode?'等待输入研究问题':pathPending?'正在确认研究路径':plan.name}</h3></div><span className="preparation-mode">{awaitingMode?'待匹配':pathPending?'匹配中':automatic?'自动匹配':'已选路径'}</span></div>
  <p className="preparation-goal">{awaitingMode?'写下你想研究的问题后，这里会展示匹配的研究路径、范围与报告结构。也可以手动选择研究路径。':pathPending?'正在根据问题确认研究范围；识别完成后会展示相应设置与交付内容。':plan.goal}</p>
  {plan.execution&&!awaitingMode&&!pathPending&&<div className="preparation-execution"><strong>本次包含组合执行复核</strong><p>{plan.portfolio.complete?'结合持仓约束，核对交易依据与执行条件。':'持仓信息未齐，先交付条件式框架。'}</p><Button variant="link" type="button" onClick={()=>onNavigate('execution')}>补充执行背景<ArrowUpRight size={13}/></Button></div>}
  <dl className="preparation-facts"><div><dt><Target size={14}/>研究对象</dt><dd>{securities.length?`${securities.length} 个标的`:'等待核对标的'}</dd></div><div><dt><Layers size={14}/>历史窗口</dt><dd>{awaitingMode||pathPending?'匹配后确认':<>近 {plan.historyYears} 年{['A','F'].includes(plan.mode)?' · 固定':''}</>}</dd></div><div><dt><FileText size={14}/>交付内容</dt><dd>{awaitingMode||pathPending?'匹配后展示':'报告、复核与证据'}</dd></div></dl>
  <div className="preparation-check-heading"><h4>开始前检查</h4><span>按表单顺序 · 点击定位</span></div>
  <div className="preparation-checks" aria-label="输入检查">{checkpoints.map(([id,label],index)=>{
   const pending=issues.some(issue=>issue.id===(id==='settings'?'context':id));
   const optional=id==='materials'&&!materialCount&&!pending;
   const waiting=(id==='path'||id==='settings')&&awaitingMode;
   const status=id==='path'?(awaitingMode?'待输入':pathPending?'匹配中':automatic?'自动匹配':'已选择'):waiting?'待匹配':pending?'待处理':optional?'选填':id==='materials'?`${materialCount} 份`:id==='settings'?'可调整':'已就绪';
   return <Button type="button" variant="ghost" size="sm" key={id} onClick={()=>onNavigate(id)} className={waiting||optional?'input-optional':pending?'needs-input':'input-ready'} aria-label={`${label}：${status}，定位修改`}><span className="preparation-check-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span className="preparation-check-label">{label}</span><small>{status}</small><ArrowUpRight size={14} className="preparation-check-arrow" aria-hidden="true"/></Button>;
  })}</div>
  {issues.filter(issue=>issue.id==='service').map(issue=><p className="preparation-issue" key={issue.id} role="status">{issue.message}。输入可以继续编辑并暂存。</p>)}
  {!pathPending&&notes.length>0&&<ul className="preparation-notes">{notes.map(note=><li key={note}>{note}</li>)}</ul>}
  {!awaitingMode&&<Sheet><SheetTrigger asChild><Button type="button" variant="outline" disabled={pathPending||Boolean(preparation.baseline?.blocking)} className="preparation-delivery-trigger"><span>查看交付范围 · {plan.output.sections.length} 项内容</span><ArrowUpRight size={15}/></Button></SheetTrigger><SheetContent className="preparation-delivery-sheet"><SheetHeader><SheetTitle>{plan.name} · 交付范围</SheetTitle><SheetDescription>这是本次拟交付的内容；实际资料缺口与限制会随报告列明。</SheetDescription></SheetHeader><ResearchScopeSummary plan={plan}/></SheetContent></Sheet>}
 </section>;
}
