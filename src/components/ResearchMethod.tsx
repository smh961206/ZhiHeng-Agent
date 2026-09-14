import {KnowledgeHighlights} from './ResearchKnowledge';
import {depthGuidance} from '../domain/research-knowledge.ts';
import {Link} from 'react-router';
import {ArrowRight,BookOpen,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {researchMethodology} from '../domain/valuation-policy.ts';
import './research-reference.css';
import './research-method.css';

export function ResearchMethodSteps({compact=false}){
 const StepHeading=compact?'h3':'h4';
 return <ol className={'research-method-steps'+(compact?' is-compact':'')} aria-label="研究判断顺序">{researchMethodology.map((item,index)=><li key={item.id}><span aria-hidden="true">0{index+1}</span><div><StepHeading>{item.title}</StepHeading><p>{item.description}</p></div></li>)}</ol>;
}
export default function ResearchMethod(){
 return <section className="research-method" aria-labelledby="research-method-title">
  <header className="handbook-chapter-heading method-chapter-heading"><span className="handbook-chapter-kicker">理解判断如何形成</span><h2 id="research-method-title">从问题、证据到研究结论</h2><p>不同研究路径共享同一套证据原则，再由问题决定分析范围；估值适用性和资料缺口共同影响结论强度。</p></header>
  <section className="fw-section" aria-label="研究判断顺序">
   <div className="fw-principle-panel"><span className="fw-principle-label">统一研究框架</span><p className="fw-principle-question">从公司质量、合理价值到行动条件，依次完成四步判断。</p>
    <div className="fw-principle-details"><h3 className="fw-principle-details-title">研究判断按四步推进</h3>
     <div className="fw-dividend-principle method-judgement-summary"><span>判断顺序</span><p>从业务与竞争优势出发，用财务、现金流和股东回报验证，再核对估值与敏感性，最后明确结论、证据缺口和行动条件。</p></div>
     <ol className="fw-principle-chain method-judgement-chain" aria-label="研究判断顺序">{researchMethodology.map((item,index)=><li key={item.id}>{index>0&&<ArrowRight size={13} aria-hidden="true"/>}<span><small aria-hidden="true">{String(index+1).padStart(2,'0')}</small>{item.title}</span></li>)}</ol>
    </div>
   </div>
   <div className="fw-reference-links"><Button variant="outline" asChild><Link to="/workbench">带着问题开始<ArrowRight size={16} aria-hidden="true"/></Link></Button></div>
  </section>
  <section id="method-quality" tabIndex={-1} className="fw-section method-quality" aria-labelledby="method-quality-title">
   <div className="fw-section-heading"><span>从问题到结论</span><h3 id="method-quality-title">问题决定范围，证据决定结论强度</h3><p>开始前确认研究问题、公司、路径和资料；平台按研究目的推进查证、计算与复核，无法确认的内容会明确保留。</p></div>
   <ol className="method-quality-steps" aria-label="研究推进原则">
    <li><span aria-hidden="true">01</span><h4>问题决定研究范围</h4><p>快速筛选、深度研究、财报更新、公司比较、组合分析和股东回报各有不同重点。</p></li>
    <li><span aria-hidden="true">02</span><h4>重要判断回到依据</h4><p>关键数字结合原始资料和计算核对；无法确认的内容不会为了形成结论而补齐。</p></li>
    <li><span aria-hidden="true">03</span><h4>结论保留适用条件</h4><p>报告同时说明置信度、资料缺口、风险和需要重新审视判断的条件。</p></li>
   </ol>
   <div className="method-quality-record"><ShieldCheck size={18} aria-hidden="true"/><div><h4>研究设置保持简单</h4><p>开始前只确认问题、标的、研究路径、补充资料和该路径对应的设置。其余处理由平台自动完成。</p><p>研究完成后，先读结论和限制，再从审计记录与证据来源核对重要依据。</p><Link to="/handbook?tab=guide#usage-report">查看报告核对指南<ArrowRight size={15} aria-hidden="true"/></Link></div></div>
  </section>
  <section id="method-loading" tabIndex={-1} className="fw-section" aria-labelledby="method-loading-title">
   <div className="fw-section-heading"><h3 id="method-loading-title">每项研究保留当时的资料与规则</h3><p>研究范围随问题确定，实际使用的依据随任务保存，方便以后按当时的信息重新核对判断。</p></div>
   <KnowledgeHighlights/>
   <div className="method-detail-copy"><h4>深度研究怎样选择展开程度</h4><dl>{Object.entries(depthGuidance).map(([depth,copy])=><div key={depth}><dt><strong>{{Quick:'简明研究',Standard:'标准研究',Deep:'完整展开'}[depth]}</strong></dt><dd>{copy}</dd></div>)}</dl><p>其他专项始终保留必要的核对步骤。只有明确提出需要图示时，报告才会加入相应图表。</p><p>继续研究沿用原资料时点；重新开始会重新采集和核对；重试保存只处理暂存结果，不重新研究。</p><p>在详情页打开“研究过程”，再展开“本次研究依据”，即可查看当时的规则版本与实际使用记录。旧记录没有保存的部分会显示“未记录”。</p></div>
  </section>
  <section className="fw-section" aria-labelledby="method-evidence-title">
   <div className="fw-section-heading"><h3 id="method-evidence-title">估值与证据怎样配合</h3><p>先判断估值方法是否适用，再检查参数和证据质量；资料越有限，结论就越需要保留条件。</p></div>
   <div className="method-evidence-grid">
    <article className="method-evidence-column"><header><span className="method-evidence-icon"><BookOpen size={18} aria-hidden="true"/></span><div><span className="method-evidence-number">01</span><h4>估值方法与边界</h4><p>选择适合业务的主方法，再用独立方法交叉验证。</p></div></header><ul><li>只能使用一种方法时，明确说明例外与限制。</li><li>情景变化不算第二种方法；股息率只作现金回报锚。</li></ul></article>
    <article className="method-evidence-column"><header><span className="method-evidence-icon"><ShieldCheck size={18} aria-hidden="true"/></span><div><span className="method-evidence-number">02</span><h4>证据核对与结论强度</h4><p>统一期间与数据口径，再判断证据能支持多强的结论。</p></div></header><ul><li>分别核对单季与累计、币种、股类和报告期。</li><li>无法核实的内容保留缺口，并相应降低结论强度。</li></ul></article>
   </div>
  </section>
  <div className="fw-reference-links"><Button variant="outline" asChild><Link to="/handbook?tab=discipline">查阅研究纪律<ArrowRight size={15} aria-hidden="true"/></Link></Button></div>
 </section>;
}
