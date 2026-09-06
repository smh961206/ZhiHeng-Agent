import {Check, ChevronDown} from 'lucide-react';
import {Badge} from './ui/badge';
import {Button} from './ui/button';
import {Collapsible, CollapsibleTrigger, CollapsibleContent} from './ui/collapsible';
import {createResearchPlan} from '../../shared/research-framework.mjs';
import {quickScreenCopy} from '../../shared/quick-screen-copy.mjs';
import './quick-screen-summary.css';

const defaultPlan = createResearchPlan({mode: 'A'});

export default function QuickScreenSummary({plan = defaultPlan, compact = false, showGoal = true, showFacts = true}) {
 const sections = plan.output?.sections || [];
 const actions = plan.output?.actions || [];
 const details = <div className="quick-screen-details">
  <section><h4>你会得到</h4>{sections.length ? <ul className="quick-screen-deliverables">{sections.map(item => <li key={item.id}><Check size={14} aria-hidden="true"/>{item.title}</li>)}</ul> : <p>此记录未保存交付清单，可在报告与执行轨迹中查看。</p>}</section>
  <section><h4>研究会关注</h4><div className="quick-screen-modules">{plan.modules?.map(item => <Badge variant="outline" key={item}>{item}</Badge>)}</div>{!showFacts && actions.length > 0 && <p>筛选结论：{actions.join(' · ')}</p>}<p>{quickScreenCopy.delivery}</p>{!showFacts && <p>{quickScreenCopy.evidence}</p>}<p>{quickScreenCopy.boundary}</p></section>
 </div>;
 return <div className="quick-screen-summary">
  {showGoal && <p className="quick-screen-goal">{quickScreenCopy.goal}</p>}
  {showFacts && <><dl className="quick-screen-facts">
   <div><dt>资料范围</dt><dd>{plan.historyYears === 5 ? quickScreenCopy.period : plan.historyYears ? `近 ${plan.historyYears} 年` : '范围未记录'}</dd><small>{quickScreenCopy.periodDetail}</small></div>
   <div><dt>筛选目标</dt><dd>{quickScreenCopy.objective}</dd>{actions.length > 0 && <small>{actions.join(' · ')}</small>}</div>
  </dl>
  <p className="quick-screen-evidence">{quickScreenCopy.evidence}</p></>}
  {compact ? <Collapsible className="quick-screen-more"><CollapsibleTrigger asChild><Button type="button" variant="ghost">筛选内容与研究边界<ChevronDown size={15} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent>{details}</CollapsibleContent></Collapsible> : details}
 </div>;
}
