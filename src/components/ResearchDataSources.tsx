import {researchDataBoundaries} from '../domain/research-data-copy.ts';

export default function ResearchDataSources(){
 return <section id="fw-data-sources" className="fw-section" aria-labelledby="fw-data-sources-title">
  <div className="fw-section-heading"><h2 id="fw-data-sources-title">证据与数据边界</h2><p>先核对时点、口径和实际读取范围，再判断证据能支持什么结论。接入或读取成功，不等于资料齐全或已经核实。</p></div>
  <div className="fw-data-boundaries">{researchDataBoundaries.map(([title,description])=><div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div>
 </section>;
}
