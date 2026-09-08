import {ArrowRight,ChevronDown,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {prohibitions,principles,terms} from '../config/research-reference';
import ResearchStandards,{ResearchScoring} from './ResearchStandards';
import ResearchDataSources from './ResearchDataSources';
import './research-reference.css';
import {executionGuideCards,executionBoundary} from '../../shared/execution-discipline.mjs';
import './execution-ui.css';

const boundaries=[
 {title:'基本面判断',summary:'不凭涨跌、单一指标或管理层说法判断公司。',start:0,end:8},
 {title:'证据与交易纪律',summary:'不机械补仓、不用传闻、不编造数据或迎合股价。',start:8,end:16},
 {title:'估值与股东回报',summary:'不把评分、高股息或一次性分红当作买入信号。',start:16,end:23},
 {title:'模型与研究范围',summary:'不重复折价、不混用模型、不脱离组合约束。',start:23,end:30},
 {title:'组合执行与交易复盘',summary:'区分研究退出与组合减仓，不因卖出后上涨追买，不把催化直接计入长期价值。',start:30,end:33},
];
const termGroups=[
 {id:'valuation',label:'估值指标',items:terms.slice(8,11)},
 {id:'cash-flow',label:'财务现金流',items:terms.slice(0,8)},
 {id:'actions',label:'研究与组合',items:terms.slice(11,13)},
];

export function ResearchDiscipline(){
 return <>
  <header className="handbook-chapter-heading discipline-heading"><h2>研究纪律</h2><p>了解研究遵循的原则、证据要求与判断边界，按主题查阅具体规则。</p></header>
  <section id="fw-principles" className="fw-section" aria-labelledby="fw-principles-title">
   <div className="fw-section-heading"><h2 id="fw-principles-title">研究的基本原则</h2><p>按研究问题选择范围，用可追溯证据验证假设；资料不足时保留缺口，结论随新证据修正。</p></div>
   <div className="fw-principle-panel"><span className="fw-principle-label">研究围绕的核心问题</span><p className="fw-principle-question">以当前价格成为这家公司的长期股东，未来承担的风险和可能获得的回报是否匹配？</p>
    <Collapsible className="fw-principle-details"><CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span>查看研究链路与股东回报原则</span><ChevronDown size={18}/></Button></CollapsibleTrigger><CollapsibleContent>
    <div className="fw-dividend-principle"><span>对于成熟分红型公司</span><p>公司能否持续把真实可分配现金转化为分红或注销式回购，以及当前价格对应的现金回报是否足以补偿增长、周期、利率、政策和估值风险？</p></div>
    <ol className="fw-principle-chain" aria-label="持续验证的研究链路">{principles.map((text,index)=><li key={text}>{index>0&&<ArrowRight size={13} aria-hidden="true"/>}<span>{text}</span></li>)}</ol>
    </CollapsibleContent></Collapsible>
   </div>
  </section>
  <ResearchDataSources/>
  <ResearchStandards/>
  <ResearchScoring/>
  <section className="fw-section" aria-labelledby="execution-discipline-title">
   <div className="fw-section-heading"><h2 id="execution-discipline-title">组合执行与交易复盘</h2><p>{executionBoundary}</p></div>
   <p>涉及减仓、清空、重新买入或交易复盘时，报告补充执行记录，审计逐项说明以下检查的依据、限制或不适用原因。</p>
   <ol className="execution-guide-cards">{executionGuideCards.map(item=><li key={item.title}><h3>{item.title}</h3><p>{item.text}</p></li>)}</ol>
  </section>
  <section id="fw-prohibitions" className="fw-section" aria-labelledby="fw-prohibitions-title">
   <div className="fw-section-heading"><h2 id="fw-prohibitions-title">{prohibitions.length} 条禁止事项</h2><p>{prohibitions.length} 条研究纪律，按五类展开查看。</p></div>
   <div className="fw-boundary-grid">{boundaries.map(group=><Collapsible key={group.title} className="fw-boundary-group">
    <CollapsibleTrigger asChild><Button variant="ghost" className="fw-reference-trigger"><span><span className="fw-reference-label"><ShieldCheck size={18}/><strong>{group.title}</strong><Badge variant="outline">{group.end-group.start} 条</Badge></span><span className="fw-reference-summary">{group.summary}</span></span><ChevronDown size={18}/></Button></CollapsibleTrigger>
    <CollapsibleContent><ol start={group.start+1} className="fw-prohibition-list">{prohibitions.slice(group.start,group.end).map(item=><li key={item.number} value={item.number}>{item.text}</li>)}</ol></CollapsibleContent>
   </Collapsible>)}</div>
  </section>

 </>;
}

export function ResearchGlossary(){
 return <section id="fw-glossary" className="fw-section" aria-labelledby="fw-glossary-title">
   <div className="fw-section-heading handbook-chapter-heading"><h2 id="fw-glossary-title">术语速查</h2><p>按主题查阅 {terms.length} 个术语，点击名称展开解释，可同时展开多项对照。</p></div>
   <Tabs defaultValue="valuation" className="fw-glossary"><TabsList className="fw-glossary-tabs" aria-label="术语分类">{termGroups.map(group=><TabsTrigger value={group.id} key={group.id}>{group.label}<span>{group.items.length}</span></TabsTrigger>)}</TabsList>
    {termGroups.map(group=><TabsContent value={group.id} key={group.id}><dl className="fw-term-list">{group.items.map((item,index)=><Collapsible key={item.term} defaultOpen={index===0} className="fw-term-item">
     <dt><CollapsibleTrigger asChild><Button variant="ghost" className="fw-term-trigger"><span>{item.term}</span><ChevronDown size={17} aria-hidden="true"/></Button></CollapsibleTrigger></dt>
     <CollapsibleContent asChild><dd><p className="fw-term-definition">{item.definition}</p><p className="fw-term-explanation">{item.explanation}</p>
      <div className="fw-term-example"><span>示例 · 仅作说明</span><p>{item.example}</p>{item.calculation&&<code>{item.calculation}</code>}</div>
      <p className="fw-term-note"><span>理解边界</span>{item.note}</p>
     </dd></CollapsibleContent>
    </Collapsible>)}</dl></TabsContent>)}
   </Tabs>
  </section>;
}
