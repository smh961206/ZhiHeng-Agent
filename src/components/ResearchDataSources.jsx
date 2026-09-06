import {researchDataCopy,researchDataSources,researchDataBoundaries} from '../../shared/research-data-copy.mjs';

export default function ResearchDataSources(){
 return <section id="fw-data-sources" className="fw-section" aria-labelledby="fw-data-sources-title">
  <div className="fw-section-heading"><h2 id="fw-data-sources-title">数据来源与覆盖</h2><p>{researchDataCopy.handbook}</p></div>
  <dl className="fw-data-sources">{researchDataSources.map(source=><div key={source.id}><dt>{source.title}</dt><dd>{source.description}</dd></div>)}</dl>
  <div className="fw-data-boundaries">{researchDataBoundaries.map(([title,description])=><div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div>
 </section>;
}
