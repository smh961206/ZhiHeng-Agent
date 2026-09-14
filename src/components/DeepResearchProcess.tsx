import {useState} from 'react';
import {BookOpen,ChevronDown,Check,ArrowUpRight} from 'lucide-react';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';

export default function DeepResearchProcess({job,onSources}) {
 const [open,setOpen]=useState(job.status==='queued');
 const update=(job.mode||job.plan?.mode)==='C',comparison=(job.mode||job.plan?.mode)==='D';
 const plan=job.plan?.researchApproach;
 const checks=job.status==='completed'?job.result?.researchSummary?.checks:undefined;
 const pending={queued:'任务开始后将逐项查证，当前展示的是验证计划。',running:'正在查证与复核，正式判断将在研究完成后显示。',failed:'研究未完成，尚无通过复核的判断摘要。已完成的调用见执行轨迹。',cancelled:'研究已取消，尚无通过复核的判断摘要。已保存的记录可回看。'}[job.status];
 return <section className="rd-deep-process" aria-label={update?"财报更新验证过程":comparison?"多公司比较验证过程":"深度研究验证过程"}>
  <div className="rd-deep-sequence"><span>{update?"01 明确对照":comparison?"01 明确可比边界":"01 明确问题"}</span><span>{update?"02 核对变化":comparison?"02 逐家查证计算":"02 查证与计算"}</span><span>{update?"03 更新判断":comparison?"03 分别形成判断":"03 形成判断"}</span></div>
  <Collapsible open={open} onOpenChange={setOpen}>
   <CollapsibleTrigger asChild><Button variant="ghost" className="rd-deep-trigger"><BookOpen size={17}/><strong>{update?"更新计划与判断依据":comparison?"比较计划与判断依据":"验证计划与判断依据"}</strong><ChevronDown size={15}/></Button></CollapsibleTrigger>
   <CollapsibleContent className="rd-deep-body">
    <p>{plan?.objective||'此历史记录未保存验证计划。'}</p>
    {plan?.scope&&<p className="rd-muted">资料范围：{plan.scope.period}。以本次实际取得的资料为准。</p>}
    {update&&<p className="rd-muted">{plan?.scope?.comparison||'此记录未保存对照范围，请核对报告说明。'}{job.input?.baseline?.question&&' 对照报告：'+job.input.baseline.question}</p>}
    {plan?.steps?.length>0&&<ol>{plan.steps.map(step=><li key={step.id}><strong>{step.title}</strong><p>{step.question}</p></li>)}</ol>}
    <p className="rd-muted">以上为拟查证问题。实际工具输入、返回与失败见执行轨迹。</p>
    <h3>证据与判断摘要</h3>
    {checks?.length?<><ul className="rd-deep-checks">{checks.map((check,index)=><li key={index}><strong><Check size={14}/>{check.topic}</strong><p>{check.assessment}</p><small>待核实：{check.unresolved}</small>{check.sourceIds?.length>0&&<Button variant="link" onClick={onSources}>查看依据 {check.sourceIds.join('、')}<ArrowUpRight size={13}/></Button>}</li>)}</ul><p className="rd-muted">{job.result.researchSummary.notice}</p></>:<p role="status">{pending||'此历史记录未保存判断摘要，请结合正式报告、审计与来源阅读。'}</p>}
   </CollapsibleContent>
  </Collapsible>
 </section>;
}
