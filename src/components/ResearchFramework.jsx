import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronDown,Coins,FileText,Layers,Link2,Search,ShieldCheck,Target,Calculator,RefreshCw,ChartNoAxesCombined} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {modes,principles,researchStages,scoring,createResearchPlan,frameworkVersion} from '../../shared/research-framework.mjs';
import {useTabAutoplay} from '../hooks/use-tab-autoplay';
import './research-framework.css';

const modeIcons={A:Search,B:BookOpen,C:RefreshCw,D:Layers,E:ChartNoAxesCombined,F:Coins};
const benefitIcons=[Target,Link2,Calculator,RefreshCw];
const sceneIds=Object.keys(modes),stepIds=researchStages.map(item=>item.id);
const flow=[
 {title:'把问题变成合适的研究任务',copy:'先确定你需要初筛、深研、更新、对比、组合还是股东回报研究。范围与交付形式随任务改变。',example:['问题','分红是否由真实现金流支撑？'],result:'确定范围、必需资料与交付结构'},
 {title:'让资料带着来源和时点进入研究',copy:'获取官方披露与行情快照，保留报告期、原文和读取范围。缺失资料单独记录，目录不会被当成已读正文。',example:['证据','同一期间的利润、经营现金流与分红'],result:'建立证据目录，明确可以判断到哪里'},
 {title:'从经营逻辑，走到财务验证',copy:'解释公司如何赚钱，检视利润能否变成现金，再看必要再投资、偿债、分红与回购。',example:['验证','利润增长是否同时带来现金创造能力？'],result:'区分已证实的事实、解释与待验证假设'},
 {title:'用合适的模型，说明合理价格的条件',copy:'按行业和数据选择工具，记录参数来源与口径，比较情景和敏感性。没有可靠依据时，明确说明无法估值。',example:['估值','区分主估值、市赚率价格锚与股息收益率锚'],result:'可检查的参数与区间，不强制每项任务做DCF'},
 {title:'交付结论，也交付改变结论的条件',copy:'模型复核后，由程序检查任务章节、研究动作、置信度、证伪条件与引用。发现问题先修正，仍不符合要求则停止交付。',example:['跟踪','哪三条经营事实出现时，需要重审原判断？'],result:'研究报告、审计记录、证据来源与执行轨迹'},
];
const questions=[
 ['为什么不会每次都生成一篇长报告？','研究深度服从任务。快速初筛只决定淘汰、观察或进一步研究；财报更新围绕变化；公司比较优先统一表格。必要辅助模块可以联动，但不会同时完整执行多个模式。'],
 ['怎样看待市赚率和高股息？',<ValuationExplainer/>],
 ['模型复核和程序检查意味着什么？','模型依据资料和规则复核，程序校验明确的结构、数值协议与动作边界。它们不能证明所有事实或预测正确；未核实事项保留在审计记录中。'],
 ['组合信息不完整还能研究吗？','可以。平台会说明缺口并检视已知风险；只有持仓、权重、资产范围、风险承受能力、行业集中和流动性需求齐备时，才允许进一步形成组合动作。'],
 ['如何持续跟踪已有研究？','在财报更新任务中选择已完成报告作为对照，或补充外部研究结论。新任务保存旧报告快照，检查新事实、旧假设与估值变化；没有旧结论时只建立本期基线。'],
 ['目前的资料覆盖范围是什么？','支持已确认的A股、港股、美股标的。A股与港股读取可得官方财报PDF文字，美股读取SEC核心XBRL事实，并非全部附注。行情可能延迟，披露检索、解析有上限。当前不自动扩展指数成分或执行全市场批量筛选。'],
];
function ValuationExplainer(){
 const formulas=[
  {id:'F1',title:'普通市赚率',formula:'PE ÷ (100 × r)',description:'适用于盈利为正、净资产为正，且ROE相对稳定、可以解释的企业。把市盈率与净资产收益率结合起来观察。',inputs:'PE = 12.5，ROE = 25%（r = 0.25）',example:'12.5 ÷ (100 × 0.25) = 0.50'},
  {id:'F2',title:'周期与正常化公式',formula:'PB ÷ (100 × r²)',description:'常用于能够合理估计长期盈利能力的周期企业。这里的r采用完整周期中可持续的ROE水平，称为“正常化ROE”；公式需要将r平方。',inputs:'PB = 0.96，正常化ROE = 15.88%',example:'0.96 ÷ (100 × 0.1588²) ≈ 0.381'},
  {id:'F3',title:'指数适配公式',formula:'PE² ÷ (100 × PB)',description:'指数缺少直接ROE时，可用同口径PE、PB推算。成分、权重、期间和权益基数须一致，不能简单平均成分股的估值指标。',inputs:'指数PE = 14.4，PB = 2.49',example:'14.4² ÷ (100 × 2.49) ≈ 0.833'},
 ];
 return <div className="fw-valuation-explainer">
  <p><strong>市赚率（P2）</strong>是结合市盈率与净资产收益率的经验筛选指标，用于辅助比较价格与盈利能力。P2是这个指标的记号，<strong>F1、F2、F3分别是第一、第二、第三公式的编号</strong>。</p>
  <dl className="fw-formula-symbols">{[['PE','市盈率，使用倍数'],['PB','市净率，使用倍数'],['ROE / r','净资产收益率；公式中的r使用小数，25%写作0.25']].map(([symbol,meaning])=><div key={symbol}><dt><Badge variant="outline">{symbol}</Badge></dt><dd>{meaning}</dd></div>)}</dl>
  <div className="fw-formula-grid">{formulas.map(item=><Card key={item.id} className="fw-formula-card"><CardContent>
   <div className="fw-formula-heading"><Badge variant="secondary">{item.id}</Badge><h3>{item.title}</h3></div>
   <div className="fw-formula-equation"><span>市赚率 =</span><code>{item.formula}</code></div>
   <p>{item.description}</p>
   <div className="fw-formula-example"><strong>计算示例</strong><p>{item.inputs}</p><code>{item.example}</code></div>
  </CardContent></Card>)}</div>
  <p className="fw-formula-caption">以上数字仅用于说明公式。市赚率是无量纲比值：结果0.5表示市赚率为0.5，不能写成0.5%。</p>
  <div className="fw-valuation-notes"><div><h3>三种公式怎样关联？</h3><p>期间、股类和权益基数一致时，<code>PE = PB ÷ r</code>，三式可以相互推导。F2换用长期正常化ROE后，结果可能与当前盈利口径的F1不同。<strong>三式不能算作三种独立估值方法</strong>，也不能用低市赚率掩盖公司质量或财务问题。</p></div>
   <div><h3>高股息还要看什么？</h3><p>股息率是每股股息与股价的比值。高股息可能来自股价下跌或一次性分红，需要检查正常化盈利、现金覆盖、必要再投资和债务负担，判断分红能否持续。用可持续每股股息倒推的收益率锚，以及市赚率价格锚，都不能直接等同于企业内在价值，仍要结合公司质量与适合行业的主估值交叉验证。</p></div>
  </div>
 </div>;
}
export default function ResearchFramework({config,onStart}){
 const sceneRotation=useTabAutoplay(sceneIds),stepRotation=useTabAutoplay(stepIds);
 const scene=sceneRotation.value,step=stepRotation.value;
 const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 639px)').matches);
 useEffect(()=>{const query=window.matchMedia('(max-width: 639px)'),change=()=>setNarrow(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return <section className="research-framework" aria-labelledby="framework-title">
  <header className="fw-heading"><div><h1 id="framework-title">研究框架</h1><p>一套贯穿提问、验证、估值与跟踪的方法。</p></div><Badge variant="outline">价值研究 · {config?.knowledgeVersion||frameworkVersion}</Badge></header>
  <section className="fw-hero" aria-labelledby="fw-hero-title">
   <div className="fw-hero-copy"><span className="fw-eyebrow">先公司 · 后价格 · 再仓位</span><h2 id="fw-hero-title">先看懂公司，<br/>再判断价格。</h2><p>把业务逻辑、财务质量与股东回报放在同一条证据链上。看清判断的依据，也知道什么发生时需要改变判断。</p><div className="fw-hero-actions"><Button size="lg" onClick={()=>onStart('B')}>开始一项研究<ArrowRight size={17}/></Button><Button variant="ghost" asChild><a href="#fw-paths">找到适合的问题<ArrowUpRight size={16}/></a></Button></div><div className="fw-hero-note"><ShieldCheck size={16}/>有证据的判断 · 有条件的结论 · 可回看的过程</div></div>
   <Card className="fw-question-card"><CardContent><div className="fw-preview-label"><FileText size={18}/>每份研究，回到三个问题</div>{[
    ['01','公司值得长期研究吗？','业务优势，能否被财务和现金流验证'],
    ['02','价格与风险回报匹配吗？','看估值区间，也看背后的关键假设'],
    ['03','什么会推翻原来的判断？','留下证伪条件，连接下一次财报更新'],
   ].map(([number,title,copy])=><div className="fw-question" key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}<div className="fw-preview-footer"><span>研究结论</span><span>证据</span><span>估值假设</span><span>验证条件</span></div></CardContent></Card>
  </section>
  <nav className="fw-section-nav" aria-label="研究框架导航">{[['fw-value','核心价值'],['fw-paths','研究路径'],['fw-flow','交付流程'],['fw-discipline','评分与边界']].map(([id,label])=><Button asChild variant="ghost" size="sm" key={id}><a href={'#'+id}>{label}</a></Button>)}</nav>
  <section id="fw-value" className="fw-section"><div className="fw-section-heading"><span>01 / 研究价值</span><h2>让一次研究，成为可以继续验证的判断。</h2></div><div className="fw-benefits">{principles.map((item,index)=>{const Icon=benefitIcons[index];return <Card key={item.id} className="fw-benefit"><CardContent><span className="fw-icon"><Icon size={21}/></span><h3>{item.title}</h3><p>{item.description}</p></CardContent></Card>;})}</div></section>
  <section id="fw-paths" className="fw-section"><div className="fw-section-heading"><span>02 / 从问题出发</span><h2>同一套原则，六种研究路径。</h2><p>选择你的问题，看看会得到什么，以及需要准备什么。</p></div>
   <Tabs ref={sceneRotation.rootRef} {...sceneRotation.interactionProps} orientation={narrow?'horizontal':'vertical'} value={scene} onValueChange={sceneRotation.select} className="fw-scenes"><TabsList aria-label="研究场景" className="fw-scene-tabs">{Object.entries(modes).map(([id,item])=>{const Icon=modeIcons[id];return <TabsTrigger key={id} value={id}><Icon size={18}/><span>{item.name}<small>{item.description}</small></span><ArrowRight size={14}/></TabsTrigger>;})}</TabsList>
    <div className="fw-scene-panels">{Object.entries(modes).map(([id,profile])=>{
     const SceneIcon=modeIcons[id],plan=createResearchPlan({mode:id,depth:profile.defaultDepth,question:profile.example},id);
     return <TabsContent forceMount value={id} key={id} className="fw-scene-panel" aria-hidden={scene!==id} inert={scene!==id?true:undefined} tabIndex={scene===id?0:-1}><div className="fw-scene-heading"><span className="fw-icon"><SceneIcon size={24}/></span><Badge variant="secondary">{profile.name}</Badge></div><h3>{profile.question}</h3><p>{profile.goal}</p><blockquote>{profile.example}</blockquote><div className="fw-scene-details"><div><h4>你会得到</h4><ul>{plan.output.sections.map(item=><li key={item.id}><Check size={14}/>{item.title}</li>)}</ul></div><div><h4>研究会关注</h4><div className="fw-module-tags">{profile.modules.map(item=><Badge variant="outline" key={item}>{item}</Badge>)}</div><p className="fw-scene-boundary">{id==='A'?'只输出淘汰、观察池或深度研究，初筛不直接形成建仓结论。':id==='C'?'选择旧报告或补充上次结论。缺少对照时，明确作为本期基线。':id==='E'?'先检查六项组合信息；不完整时保留风险分析，具体仓位暂不输出。':id==='F'?'八年是检索范围，实际资料不足会标记。特别分红与回购类型分别核查。':id==='D'?'统一期间、币种、股类与估值口径；不适用或缺失项不会被当作低估。':'先公司质量、后价格。估值方法按行业适配，重要冲突需要解释。'}</p></div></div><Button onClick={()=>onStart(id)}>开始{profile.name}<ArrowRight size={16}/></Button></TabsContent>;
    })}</div>
   </Tabs>
  </section>
  <section id="fw-flow" className="fw-section"><div className="fw-section-heading"><span>03 / 从问题到交付</span><h2>不是只给结论，而是保留完整的判断过程。</h2><p>点击步骤查看。以下是研究方法说明，不是实际研究结果。</p></div>
   <Tabs ref={stepRotation.rootRef} {...stepRotation.interactionProps} value={step} onValueChange={stepRotation.select} className="fw-flow"><TabsList className="fw-flow-tabs" aria-label="研究流程步骤">{researchStages.map((item,index)=><TabsTrigger value={item.id} key={item.id}><span>{String(index+1).padStart(2,'0')}</span>{item.label}</TabsTrigger>)}</TabsList><div className="fw-flow-panels">{researchStages.map((item,index)=><TabsContent forceMount value={item.id} key={item.id} className="fw-flow-panel" aria-hidden={step!==item.id} inert={step!==item.id?true:undefined} tabIndex={step===item.id?0:-1}><div><Badge variant="outline">{item.label}</Badge><h3>{flow[index].title}</h3><p>{flow[index].copy}</p><Button variant="ghost" onClick={()=>stepRotation.select(researchStages[(index+1)%researchStages.length].id)}>{index===4?'重新查看流程':'下一步：'+researchStages[index+1].label}<ArrowRight size={15}/></Button></div><Card className="fw-flow-example"><CardContent><span>以现金回报研究为例</span><small>{flow[index].example[0]}</small><h4>{flow[index].example[1]}</h4><p><Check size={16}/>{flow[index].result}</p></CardContent></Card></TabsContent>)}</div></Tabs>
  </section>
  <section id="fw-discipline" className="fw-section"><div className="fw-section-heading"><span>04 / 研究纪律</span><h2>有分寸的判断，比漂亮的数字更重要。</h2></div><div className="fw-discipline-grid"><Card className="fw-score"><CardContent><div className="fw-score-heading"><h3>六个维度，理解公司</h3><Badge variant="outline">100 分体系</Badge></div><p>评分用于解释研究，不直接触发买入。市赚率与股息专项不重复加分，资料不足也不会按零分填充。</p><div className="fw-score-list">{scoring.map(item=><div key={item.id}><span>{item.label}</span><div aria-hidden="true"><i style={{width:item.max*4+'%'}}/></div><strong>{item.max}<small>分</small></strong></div>)}</div><small>仅展示评分权重，不是任何公司的实际得分。</small></CardContent></Card><div className="fw-discipline-copy"><h3>每个正式结论，都留下边界。</h3>{[['研究动作','表达淘汰、观察或候选状态；与个性化仓位分开。'],['研究置信度','根据资料完整度、时效与模型稳定性说明判断把握。'],['证伪条件','至少三条可检验条件，明确什么时候要重新研究。'],['风险定价','一个风险有一个主要定价位置，避免重复折价。']].map(([title,copy])=><div key={title}><ShieldCheck size={18}/><span><strong>{title}</strong><p>{copy}</p></span></div>)}</div></div></section>
  <section className="fw-section fw-faq" aria-label="研究框架使用说明"><div className="fw-section-heading"><h2>开始前，你可能还想了解</h2></div>{questions.map(([title,copy])=><Collapsible key={title}><CollapsibleTrigger asChild><Button variant="ghost"><span>{title}</span><ChevronDown size={17}/></Button></CollapsibleTrigger><CollapsibleContent>{typeof copy==='string'?<p>{copy}</p>:copy}</CollapsibleContent></Collapsible>)}</section>
  <Card className="fw-cta"><CardContent><div><h2>从一个具体问题，开始有依据的研究。</h2><p>让下一次判断，可以回到今天的证据。</p></div><Button onClick={()=>onStart()}>前往研究工作台<ArrowRight size={17}/></Button></CardContent></Card>
 </section>;
}
