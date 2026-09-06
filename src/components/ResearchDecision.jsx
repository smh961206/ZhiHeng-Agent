import {ChevronDown,RefreshCw,ShieldCheck,Target} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';

const gateLabels={data:'数据口径',quality:'公司质量',valuation:'估值适配',risk:'风险定价'};
const gateStates={passed:'已检查',limited:'存在限制',not_applicable:'不适用',failed:'未通过'};
export default function ResearchDecision({job,onUpdate}){
 const decision=job.result?.decision;
 if(!decision)return onUpdate?<div className="rd-follow-up"><Button variant="outline" size="sm" onClick={onUpdate}><RefreshCw size={15}/>以本报告更新财报</Button></div>:null;
 return <Card className="rd-decision"><CardContent>
  <div className="rd-decision-heading"><strong><Target size={17}/>研究判断</strong><span>{decision.dataAsOf}</span></div>
  <div className="rd-decision-tags"><Badge>{decision.action}</Badge><Badge variant="outline">置信度 · {decision.confidence}</Badge>{decision.baselineStatus==='new_baseline'&&<Badge variant="secondary">本期基线</Badge>}</div>
  <p className="rd-decision-summary">{decision.summary}</p>
  <Collapsible><CollapsibleTrigger asChild><Button variant="ghost" className="rd-decision-disclosure">判断依据与验证条件<ChevronDown size={14}/></Button></CollapsibleTrigger><CollapsibleContent>
   <div className="rd-decision-gates">{decision.gates?.map(gate=><div key={gate.id}><span><ShieldCheck size={14}/>{gateLabels[gate.id]||gate.id}<Badge variant="outline" data-status={gate.status}>{gateStates[gate.status]||gate.status}</Badge></span><p>{gate.reason}</p></div>)}</div>
   <h3>什么发生时，需要重审判断？</h3><ol>{decision.falsifiers?.map(item=><li key={item}>{item}</li>)}</ol>
   {!!decision.missingData?.length&&<><h3>信息缺口</h3><ul>{decision.missingData.map(item=><li key={item}>{item}</li>)}</ul></>}
   {decision.valuation&&<><h3>估值边界</h3><p>{decision.valuation.explanation}</p></>}
   {decision.portfolio&&<p className="rd-decision-boundary">{decision.portfolio.summary}</p>}
   {decision.scores&&<><h3>六维评分</h3><div className="rd-score-breakdown">{decision.scores.map(item=><div key={item.id}><span>{item.label}</span><strong>{item.score??'待核实'}{item.score!=null&&' / '+item.max}</strong><p>{item.reason}</p></div>)}</div></>}
   <small>模型复核意见与程序结构校验共同保留；不代表事实被独立证实。</small>
  </CollapsibleContent></Collapsible>
  {onUpdate&&<div className="rd-decision-follow"><span>新披露出现后，回到这份判断。</span><Button variant="outline" size="sm" onClick={onUpdate}><RefreshCw size={15}/>以本报告更新财报</Button></div>}
 </CardContent></Card>;
}
