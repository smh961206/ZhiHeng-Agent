import {useRef,useState} from 'react';
import {Link} from 'react-router';
import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronDown,ChevronRight,Clock3,FileText,Globe,Layers,LoaderCircle,Search,ShieldCheck,Sparkles,Target,Activity,ChartNoAxesCombined} from 'lucide-react';
import {Button} from './ui/button';
import {Card,CardHeader,CardContent,CardFooter} from './ui/card';
import {Textarea} from './ui/textarea';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import DataConnect from '../DataConnect';
import ResearchPlan from './ResearchPlan';
import ResearchContext from './ResearchContext';
import {modes as frameworkModes,resolveMode} from '../../shared/research-framework.mjs';

const modeIcons={A:Search,B:BookOpen,C:Activity,D:Layers,E:ChartNoAxesCombined,F:ShieldCheck};
export const researchModes=[['auto','智能路由','按问题匹配研究路径',Sparkles],...Object.entries(frameworkModes).map(([id,item])=>[id,item.name,item.description,modeIcons[id]])];
const examples=[['现金流质量','分析贵州茅台的现金流质量'],['股东回报对比','对比腾讯与苹果的股东回报']];
function Choice({label,value,onChange,options,disabled,help}){
 return <div className="choice-field"><span>{label}</span><Select value={String(value)} onValueChange={onChange} disabled={disabled}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(([v,l])=><SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent></Select>{help&&<small>{help}</small>}</div>;
}
export default function ResearchWorkbench({question,setQuestion,mode,setMode,depth,setDepth,portfolio,setPortfolio,historyYears,setHistoryYears,contextOpen,setContextOpen,resolution,busy,onStart,jobs,jobsLoading,previousResearch,setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext,setPortfolioContext}){
 const questionInput=useRef(null),form=useRef(null),pathPicker=useRef(null),securitiesSection=useRef(null),settingsSection=useRef(null);
 const [pathOpen,setPathOpen]=useState(false);
 const effectiveMode=resolveMode({question,mode});
 const contextProps={previousResearch,setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext,setPortfolioContext};
 const currentMode=researchModes.find(item=>item[0]===mode)||researchModes[0];
 const ModeIcon=currentMode[3];
 const ready=!!question.trim()&&!resolution.blocked,step=!question.trim()?1:resolution.blocked?2:3;
 const completed=jobs.filter(job=>job.status==='completed').length,active=jobs.filter(job=>['queued','running'].includes(job.status)).length;
 const readiness=busy?'正在创建研究，请稍候':!question.trim()?'先写下你想研究的问题':resolution.status==='loading'?'正在识别公司与市场…':resolution.blocked?'请核对标的，解决上方提示后开始':`${resolution.securities.length} 个标的已就绪，可以开始研究`;
 function goToStep(value){const target=value===1?questionInput.current:value===2?securitiesSection.current:settingsSection.current;target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});target?.focus({preventScroll:true});}
 function selectMode(value){setMode(value);if(value==='E'||value==='C')setContextOpen(true);setPathOpen(false);pathPicker.current?.focus({preventScroll:true});}
 return <section className="research-workbench">
  <header className="page-heading workbench-heading"><div><h1>研究工作台</h1><p>从一个好问题开始，让每一次判断都有据可循。</p></div></header>
  <div className="workspace-grid">
   <Card className="workbench-composer gap-0 py-0">
    <CardHeader className="composer-intro"><div><span className="composer-title-icon"><Sparkles size={19}/></span><div><h2>开启一项新研究</h2><p>明确问题，剩下的交给研究流程。</p></div></div><span className="composer-private"><ShieldCheck size={13}/>证据可追溯</span></CardHeader>
    <nav className="composer-steps" aria-label="新建研究步骤">{[[1,'研究问题'],[2,'核对标的'],[3,'研究设置']].map(([value,label])=><Button type="button" variant="ghost" size="sm" key={value} aria-current={step===value?'step':undefined} className={step>value?'step-complete':''} onClick={()=>goToStep(value)}><span>{step>value?<Check size={12}/>:value.toString().padStart(2,'0')}</span>{label}{value<3&&<ChevronRight size={13} className="step-divider"/>}</Button>)}</nav>
    <form ref={form} onSubmit={onStart} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();if(ready&&!busy)form.current?.requestSubmit();}}}>
     <CardContent className="workbench-form-body">
      <div className="question-section"><div className="field-heading"><label className="field-label" htmlFor="question">你想研究什么？</label><span>越具体，研究越聚焦</span></div><div className="question-wrap"><Textarea ref={questionInput} id="question" required maxLength={10000} value={question} onChange={event=>setQuestion(event.target.value)} placeholder="例如：分析贵州茅台的长期投资价值，重点关注现金流质量、竞争优势与股东回报。" className="question-input" aria-describedby="question-guidance"/><div className="question-hint" id="question-guidance"><span><Sparkles size={13}/>自动识别公司名称与股票代码</span><span className="question-count">{question.length.toLocaleString()} / 10,000</span></div></div><div className="suggestions"><span>试着研究</span>{examples.map(([label,text])=><Button type="button" variant="outline" size="sm" key={text} title={text} onClick={()=>{setQuestion(text);resolution.auto();questionInput.current?.focus();}}>{label}<ArrowUpRight size={13}/></Button>)}</div></div>
      <section ref={securitiesSection} tabIndex={-1} className="workbench-securities"><DataConnect resolution={resolution}/></section>
      <section ref={settingsSection} tabIndex={-1} className="workbench-settings" aria-label="研究设置"><div className="field-heading"><h3>研究设置</h3><span>默认设置适合大多数研究</span></div><Collapsible className="path-picker" open={pathOpen} onOpenChange={setPathOpen}><CollapsibleTrigger asChild><Button type="button" variant="ghost" ref={pathPicker} className="path-trigger"><span><span className="path-mode-icon"><ModeIcon size={18}/></span><span className="path-summary-copy"><strong>{currentMode[1]}</strong><small>{currentMode[2]}</small></span></span><span className="path-adjust">切换路径<ChevronDown size={15}/></span></Button></CollapsibleTrigger><CollapsibleContent><div className="workbench-mode-grid">{researchModes.map(([id,title,description,Icon])=><Button type="button" variant={mode===id?'secondary':'outline'} key={id} aria-pressed={mode===id} className="workbench-mode-option" onClick={()=>selectMode(id)}><span className="workbench-mode-icons"><Icon size={17}/>{mode===id&&<Check size={13}/>}</span><strong>{title}</strong><span>{description}</span></Button>)}</div></CollapsibleContent></Collapsible>
       <div className="options-row"><Choice label="报告深度" value={effectiveMode==='A'?'Quick':depth} disabled={effectiveMode==='A'} onChange={setDepth} options={ [['Quick','简明研究'],['Standard','标准研究'],['Deep','深入研究']] } help={{Quick:'聚焦关键判断与主要风险',Standard:'兼顾研究覆盖与阅读效率',Deep:'展开假设、证据与交叉验证'}[effectiveMode==='A'?'Quick':depth]}/><Choice label="财报历史范围" value={effectiveMode==='F'?8:historyYears} onChange={value=>setHistoryYears(Number(value))} disabled={effectiveMode==='F'} options={[[3,'近 3 年'],[5,'近 5 年'],[8,'近 8 年']]} help={effectiveMode==='F'?'股东回报研究固定使用近 8 年':'按所选范围获取可得官方披露'}/></div>
       <ResearchContext mode={effectiveMode} open={contextOpen} onOpenChange={setContextOpen} portfolio={portfolio} setPortfolio={setPortfolio} jobs={jobs} {...contextProps}/>
      </section>
      <ResearchPlan question={question} mode={mode} depth={depth} portfolio={portfolio} historyYears={historyYears} resolution={resolution} {...contextProps}/>
     </CardContent>
     <CardFooter className="composer-footer"><div className={'composer-readiness '+(ready?'is-ready':'')} id="start-readiness" role="status">{busy||resolution.status==='loading'?<LoaderCircle size={16} className="animate-spin"/>:ready?<Check size={16}/>:<span className="readiness-dot"/>}<span>{readiness}<small>开始后可离开页面，稍后在研究记录中查看</small></span></div><Button type="submit" size="lg" className="start-button" disabled={busy||!ready} aria-describedby="start-readiness">{busy?<><LoaderCircle size={17} className="animate-spin"/>创建中…</>:<>开始研究<ArrowRight size={17}/></>}</Button><span className="submit-shortcut">Ctrl / ⌘ + Enter 快捷开始</span></CardFooter>
    </form>
   </Card>
   <aside className="research-guide"><section className="workbench-guide-card"><span className="guide-kicker">每一次研究，都有迹可循</span><div className="guide-symbol" aria-hidden="true"><img src="/brand/zhiheng-symbol.svg" alt="" width="44" height="44"/></div><h2>从证据，<br/>到更清晰的判断。</h2><p>串联公开披露、价值分析与结论复核，沉淀可回看的研究。</p><div className="guide-deliverables">{[[FileText,'研究报告','核心判断、风险与证伪条件'],[ShieldCheck,'审计记录','复核过程与程序校验'],[Globe,'证据来源','原始资料与引用依据']].map(([Icon,title,description])=><div key={title}><Icon size={18}/><span><strong>{title}</strong><small>{description}</small></span><Check size={13}/></div>)}</div><Link to="/framework">了解研究框架<ArrowUpRight size={15}/></Link></section>
    <section className="workspace-overview"><div><h3>你的研究积累</h3><Link to="/history" aria-label="查看全部研究记录"><ArrowUpRight size={17}/></Link></div><div className="workspace-totals"><Link to="/history?status=completed"><strong>{jobsLoading&&!jobs.length?'—':completed.toString().padStart(2,'0')}</strong><span><Check size={12}/>已完成研究</span></Link><Link to="/history?status=active"><strong>{jobsLoading&&!jobs.length?'—':active.toString().padStart(2,'0')}</strong><span><Clock3 size={12}/>进行中</span></Link></div><div className="workspace-markets"><Globe size={14}/><span>A 股</span><i/>港股<i/>美股</div><p>自动获取行情与官方财报；行情可能延迟，资料缺口会在研究中标记。</p></section>
    <p className="workspace-quote"><Target size={17}/><span>价格是起点，<br/>理解公司才是研究的核心。</span></p>
   </aside>
  </div>
 </section>;
}
