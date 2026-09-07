import {useEffect,useState} from 'react';
import {Link} from 'react-router';
import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronDown,Coins,FileText,Layers,Search,ShieldCheck,RefreshCw,ChartNoAxesCombined} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {modes,researchStages,outputContract} from '../../shared/research-framework.mjs';
import ResearchService from './ResearchService';
import ResearchPrinciplesPreview from './ResearchPrinciplesPreview';
import ResearchScopeSummary from './ResearchScopeSummary';
import {researchPresentation} from '../config/research-presentation';
import {researchDataCopy} from '../../shared/research-data-copy.mjs';
import {useTabAutoplay} from '../hooks/use-tab-autoplay';
import {useSectionNavigation} from '../hooks/use-section-navigation';
import './research-framework.css';
import './research-home.css';
import './research-usage.css';

const modeIcons={A:Search,B:BookOpen,C:RefreshCw,D:Layers,E:ChartNoAxesCombined,F:Coins};
const starterQuestion='分析贵州茅台的长期投资价值，重点关注现金流质量、竞争优势与股东回报。';
const guideSteps=[
 [Search,'写下公司与问题','输入公司名称或股票代码，再补充你最关心的判断。问题越具体，研究越聚焦。'],
 [Layers,'核对标的，补充资料','确认公司和市场，可选填报告、表格或截图。初次使用可保留默认研究设置，资料导入完成后再开始。'],
 [FileText,'读结论，回查依据','研究完成后，在研究记录中查看报告、审计记录和来源。新财报发布后，可以继续更新判断。'],
];
const sceneIds=Object.keys(modes),stepIds=researchStages.map(item=>item.id);
const sections=[['fw-guide','如何使用'],['fw-paths','研究场景'],['fw-plans','服务方案'],['fw-flow','研究流程'],['fw-principles','研究原则'],['fw-faq','常见问题']];
const sectionIds=sections.map(([id])=>id);
const flow=[
 {title:'把问题变成合适的研究任务',copy:'先确定你需要初筛、深研、更新、对比、组合还是股东回报研究。范围与交付形式随任务改变。',example:['问题','分红是否由真实现金流支撑？'],result:'确定范围、必需资料与交付结构'},
 {title:'让资料带着来源和时点进入研究',copy:researchDataCopy.collection+' 配置并启用搜索后，按资料缺口定位并读取原文；上传材料作为补充线索。',example:['证据','同一期间的利润、经营现金流与分红'],result:'建立证据目录，标明读取范围与待核实内容'},
 {title:'从经营逻辑，走到财务验证',copy:'解释公司如何赚钱，检视利润能否变成现金，再看必要再投资、偿债、分红与回购。',example:['验证','利润增长是否同时带来现金创造能力？'],result:'区分已证实的事实、解释与待验证假设'},
 {title:'用合适的模型，说明合理价格的条件',copy:'按行业和数据选择工具，记录参数来源与口径，比较情景和敏感性。没有可靠依据时，明确说明无法估值。',example:['估值','区分主估值、市赚率价格锚与股息收益率锚'],result:'可检查的参数与区间，不强制每项任务做DCF'},
 {title:'交付结论，也交付改变结论的条件',copy:'模型复核后，由程序检查报告结构、引用和判断边界。发现问题会尝试补充或修正，未核实事项保留说明；结果保存失败时可单独重试保存。',example:['跟踪','哪三条经营事实出现时，需要重审原判断？'],result:'对照报告、审计记录、证据来源与执行轨迹'},
];
const questions=[
 ['第一次使用，应该从哪里开始？','在工作台输入公司与具体问题，核对股票代码和市场后开始研究，稍后可到研究记录中查看结果。'],
 ['可以上传自己的报告、表格或截图吗？','可以。文件直接上传平台处理，也可粘贴文字笔记。最多 6 份，每份文件 10 MB；处理结果可预览与修改，关键数字仍需核对原件。'],
 ['什么时候可以离开页面？','资料导入期间请保持页面；研究创建成功后可离开，稍后从研究记录查看。文件失败可单独重试，仅保存结果失败时无需重新研究。'],
 ['如何选择和开通付费服务？','在首页“服务方案”查看开通说明，正式价格、研究额度、服务周期及购买入口将在开放时公布。'],
 ['为什么不会每次都生成一篇长报告？','报告随问题调整：快速筛选判断是否值得深研，财报更新聚焦变化，公司比较优先统一口径。'],
 ['怎样看待市赚率和高股息？','市赚率与高股息仅作研究线索，需结合公司质量、现金流和主估值交叉验证，不能直接作为买入依据。'],
 ['模型复核和程序检查意味着什么？','它们帮助检查结论、引用、数值与适用边界，但不能保证事实或预测正确，未核实事项会保留在审计记录中。'],
 ['组合信息不完整还能研究吗？','可以。平台会说明缺口并检视已知风险；只有持仓、权重、资产范围、风险承受能力、行业集中和流动性需求齐备时，才允许进一步形成组合动作。'],
 ['如何持续跟踪已有研究？','发起财报更新时选择旧报告或补充上次结论，以新披露核对旧假设；没有对照时先建立本期基线。'],
 ['目前的资料覆盖范围是什么？',researchDataCopy.coverage],
];
export default function ResearchFramework({onStart}){
 const sectionNavigation=useSectionNavigation(sectionIds);
 const sceneRotation=useTabAutoplay(sceneIds),stepRotation=useTabAutoplay(stepIds);
 const scene=sceneRotation.value,step=stepRotation.value;
 const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 639px)').matches);
 useEffect(()=>{const query=window.matchMedia('(max-width: 639px)'),change=()=>setNarrow(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return <section ref={sectionNavigation.rootRef} onClick={sectionNavigation.onAnchorClick} className="research-framework research-home" aria-labelledby="fw-hero-title">
  <section className="fw-hero" aria-labelledby="fw-hero-title">
   <div className="fw-hero-copy"><h1 id="fw-hero-title">让每一次研究，<br/>都有依据可循。</h1><p>输入一个公司问题，串联公开资料、财务分析与结论复核。从第一次看懂公司，到每次财报后更新判断，把研究持续做下去。</p><div className="fw-hero-actions"><Button size="lg" onClick={()=>onStart()}>开始一项研究<ArrowRight size={17}/></Button><Button variant="outline" size="lg" asChild><a href="#fw-plans">了解付费方案<ArrowUpRight size={16}/></a></Button></div><div className="fw-hero-note"><ShieldCheck size={16}/>研究报告 · 审计记录 · 原始来源 · 持续跟踪</div></div>
   <Card className="fw-question-card"><CardContent><div className="fw-preview-label"><FileText size={18}/>一份研究，帮你理清三个问题</div>{[
    ['01','公司值得长期研究吗？','业务优势，能否被财务和现金流验证'],
    ['02','价格与风险回报匹配吗？','看估值区间，也看背后的关键假设'],
    ['03','什么会推翻原来的判断？','留下证伪条件，连接下一次财报更新'],
   ].map(([number,title,copy])=><div className="fw-question" key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>)}<div className="fw-preview-footer"><span>研究结论</span><span>证据</span><span>估值假设</span><span>验证条件</span></div></CardContent></Card>
  </section>
  <nav ref={sectionNavigation.navRef} className="fw-section-nav" aria-label="首页内容导航">{sections.map(([id,label])=><Button asChild variant="ghost" size="sm" key={id}><a href={'#'+id} aria-current={sectionNavigation.activeId===id?'location':undefined}>{label}</a></Button>)}</nav>
  <section id="fw-guide" className="fw-section fw-quickstart" aria-labelledby="fw-guide-title"><div className="fw-section-heading"><span>01 / 三步上手</span><h2 id="fw-guide-title">从一个具体问题，开始你的第一项研究。</h2><p>准备好公司名称和关注点，其余设置可以边用边了解。</p></div>
   <ol className="fw-guide-steps">{guideSteps.map(([Icon,title,copy],index)=><li key={title}><div className="fw-guide-step-heading"><span className="fw-guide-number">0{index+1}</span><Icon size={21}/></div><h3>{title}</h3><p>{copy}</p></li>)}</ol>
   <div className="fw-prompt-example"><div><span>试着这样提问</span><p>{starterQuestion}</p></div><Button variant="outline" onClick={()=>onStart('B',starterQuestion)}>使用这个问题<ArrowUpRight size={16}/></Button><div className="fw-handbook-link"><span>资料上传或操作遇到问题？</span><Link to="/handbook?tab=guide">查看使用指南<ArrowRight size={14} aria-hidden="true"/></Link></div></div>
  </section>
  <section id="fw-paths" className="fw-section"><div className="fw-section-heading"><span>02 / 从问题出发</span><h2>同一套原则，六种研究路径。</h2><p>选择你的问题，看看会得到什么，以及需要准备什么。</p></div>
   <Tabs ref={sceneRotation.rootRef} {...sceneRotation.interactionProps} orientation={narrow?'horizontal':'vertical'} value={scene} onValueChange={sceneRotation.select} className="fw-scenes"><TabsList aria-label="研究场景" className="fw-scene-tabs">{Object.entries(modes).map(([id,item])=>{const Icon=modeIcons[id];return <TabsTrigger key={id} value={id} {...sceneRotation.hoverProps(id)}><Icon size={18}/><span>{item.name}<small>{item.description}</small></span><ArrowRight size={14}/></TabsTrigger>;})}</TabsList>
    <div className="fw-scene-panels">{Object.entries(modes).map(([id,profile])=>{
     const SceneIcon=modeIcons[id],plan={mode:id,output:outputContract(id,profile.defaultDepth)};
     return <TabsContent forceMount value={id} key={id} className="fw-scene-panel" aria-hidden={scene!==id} inert={scene!==id?true:undefined} tabIndex={scene===id?0:-1}>
      <div className="fw-scene-heading"><span className="fw-icon"><SceneIcon size={24}/></span><Badge variant="secondary">{profile.name}</Badge></div>
      <h3>{profile.question}</h3><p>{researchPresentation[id]?.intro || profile.goal}</p>
      <ResearchScopeSummary plan={plan}/>
      <Button onClick={()=>onStart(id)}>开始{profile.name}<ArrowRight size={16}/></Button>
     </TabsContent>;
    })}</div>
   </Tabs>
  </section>
  <ResearchService onStart={onStart}/>
  <section id="fw-flow" className="fw-section"><div className="fw-section-heading"><span>04 / 了解交付过程</span><h2>每份报告，都能回到研究的来路。</h2><p>选择步骤，了解从资料获取到报告交付的过程。以下为方法说明。</p></div>
   <Tabs ref={stepRotation.rootRef} {...stepRotation.interactionProps} value={step} onValueChange={stepRotation.select} className="fw-flow"><TabsList className="fw-flow-tabs" aria-label="研究流程步骤">{researchStages.map((item,index)=><TabsTrigger value={item.id} key={item.id} {...stepRotation.hoverProps(item.id)}><span>{String(index+1).padStart(2,'0')}</span>{item.label}</TabsTrigger>)}</TabsList><div className="fw-flow-panels">{researchStages.map((item,index)=><TabsContent forceMount value={item.id} key={item.id} className="fw-flow-panel" aria-hidden={step!==item.id} inert={step!==item.id?true:undefined} tabIndex={step===item.id?0:-1}><div><Badge variant="outline">{item.label}</Badge><h3>{flow[index].title}</h3><p>{flow[index].copy}</p><Button variant="outline" className="fw-flow-next" onClick={()=>stepRotation.select(researchStages[(index+1)%researchStages.length].id)}><span>{index===researchStages.length-1?'重新查看流程':'下一步：'+researchStages[index+1].label}</span>{index===researchStages.length-1?<RefreshCw size={16} aria-hidden="true"/>:<ArrowRight size={16} aria-hidden="true"/>}</Button></div><Card className="fw-flow-example"><CardContent><span>以现金回报研究为例</span><small>{flow[index].example[0]}</small><h4>{flow[index].example[1]}</h4><p><Check size={16}/>{flow[index].result}</p></CardContent></Card></TabsContent>)}</div></Tabs>
  </section>
  <ResearchPrinciplesPreview/>
  <section id="fw-faq" className="fw-section fw-faq" aria-label="首页使用说明"><div className="fw-section-heading"><span>06 / 常见问题</span><h2>使用与开通常见问题</h2></div>{questions.map(([title,copy])=><Collapsible key={title}><CollapsibleTrigger asChild><Button variant="ghost"><span>{title}</span><ChevronDown size={17}/></Button></CollapsibleTrigger><CollapsibleContent><p>{copy}</p></CollapsibleContent></Collapsible>)}</section>
  <Card className="fw-cta"><CardContent><div><h2>把研究留在今天，让判断经得起回看。</h2><p>先从一个公司问题开始，或进一步了解知衡研究服务。</p></div><div className="fw-cta-actions"><Button onClick={()=>onStart()}>前往研究工作台<ArrowRight size={17}/></Button><Button asChild variant="outline"><a href="#fw-plans">了解服务方案<ArrowUpRight size={16}/></a></Button></div></CardContent></Card>
 </section>;
}
