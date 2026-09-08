import {Check} from 'lucide-react';
import {researchPresentation,researchOutcomeCopy} from '../config/research-presentation';
import './research-scope.css';

export default function ResearchScopeSummary({plan}) {
 const guide=researchPresentation[plan?.mode],sections=plan?.output?.sections||[];
 return <div className="research-scene-summary">
  <div className="research-scene-outcome"><span>你会得到</span><strong>{researchOutcomeCopy(plan)}</strong></div>
  <ul className="research-scene-deliverables">{sections.map(section=><li key={section.id}><Check size={14} aria-hidden="true"/>{section.title}</li>)}</ul>
  {guide?.sceneNote&&<p className="research-scene-note">{guide.sceneNote}</p>}
 </div>;
}
