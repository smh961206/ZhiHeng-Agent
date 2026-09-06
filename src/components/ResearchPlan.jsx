import {useEffect,useState} from 'react';
import {ChevronDown,LoaderCircle,Workflow} from 'lucide-react';
import {api,post} from '../lib/api';
import {Card} from './ui/card';
import {Badge} from './ui/badge';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {quickScreenCopy} from '../../shared/quick-screen-copy.mjs';
export default function ResearchPlan({question,mode,depth,portfolio,historyYears,resolution,previousResearch='',baselineJobId='',portfolioContext={}}){
 const [state,setState]=useState({});
 const securities=JSON.stringify(resolution.securities.map(({market,symbol})=>({market,symbol})));
 const ready=!!question.trim()&&!resolution.blocked;
 const key=JSON.stringify([question,mode,depth,portfolio,historyYears,securities,ready,previousResearch,baselineJobId,portfolioContext]);
 useEffect(()=>{
  if(!ready)return;
  const control=new AbortController();
  const timer=setTimeout(()=>api('/api/research/plan',{...post({question,mode,depth,portfolio,historyYears,securities:JSON.parse(securities),previousResearch,baselineJobId:baselineJobId||null,portfolioContext}),signal:control.signal}).then(plan=>{if(!control.signal.aborted)setState({key,plan});}).catch(e=>{if(!control.signal.aborted)setState({key,error:e.message});}),350);
  return()=>{clearTimeout(timer);control.abort();};
 },[key]);
 if(!ready)return null;
 const current=state.key===key?state:{},plan=current.plan;
 const approach=plan?.mode==='A'?plan.researchApproach:null;
 return <Card className="research-plan gap-0" aria-label="本次研究计划"><h3><Workflow size={17}/>本次研究计划</h3>{plan?<><div className="plan-meta"><strong>{plan.name}</strong><span>{plan.mode==='A'&&plan.historyYears===5?quickScreenCopy.period:`近 ${plan.historyYears} 年`} · {plan.securities.length} 个标的</span></div>{approach&&<p className="screen-plan-flow">先读资料 → 缺口查证与计算 → 复核筛选判断</p>}<div className="plan-modules">{plan.modules.map(module=><Badge variant="secondary" key={module}>{module}</Badge>)}{plan.secondaryModules?.map(module=><Badge variant="outline" key={module}>{module}</Badge>)}</div><Collapsible className="plan-details"><CollapsibleTrigger asChild><Button type="button" variant="ghost">交付内容与研究约束<ChevronDown size={14}/></Button></CollapsibleTrigger><CollapsibleContent>{approach&&<div className="screen-plan-questions"><h4>本次查证问题</h4><ol>{approach.steps.map(step=><li key={step.id}><strong>{step.title}</strong><p>{step.question}</p></li>)}</ol></div>}<p>{plan.deliverables.join(' · ')}</p>{plan.output&&<p>将交付：{plan.output.sections.map(item=>item.title).join('、')}，并附研究动作、置信度与证伪条件。</p>}<ul>{plan.constraints.map(text=><li key={text}>{text}</li>)}</ul></CollapsibleContent></Collapsible></>:current.error?<p role="status">计划预览暂不可用：{current.error}。提交时仍由服务端确定研究路径。</p>:<p role="status"><LoaderCircle size={14} className="animate-spin"/>正在匹配研究计划…</p>}</Card>;
}
