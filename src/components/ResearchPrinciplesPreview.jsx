import {Link} from 'react-router';
import {ArrowUpRight,BookOpen,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import './research-reference.css';

const boundaries=[
 ['证据有出处','不编造缺失数据，重要结论须有依据。'],
 ['指标有边界','不凭单一指标、评分或高股息作买入判断。'],
 ['结论可推翻','不迎合股价调整参数，留下可验证的证伪条件。'],
];

export default function ResearchPrinciplesPreview(){
 return <section id="fw-principles" className="fw-section fw-principles-preview" aria-labelledby="fw-principles-title">
  <div className="fw-section-heading"><span>05 / 研究原则</span><h2 id="fw-principles-title">先看证据，再做判断。</h2></div>
  <div className="fw-principle-panel"><span className="fw-principle-label">每份研究都围绕一个问题</span><p className="fw-principle-question">以当前价格成为长期股东，承担的风险与可能获得的回报是否匹配？</p>
   <ul className="fw-boundary-preview">{boundaries.map(([title,copy])=><li key={title}><h3>{title}</h3><p>{copy}</p></li>)}</ul>
   <div className="fw-reference-links"><Button asChild variant="outline"><Link to="/handbook"><ShieldCheck size={16}/>查看研究标准与纪律<ArrowUpRight size={15}/></Link></Button><Button asChild variant="ghost"><Link to="/handbook?tab=glossary"><BookOpen size={16}/>查看术语速查<ArrowUpRight size={15}/></Link></Button></div>
  </div>
 </section>;
}
