import {researchDataCopy,researchDataSources,researchDataBoundaries} from '../../shared/research-data-copy.mjs';
import {ChevronDown,Database} from 'lucide-react';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';

export default function ResearchDataSources(){
 return <section id="fw-data-sources" className="fw-section" aria-labelledby="fw-data-sources-title">
  <div className="fw-section-heading"><h2 id="fw-data-sources-title">证据与数据边界</h2><p>先核对时点、口径和实际读取范围，再判断证据能支持什么结论。接入或读取成功，不等于资料齐全或已经核实。</p></div>
  <div className="fw-data-boundaries">{researchDataBoundaries.map(([title,description])=><div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div>
  <Collapsible className="fw-source-details fw-boundary-group">
   <CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span><span className="fw-reference-label"><Database size={18}/><strong>查看数据来源与覆盖</strong></span><span className="fw-reference-summary">行情、财务、官方披露、网页与用户补充资料的来源说明。</span></span><ChevronDown size={18}/></Button></CollapsibleTrigger>
   <CollapsibleContent><p className="fw-source-intro">{researchDataCopy.handbook}</p><dl className="fw-data-sources">{researchDataSources.map(source=><div key={source.id}><dt>{source.title}</dt><dd>{source.description}</dd></div>)}</dl></CollapsibleContent>
  </Collapsible>
 </section>;
}
