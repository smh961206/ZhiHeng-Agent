import {ArrowUpRight,ChevronDown,RefreshCw,ShieldCheck,Target} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {modeOf} from '../lib/research-mode';

const gateLabels={data:'数据口径',quality:'公司质量',valuation:'估值适配',risk:'风险定价'};
const gateStates={passed:'已检查',limited:'存在限制',not_applicable:'不适用',failed:'未通过'};
const screenActions={淘汰:'当前证据下暂不进入后续研究；关键新证据出现时可重新评估。',观察池:'先跟踪关键变化、补齐资料，再判断是否值得深入。',深度研究:'值得进一步验证长期逻辑、风险与估值假设。'};
export default function ResearchDecision({job,onUpdate,onDeepen}){
 const decision=job.result?.decision;
 const quick=modeOf(job)==='A';
 if(!decision)return onUpdate?<div className="rd-follow-up"><Button variant="outline" size="sm" onClick={onUpdate}><RefreshCw size={15}/>以本报告更新财报</Button></div>:null;
 return <Card className="rd-decision"><CardContent>
  <div className="rd-decision-heading"><strong><Target size={17}/>{quick?'筛选判断':'研究判断'}</strong><span>{decision.dataAsOf}</span></div>
  <div className="rd-decision-tags"><Badge>{decision.action}</Badge><Badge variant="outline">置信度 · {decision.confidence}</Badge>{decision.baselineStatus==='new_baseline'&&<Badge variant="secondary">本期基线</Badge>}</div>
  <p className="rd-decision-summary">{decision.summary}</p>
  {quick&&<div className="rd-screen-decision-note"><p>{screenActions[decision.action]}</p>{decision.missingData?.length>0&&<p>还有 {decision.missingData.length} 项资料待核实，见下方判断依据。报告已完成表示本轮筛选结束。</p>}</div>}
  <Collapsible><CollapsibleTrigger asChild><Button variant="ghost" className="rd-decision-disclosure">判断依据与验证条件<ChevronDown size={14}/></Button></CollapsibleTrigger><CollapsibleContent>
   <div className="rd-decision-gates">{decision.gates?.map(gate=><div key={gate.id}><span><ShieldCheck size={14}/>{gateLabels[gate.id]||gate.id}<Badge variant="outline" data-status={gate.status}>{gateStates[gate.status]||gate.status}</Badge></span><p>{gate.reason}</p></div>)}</div>
   <h3>什么发生时，需要重审判断？</h3><ol>{decision.falsifiers?.map(item=><li key={item}>{item}</li>)}</ol>
   {!!decision.missingData?.length&&<><h3>信息缺口</h3><ul>{decision.missingData.map(item=><li key={item}>{item}</li>)}</ul></>}
   {decision.valuation&&<><h3>估值边界</h3><p>{decision.valuation.explanation}</p></>}
   {decision.portfolio&&<p className="rd-decision-boundary">{decision.portfolio.summary}</p>}
   {decision.scores&&<><h3>六维评分</h3><div className="rd-score-breakdown">{decision.scores.map(item=><div key={item.id}><span>{item.label}</span><strong>{item.score??'待核实'}{item.score!=null&&' / '+item.max}</strong><p>{item.reason}</p></div>)}</div></>}
   <small>模型复核意见与程序结构校验共同保留；不代表事实被独立证实。</small>
  </CollapsibleContent></Collapsible>
  {quick&&decision.action==='深度研究'&&onDeepen&&<div className="rd-decision-follow rd-screen-next"><span>带入同一标的与待验证问题，确认新任务后开始。</span><Button variant="default" size="sm" onClick={onDeepen}>准备深度研究<ArrowUpRight size={15}/></Button></div>}
  {onUpdate&&<div className="rd-decision-follow"><span>{quick?'出现新财报后，可对照本次筛选判断。':'新披露出现后，回到这份判断。'}</span><Button variant="outline" size="sm" onClick={onUpdate}><RefreshCw size={15}/>以本报告更新财报</Button></div>}
 </CardContent></Card>;
}
