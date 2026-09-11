import {KnowledgeHighlights} from './ResearchKnowledge';
import {depthGuidance} from '../../shared/research-knowledge.mjs';
import {Link} from 'react-router';
import {ArrowRight,BookOpen,ChevronDown,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {frameworkVersion} from '../../shared/research-framework.mjs';
import {researchMethodology} from '../../shared/valuation-policy.mjs';
import './research-reference.css';
import './research-method.css';

export function ResearchMethodSteps({compact=false}){
 const StepHeading=compact?'h3':'h4';
 return <ol className={'research-method-steps'+(compact?' is-compact':'')} aria-label="研究判断顺序">{researchMethodology.map((item,index)=><li key={item.id}><span aria-hidden="true">0{index+1}</span><div><StepHeading>{item.title}</StepHeading><p>{item.description}</p></div></li>)}</ol>;
}
export default function ResearchMethod(){
 return <section className="research-method" aria-labelledby="research-method-title">
  <header className="handbook-chapter-heading method-chapter-heading"><h2 id="research-method-title">研究方法</h2><p>了解从公司分析到研究判断的基本顺序，按主题查阅估值方法与证据处理。</p></header>
  <section className="fw-section" aria-labelledby="method-sequence-title">
   <div className="fw-section-heading"><h3 id="method-sequence-title">研究的基本顺序</h3><p>六种路径共用同一套证据规则，按问题决定研究范围和交付深度。</p></div>
   <div className="fw-principle-panel"><span className="fw-principle-label">证据优先的研究方法</span><p className="fw-principle-question">先判断公司与价值，再讨论执行。</p>
    <Collapsible className="fw-principle-details"><CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span>查看研究判断的四个步骤</span><ChevronDown size={18} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent><ResearchMethodSteps/></CollapsibleContent></Collapsible>
   </div>
   <div className="fw-reference-links"><Button variant="outline" asChild><Link to="/workbench">带着问题开始<ArrowRight size={16} aria-hidden="true"/></Link></Button></div>
  </section>
  <section id="method-loading" tabIndex={-1} className="fw-section" aria-labelledby="method-loading-title">
   <div className="fw-section-heading"><h3 id="method-loading-title">规则按需使用，研究依据可回查</h3><p>研究按问题加载相应规则，保留实际读取依据；计算与判断仍遵守各自的核验条件。</p></div>
   <details className="method-version-note"><summary>研究规则版本与历史报告</summary><p>当前研究规则为 V{frameworkVersion}，与顶部的平台功能版本分别管理。V4.8 更新模型接入能力，未修改本套投资研究规则。报告中的版本来自任务保存的记录，历史报告保留原规则与快照；版本缺失时不补写。</p></details>
   <KnowledgeHighlights/>
   <div className="method-detail-copy"><h4>深度研究怎样选择展开程度</h4><dl>{Object.entries(depthGuidance).map(([depth,copy])=><div key={depth}><dt><strong>{{Quick:'简明研究',Standard:'标准研究',Deep:'完整展开'}[depth]}</strong></dt><dd>{copy}</dd></div>)}</dl><p>其他专项始终保留必需核对流程。交易执行说明与作战图分别触发；仅在明确要求作战图、估值图或买入区间图时加入图示规则。</p><p>同一框架版本内，新修订通过完整校验后供新任务使用。进行中的任务及可恢复的中断任务沿用原快照；历史报告不改写。跨程序版本升级仍需要部署匹配的服务。</p><p>在详情页的“研究过程”中展开“本次规则依据”，查看实际使用的规则与读取原因。旧记录没有保存的内容会显示“未记录”，不会按当前目录补齐。</p></div>
  </section>
  <section className="fw-section" aria-labelledby="method-evidence-title">
   <div className="fw-section-heading"><h3 id="method-evidence-title">估值与证据处理</h3><p>先核对估值适用性与证据质量，再形成与资料充分程度相匹配的研究判断。</p></div>
   <div className="fw-data-boundaries"><div><h4>估值如何使用</h4><p>先选适合业务的主估值，再检查关键参数、情景与敏感性。</p></div><div><h4>证据不足怎么办</h4><p>保留缺口与影响，降低判断强度；不适用的估值不填零，也不补造参数。</p></div></div>
   <div className="fw-boundary-grid method-detail-grid">
    <Collapsible className="fw-boundary-group"><CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span><span className="fw-reference-label"><BookOpen size={18} aria-hidden="true"/><strong>查看估值使用说明</strong></span><span className="fw-reference-summary">交叉验证、方法限制与股息收益率锚的适用边界。</span></span><ChevronDown size={18} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent><div className="method-detail-copy"><p>完整深度研究原则上用独立方法交叉验证；只能采用一种方法时，说明例外与限制。</p><p>同一模型的情景变化不算第二种方法。股息收益率锚用于观察现金回报条件，不能直接替代企业价值。</p></div></CollapsibleContent></Collapsible>
    <Collapsible className="fw-boundary-group"><CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span><span className="fw-reference-label"><ShieldCheck size={18} aria-hidden="true"/><strong>查看证据核对与结果阅读</strong></span><span className="fw-reference-summary">分别核对数据口径，按需查看判断依据、审计与来源。</span></span><ChevronDown size={18} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent><div className="method-detail-copy"><p>单季与累计、币种、股类和报告期分别核对。</p><p>研究完成后，先读简要结论，再进入正文。判断依据、审计和来源可按需查看。</p></div></CollapsibleContent></Collapsible>
   </div>
  </section>
  <div className="fw-reference-links"><Button variant="outline" asChild><Link to="/handbook?tab=discipline">查阅研究纪律<ArrowRight size={15} aria-hidden="true"/></Link></Button></div>
 </section>;
}
