import {Check} from 'lucide-react';
import {researchPresentation} from '../config/research-presentation';
import './research-scope.css';

export default function ResearchScopeSummary({plan}) {
 const guide=researchPresentation[plan?.mode],sections=plan?.output?.sections||[];
 return <div className="research-scene-summary">
  <div className="research-scene-outcome"><span>你会得到</span><strong>{guide?.result||'以本次研究范围为准'}</strong></div>
  <ul className="research-scene-deliverables">{sections.map(section=><li key={section.id}><Check size={14} aria-hidden="true"/>{section.title}</li>)}</ul>
  {guide?.sceneNote&&<p className="research-scene-note">{guide.sceneNote}</p>}
 </div>;
}
