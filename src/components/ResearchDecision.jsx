import {useState} from 'react';
import {ArrowUpRight,BarChart3,RefreshCw,Target} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './ui/sheet';
import {modeOf} from '../lib/research-mode';
import './research-decision.css';

const gateLabels={data:'数据口径',quality:'公司质量',valuation:'估值适配',risk:'风险定价'};
const gateStates={passed:'已检查',limited:'存在限制',not_applicable:'不适用',failed:'未通过'};
const screenActions={淘汰:'当前证据下暂不进入后续研究；关键新证据出现时可重新评估。',观察池:'先跟踪关键变化、补齐资料，再判断是否值得深入。',深度研究:'值得进一步验证长期逻辑、风险与估值假设。'};
function SummarySection({number,title,count,children,className=''}){
 return <section className={`rd-summary-section ${className}`} aria-label={title}><div className="rd-summary-section-heading"><span aria-hidden="true">{number}</span><h3>{title}</h3>{count>0&&<small>{count} 项</small>}</div>{children}</section>;
}
function ScoreSummary({scores}){
 if(!scores?.length)return null;
 const complete=scores.length===6&&new Set(scores.map(item=>item.id)).size===6&&scores.every(item=>Number.isFinite(item.score)&&Number.isFinite(item.max)&&item.max>0&&item.score>=0&&item.score<=item.max)&&scores.reduce((sum,item)=>sum+item.max,0)===100;
 const total=complete?Number(scores.reduce((sum,item)=>sum+item.score,0).toFixed(10)):null;
 return <section className="rd-summary-scores" aria-label="六维评分">
  <header className="rd-score-header"><div className="rd-score-title"><BarChart3 size={20} aria-hidden="true"/><h3>六维评分</h3><small>{scores.length} 个维度</small></div><div className="rd-score-total" data-complete={complete}><span>总分</span><strong>{complete?<>{total}<small> / 100</small></>:'待核实'}</strong></div></header>
  <div className="rd-score-content"><div className="rd-score-breakdown">{scores.map(item=>{
   const scored=typeof item.score==='number'&&Number.isFinite(item.score);
   const hasMax=typeof item.max==='number'&&Number.isFinite(item.max)&&item.max>0;
   return <div key={item.id} className="rd-score-dimension" data-scored={scored}>
    <div className="rd-score-dimension-heading"><span>{item.label||item.id}</span><strong>{scored?item.score:'待核实'}{scored&&hasMax&&<small> / {item.max}</small>}</strong></div>
    {scored&&hasMax&&<div className="rd-score-meter" aria-hidden="true"><span style={{width:Math.max(0,Math.min(100,item.score/item.max*100))+'%'}}/></div>}
    <p>{item.reason}</p>
   </div>;
  })}</div><p className="rd-score-note">评分用于研究比较；未核实的维度保留缺口，不按零分处理。</p></div>
 </section>;
}
export default function ResearchDecision({job,onUpdate,onDeepen}){
 const [expanded,setExpanded]=useState(false);
 const decision=job.result?.decision;
 const quick=modeOf(job)==='A',update=modeOf(job)==='C';
 if(!decision)return onUpdate?<div className="rd-follow-up"><Button variant="outline" size="sm" onClick={onUpdate}><RefreshCw size={15}/>以本报告更新财报</Button></div>:null;
 return <Sheet open={expanded} onOpenChange={setExpanded}><Card className="rd-decision rd-decision-compact rd-decision-readable rd-decision-digest"><CardContent>
  <div className="rd-decision-heading"><strong><Target size={19}/>{quick?'筛选摘要':update?'财报更新摘要':modeOf(job)==='D'?'比较总览':'研究摘要'}</strong><div className="rd-decision-tags"><Badge className="rd-action-tag">{decision.action}</Badge><Badge variant="outline" className="rd-confidence-tag" data-confidence={decision.confidence}>置信度 · {decision.confidence}</Badge>{decision.baselineStatus==='new_baseline'&&<Badge variant="secondary">本期基线</Badge>}</div>{decision.dataAsOf&&<span>数据截至 {decision.dataAsOf}</span>}</div>
  <p className="rd-decision-summary">{decision.summary}</p>
   <div className="rd-decision-actions">
    <SheetTrigger asChild><Button type="button" variant="outline" className="rd-decision-disclosure"><span className="rd-disclosure-copy"><span>判断依据与验证条件</span>{decision.missingData?.length>0&&<span className="rd-disclosure-count">{decision.missingData.length} 项待核实</span>}</span><span className="rd-disclosure-state">展开<ArrowUpRight size={14} aria-hidden="true"/></span></Button></SheetTrigger>
    {quick&&decision.action==='深度研究'&&onDeepen&&<Button variant="default" size="sm" onClick={onDeepen} title="将标的与待验证问题载入工作台，提交后才开始新任务">准备深度研究<ArrowUpRight size={15}/></Button>}
    {onUpdate&&<Button variant="ghost" size="sm" onClick={onUpdate} title="沿用本报告作为对照，载入工作台后提交才开始新任务"><RefreshCw size={15}/>以本报告更新财报</Button>}
   </div>
 </CardContent></Card>
 <SheetContent className="research-detail rd-decision-sheet">
  <SheetHeader><SheetTitle>判断依据与验证条件</SheetTitle><SheetDescription>摘要的补充说明，完整分析请阅读报告正文。</SheetDescription></SheetHeader>
  <div className="rd-decision-sheet-body"><div className="rd-decision-readable rd-decision-evidence">
   <ScoreSummary scores={decision.scores}/>
   <p className="rd-evidence-summary">{decision.summary}</p>
   <div className="rd-evidence-content">
  {update&&<p className="rd-muted">{decision.baselineStatus==='new_baseline'?'未提供旧投资判断，本次建立财报基线；财报期间变化不等于研究动作升级。':'研究动作表示旧判断相对新证据的调整；经营改善、估值参数和价格变化请分别核对。'}</p>}
  {quick&&<div className="rd-screen-decision-note"><p>{screenActions[decision.action]}</p>{decision.missingData?.length>0&&<p>还有 {decision.missingData.length} 项资料待核实，见下方判断依据。报告已完成表示本轮筛选结束。</p>}</div>}
   {!!decision.gates?.length&&<SummarySection number="01" title="判断依据" count={decision.gates.length}>
    <div className="rd-decision-gates">{decision.gates.map(gate=><div key={gate.id} className="rd-summary-gate"><div className="rd-summary-gate-heading"><h4>{gateLabels[gate.id]||gate.id}</h4><Badge variant="outline" data-status={gate.status}>{gateStates[gate.status]||gate.status}</Badge></div><p>{gate.reason}</p></div>)}</div>
   </SummarySection>}
   {!!decision.falsifiers?.length&&<SummarySection number="02" title="重审条件" count={decision.falsifiers.length}>
    <p className="rd-summary-section-intro">什么发生时，需要重审判断？</p><ol className="rd-summary-triggers">{decision.falsifiers.map((item,index)=><li key={`${index}:${item}`}><span aria-hidden="true">{String(index+1).padStart(2,'0')}</span><p>{item}</p></li>)}</ol>
   </SummarySection>}
   {!!decision.missingData?.length&&<SummarySection number="03" title="信息缺口" count={decision.missingData.length} className="rd-summary-missing">
    <p className="rd-summary-section-intro">这些资料仍待核实，阅读结论时请一并考虑。</p><ul>{decision.missingData.map((item,index)=><li key={`${index}:${item}`}>{item}</li>)}</ul>
   </SummarySection>}
   {(decision.valuation?.explanation||decision.portfolio?.summary)&&<SummarySection number="04" title="估值与使用边界">
    <div className="rd-summary-boundaries">{decision.valuation?.explanation&&<div><h4>估值边界</h4><p>{decision.valuation.explanation}</p></div>}{decision.portfolio?.summary&&<div><h4>组合与仓位</h4><p className="rd-decision-boundary">{decision.portfolio.summary}</p></div>}</div>
   </SummarySection>}
   <small className="rd-summary-footnote">模型复核意见与程序结构校验共同保留；不代表事实被独立证实。</small>
   </div></div></div>
 </SheetContent></Sheet>;
}
