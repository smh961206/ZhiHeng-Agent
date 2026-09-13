import {recentResearch} from './RecentResearch';
import {deliveryProgress} from '../../shared/research-delivery.mjs';
import {KnowledgeHighlights} from './ResearchKnowledge';
import ResearchCapabilities from './ResearchCapabilities';
import {ResearchMethodSteps} from './ResearchMethod';

import {useEffect,useState} from 'react';
import {Link} from 'react-router';
import {Pause,Play,ArrowRight,ArrowUpRight,BookOpen,Check,ChevronDown,Coins,FileText,Layers,Search,RefreshCw,ChartNoAxesCombined} from 'lucide-react';
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
import {executionTasks} from '../../shared/execution-discipline.mjs';
import './execution-ui.css';

const modeIcons={A:Search,B:BookOpen,C:RefreshCw,D:Layers,E:ChartNoAxesCombined,F:Coins};
const starterQuestion='A股贵州茅台值不值得研究';
const guideSteps=[
 [Search,'围绕真实问题研究','从“是否值得继续研究”到“分红是否可持续”，不同问题采用不同范围和交付重点。'],
 [Layers,'把判断和依据放在一起','结论、关键数字、来源、资料缺口和改变判断的条件一并呈现，方便自己复核。'],
 [FileText,'积累可持续更新的记录','报告保留当时的研究依据；新财报发布后，可以对照旧判断检查变化，而不是重新整理一切。'],
];
const sceneIds=Object.keys(modes),stepIds=researchStages.map(item=>item.id);
const sections=[['fw-guide','平台价值'],['fw-paths','适用场景'],['fw-plans','服务方案'],['fw-flow','如何工作'],['fw-principles','研究原则'],['fw-faq','常见问题']];
const sectionIds=sections.map(([id])=>id);
const flow=[
 {title:'把问题变成合适的研究任务',copy:'先确定你需要初筛、深研、更新、对比、组合还是股东回报研究。范围与交付形式随任务改变。',example:['问题','分红是否由真实现金流支撑？'],result:'确定范围、必需资料与交付结构'},
 {title:'让资料带着来源和时点进入研究',copy:researchDataCopy.collection+' 配置并启用搜索后，按资料缺口定位并读取原文；上传材料作为补充线索。',example:['证据','同一期间的利润、经营现金流与分红'],result:'建立证据目录，标明读取范围与待核实内容'},
 {title:'从经营逻辑，走到财务验证',copy:'解释公司如何赚钱，检视利润能否变成现金，再看必要再投资、偿债、分红与回购。',example:['验证','利润增长是否同时带来现金创造能力？'],result:'区分已证实的事实、解释与待验证假设'},
 {title:'用合适的估值方法，说明合理价格的条件',copy:'按行业和数据选择工具，记录参数来源与口径，比较情景和敏感性。没有可靠依据时，明确说明无法估值。',example:['估值','区分主估值价值区间与股息收益率锚'],result:'可检查的参数与区间，不强制每项任务做DCF'},
 {title:'交付结论，也交付改变结论的条件',copy:'研究和写作分环节完成，独立审计检查引用、口径与判断边界；只有满足条件时才进入关键复核。程序随后校验交付结构。发现问题会尝试补充或修正，未核实事项保留说明；结果保存失败时可单独重试保存。',example:['跟踪','哪三条经营事实出现时，需要重审原判断？'],result:'对照报告、审计记录、证据来源与执行轨迹'},
];
const questions=[
 ['知衡适合解决哪些问题？','适合公司初筛、长期深研、财报更新、多公司比较、组合风险检查和股东回报研究。每种场景都会调整资料范围与报告重点。'],
 ['第一次使用，应该从哪里开始？','在工作台输入公司与具体问题，核对股票代码和市场后开始研究，稍后可到研究记录中查看结果。'],
 ['可以上传自己的报告、表格或截图吗？','可以。文件直接上传平台处理，也可粘贴文字笔记。最多 6 份，每份文件 10 MB；处理结果可预览与修改，关键数字仍需核对原件。'],
 ['为什么不会每次都生成一篇长报告？','报告随问题调整：快速筛选判断是否值得深研，财报更新聚焦变化，公司比较优先统一口径。'],
 ['如何持续跟踪已有研究？','发起财报更新时选择旧报告或补充上次结论，以新披露核对旧假设；没有对照时先建立本期基线。'],
 ['知衡会直接替我做投资决定吗？','不会。知衡帮助你整理证据、识别风险和形成有条件的研究判断；最终投资决定仍由你结合自身目标、持仓和风险承受能力作出。'],
 ['如何选择和开通研究服务？','先体验一项研究，确认报告方式适合自己，再在“服务方案”查看价格、研究额度、服务周期和开通入口。正式方案将在开放时公布。'],
];
export default function ResearchFramework({onStart,jobs=[],jobsLoading=false,jobsError}){
 const latest=recentResearch(jobs,1)[0];
 const latestStatus=latest&&(deliveryProgress(latest)?.label||{queued:'等待中',running:'研究中',completed:'已完成',failed:'失败',cancelled:'已取消'}[latest.status]||'状态未知');
 const sectionNavigation=useSectionNavigation(sectionIds);
 const sceneRotation=useTabAutoplay(sceneIds),stepRotation=useTabAutoplay(stepIds);
 const scene=sceneRotation.value,step=stepRotation.value;
 const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 639px)').matches);
 useEffect(()=>{const query=window.matchMedia('(max-width: 639px)'),change=()=>setNarrow(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return <section ref={sectionNavigation.rootRef} onClick={sectionNavigation.onAnchorClick} className="research-framework research-home" aria-labelledby="fw-hero-title">
  <section className="fw-hero" aria-labelledby="fw-hero-title">
   <div className="fw-hero-copy"><h1 id="fw-hero-title">把分散资料，<br/>变成可复核的投资研究。</h1><p>知衡帮助你查找和核对公司资料，梳理经营、财务、估值与风险，形成有依据、有边界、可以持续更新的研究判断。</p><div className="fw-hero-actions"><Button size="lg" onClick={()=>onStart()}>体验一次研究<ArrowRight size={17}/></Button><Button variant="outline" size="lg" asChild><a href="#fw-plans">查看服务方案<ArrowUpRight size={16}/></a></Button></div></div>
   <Card className="fw-question-card fw-value-card"><CardContent><div className="fw-preview-label"><FileText size={18}/>一份研究，分清判断与执行</div><ResearchMethodSteps compact/><Link className="fw-method-link" to="/handbook?tab=method">了解当前研究方法<ArrowRight size={15}/></Link></CardContent></Card>
  </section>
  <section className="home-workspace" aria-label="研究快捷入口">
   <div className="home-workspace-heading"><span>我的研究</span><p>开始新问题，或回到已有记录继续核对。</p></div>
   <div className="home-workspace-links">
    <Button variant="outline" onClick={()=>onStart()}><span><strong>新建研究</strong><small>确认问题与范围后开始</small></span><ArrowRight size={18} aria-hidden="true"/></Button>
    <Link to={latest?'/research/'+encodeURIComponent(latest.id):'/history'}><span><strong>{latest?'打开最近研究':jobsLoading?'正在读取研究记录':jobsError?'研究记录暂未更新':'查看研究记录'}</strong><small>{latest?latest.question||latest.input?.question||'未命名研究':jobsError?'到研究记录页重新加载':'报告、证据和进度集中查看'}</small>{latest&&<em>{latestStatus}{jobsError?' · 当前为上次获取的记录':''}</em>}</span><ArrowRight size={18} aria-hidden="true"/></Link>
    <Link to="/handbook?tab=guide"><span><strong>查找操作说明</strong><small>搜索上传、报告与恢复问题</small></span><ArrowRight size={18} aria-hidden="true"/></Link>
   </div>
  </section>
  <KnowledgeHighlights/>
  <nav ref={sectionNavigation.navRef} className="fw-section-nav" aria-label="首页内容导航">{sections.map(([id,label])=><Button asChild variant="ghost" size="sm" key={id}><a href={'#'+id} aria-current={sectionNavigation.activeId===id?'location':undefined}>{label}</a></Button>)}</nav>
  <section id="fw-guide" className="fw-section fw-quickstart" aria-labelledby="fw-guide-title"><div className="fw-section-heading"><span>01 / 平台价值</span><h2 id="fw-guide-title">少花时间整理资料，把精力留给判断。</h2><p>从提出问题到阅读结论，知衡把重复的资料整理与核对过程组织成一项可回看的研究。</p></div>
   <ol className="fw-guide-steps">{guideSteps.map(([Icon,title,copy],index)=><li key={title}><div className="fw-guide-step-heading"><span className="fw-guide-number">0{index+1}</span><Icon size={21}/></div><h3>{title}</h3><p>{copy}</p></li>)}</ol>
   <div className="fw-prompt-example"><div><span>试着这样提问</span><p>{starterQuestion}</p></div><Button variant="outline" onClick={()=>onStart('A',starterQuestion)}>使用这个问题<ArrowUpRight size={16}/></Button><div className="fw-handbook-link"><span>资料上传或操作遇到问题？</span><Link to="/handbook?tab=guide">查看使用指南<ArrowRight size={14} aria-hidden="true"/></Link></div></div>
  </section>
  <section id="fw-paths" className="fw-section"><div className="fw-section-heading"><span>02 / 适用场景</span><h2>从一次筛选，到长期跟踪。</h2><p>六种研究服务对应不同投资问题，交付重点和所需资料会随问题调整。</p></div>
   {!sceneRotation.reducedMotion&&<div className="fw-rotation-control"><Button type="button" variant="ghost" size="sm" onClick={sceneRotation.togglePause}>{sceneRotation.paused?<Play size={14}/>:<Pause size={14}/>} {sceneRotation.paused?'继续场景轮播':'暂停场景轮播'}</Button></div>}
   <Tabs ref={sceneRotation.rootRef} {...sceneRotation.interactionProps} orientation={narrow?'horizontal':'vertical'} value={scene} onValueChange={sceneRotation.select} className="fw-scenes"><TabsList aria-label="研究场景" className="fw-scene-tabs">{Object.entries(modes).map(([id,item])=>{const Icon=modeIcons[id];return <TabsTrigger key={id} value={id} {...sceneRotation.hoverProps(id)}><Icon size={18}/><span>{item.name}<small>{item.description}</small></span><ArrowRight size={14}/></TabsTrigger>;})}</TabsList>
    <div className="fw-scene-panels">{Object.entries(modes).map(([id,profile])=>{
     const SceneIcon=modeIcons[id],plan={mode:id,output:outputContract(id,profile.defaultDepth)};
     return <TabsContent forceMount value={id} key={id} className="fw-scene-panel" aria-hidden={scene!==id} inert={scene!==id?true:undefined} tabIndex={scene===id?0:-1}>
      <div className="fw-scene-heading"><span className="fw-icon"><SceneIcon size={24}/></span><Badge variant="secondary">{profile.name}</Badge></div>
      <h3>{profile.question}</h3><p>{researchPresentation[id]?.intro || profile.goal}</p>
      <ResearchScopeSummary plan={plan}/>
      {id==='E'&&<><div className="execution-task-options" aria-label="组合执行研究场景">{executionTasks.map(task=><Button type="button" variant="outline" key={task.id} onClick={()=>onStart('E',task.question)}><strong>{task.title}<ArrowUpRight size={14} aria-hidden="true"/></strong><small>{task.description}</small></Button>)}</div><Link className="execution-guide-link" to="/handbook?tab=discipline#execution-discipline-title">了解组合执行与复盘纪律<ArrowRight size={14}/></Link></>}
      <Button onClick={()=>onStart(id)}>开始{profile.name}<ArrowRight size={16}/></Button>
     </TabsContent>;
    })}</div>
   </Tabs>
  </section>
  <ResearchService onStart={onStart}/>
  <ResearchCapabilities/>
  <section id="fw-flow" className="fw-section"><div className="fw-section-heading"><span>04 / 如何工作</span><h2>研究结果为什么可以回查。</h2><p>知衡保留从问题、资料、分析到复核的关键记录，让你知道结论来自哪里、仍缺什么。</p></div>
   {!stepRotation.reducedMotion&&<div className="fw-rotation-control"><Button type="button" variant="ghost" size="sm" onClick={stepRotation.togglePause}>{stepRotation.paused?<Play size={14}/>:<Pause size={14}/>} {stepRotation.paused?'继续流程轮播':'暂停流程轮播'}</Button></div>}
   <Tabs ref={stepRotation.rootRef} {...stepRotation.interactionProps} value={step} onValueChange={stepRotation.select} className="fw-flow"><TabsList className="fw-flow-tabs" aria-label="研究流程步骤">{researchStages.map((item,index)=><TabsTrigger value={item.id} key={item.id} {...stepRotation.hoverProps(item.id)}><span>{String(index+1).padStart(2,'0')}</span>{item.label}</TabsTrigger>)}</TabsList><div className="fw-flow-panels">{researchStages.map((item,index)=><TabsContent forceMount value={item.id} key={item.id} className="fw-flow-panel" aria-hidden={step!==item.id} inert={step!==item.id?true:undefined} tabIndex={step===item.id?0:-1}><div><Badge variant="outline">{item.label}</Badge><h3>{flow[index].title}</h3><p>{flow[index].copy}</p><Button variant="outline" className="fw-flow-next" onClick={()=>stepRotation.select(researchStages[(index+1)%researchStages.length].id)}><span>{index===researchStages.length-1?'重新查看流程':'下一步：'+researchStages[index+1].label}</span>{index===researchStages.length-1?<RefreshCw size={16} aria-hidden="true"/>:<ArrowRight size={16} aria-hidden="true"/>}</Button></div><Card className="fw-flow-example"><CardContent><span>以现金回报研究为例</span><small>{flow[index].example[0]}</small><h4>{flow[index].example[1]}</h4><p><Check size={16}/>{flow[index].result}</p></CardContent></Card></TabsContent>)}</div></Tabs>
  </section>
  <ResearchPrinciplesPreview/>
  <section id="fw-faq" className="fw-section fw-faq" aria-label="首页使用说明"><div className="fw-section-heading"><span>06 / 常见问题</span><h2>使用与开通常见问题</h2></div>{questions.map(([title,copy])=><Collapsible key={title}><CollapsibleTrigger asChild><Button variant="ghost"><span>{title}</span><ChevronDown size={17}/></Button></CollapsibleTrigger><CollapsibleContent><p>{copy}</p></CollapsibleContent></Collapsible>)}</section>
  <Card className="fw-cta"><CardContent><div><h2>开始建立自己的长期研究记录。</h2><p>先体验一项公司研究，再选择适合你的持续研究服务。</p></div><div className="fw-cta-actions"><Button onClick={()=>onStart()}>体验一次研究<ArrowRight size={17}/></Button><Button asChild variant="outline"><a href="#fw-plans">查看服务方案<ArrowUpRight size={16}/></a></Button></div></CardContent></Card>
 </section>;
}
